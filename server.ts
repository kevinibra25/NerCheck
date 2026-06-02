import express from "express";
import path from "path";
import dns from "dns";
import net from "net";
import http from "http";
import https from "https";
import tls from "tls";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API: Health probe
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "NetCheck Lite API Server", timestamp: new Date() });
});

// API: TCP Reachability Checker (Safe TCP connection-based reachability)
app.post("/api/ping", (req, res) => {
  const { target } = req.body;
  if (!target) {
    return res.status(400).json({ error: "Target is required" });
  }

  // Clean target
  let hostname = target.trim();
  hostname = hostname.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0].split(":")[0];

  let responded = false;
  const sendResponse = (statusCode: number, data: any) => {
    if (responded) return;
    responded = true;
    res.status(statusCode).json(data);
  };

  // Resolve using dns.lookup with { all: true } (the Node.js equivalent of InetAddress.getAllByName())
  dns.lookup(hostname, { all: true }, (dnsErr, addresses) => {
    if (dnsErr || !addresses || addresses.length === 0) {
      return sendResponse(200, {
        target: hostname,
        resolvedIps: [],
        reachable: false,
        connectedPort: null,
        responseTime: null,
        error: `DNS lookup failed for '${hostname}': ${dnsErr ? dnsErr.message : "No IP addresses resolved"}`
      });
    }

    const resolvedIps = Array.from(new Set(addresses.map(addr => addr.address)));
    const targetIp = resolvedIps[0];
    const startTime = Date.now();

    // Try TCP connection to port 443 first
    const tryConnect = (port: number, onSuccess: (port: number) => void, onFailure: (err: Error) => void) => {
      const socket = new net.Socket();
      socket.setTimeout(2500);

      socket.on("connect", () => {
        socket.destroy();
        onSuccess(port);
      });

      socket.on("error", (err) => {
        socket.destroy();
        onFailure(err);
      });

      socket.on("timeout", () => {
        socket.destroy();
        onFailure(new Error("Connection timed out after 2.5s"));
      });

      socket.connect(port, targetIp);
    };

    tryConnect(443,
      (connectedPort) => {
        const responseTime = Date.now() - startTime;
        sendResponse(200, {
          target: hostname,
          resolvedIps,
          resolvedIp: resolvedIps.join(", "),
          reachable: true,
          connectedPort,
          responseTime,
          error: null
        });
      },
      (err443) => {
        // If 443 fails logic, try 80
        tryConnect(80,
          (connectedPort) => {
            const responseTime = Date.now() - startTime;
            sendResponse(200, {
              target: hostname,
              resolvedIps,
              resolvedIp: resolvedIps.join(", "),
              reachable: true,
              connectedPort,
              responseTime,
              error: null
            });
          },
          (err80) => {
            sendResponse(200, {
              target: hostname,
              resolvedIps,
              resolvedIp: resolvedIps.join(", "),
              reachable: false,
              connectedPort: null,
              responseTime: null,
              error: `TCP Reachability failed on both port 443 (${err443.message}) and port 80 (${err80.message})`
            });
          }
        );
      }
    );
  });
});

// API: DNS Lookup
app.post("/api/dns", (req, res) => {
  const { target } = req.body;
  if (!target) {
    return res.status(400).json({ error: "Domain or IP address is required" });
  }

  let hostname = target.trim();
  hostname = hostname.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0].split(":")[0];

  const startTime = Date.now();
  let responded = false;

  const sendResponse = (statusCode: number, data: any) => {
    if (responded) return;
    responded = true;
    res.status(statusCode).json(data);
  };

  let ipv4s: string[] = [];
  let ipv6s: string[] = [];

  dns.resolve4(hostname, (err4, addresses4) => {
    if (!err4 && addresses4) {
      ipv4s = addresses4;
    }
    dns.resolve6(hostname, (err6, addresses6) => {
      if (!err6 && addresses6) {
        ipv6s = addresses6;
      }

      const lookupTime = Date.now() - startTime;

      if (err4 && err6) {
        // Fallback standard lookup
        dns.lookup(hostname, { all: true }, (lookupErr, addresses) => {
          const lookupTimeFallback = Date.now() - startTime;
          if (lookupErr) {
            return sendResponse(200, {
              hostname,
              ipv4s: [],
              ipv6s: [],
              ips: [],
              lookupTime: lookupTimeFallback,
              error: `DNS lookup failed for ${hostname}: ${lookupErr.message}`
            });
          }

          const resolvedIpv4 = addresses.filter(addr => addr.family === 4).map(addr => addr.address);
          const resolvedIpv6 = addresses.filter(addr => addr.family === 6).map(addr => addr.address);

          sendResponse(200, {
            hostname,
            ipv4s: Array.from(new Set(resolvedIpv4)),
            ipv6s: Array.from(new Set(resolvedIpv6)),
            ips: Array.from(new Set(addresses.map(a => a.address))),
            lookupTime: lookupTimeFallback,
            error: null
          });
        });
        return;
      }

      sendResponse(200, {
        hostname,
        ipv4s: Array.from(new Set(ipv4s)),
        ipv6s: Array.from(new Set(ipv6s)),
        ips: Array.from(new Set([...ipv4s, ...ipv6s])),
        lookupTime,
        error: null
      });
    });
  });
});

// API: HTTP Header Checker
app.post("/api/headers", (req, res) => {
  let { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  url = url.trim();
  const originalUrl = url;
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  let responded = false;
  const sendResponse = (statusCode: number, data: any) => {
    if (responded) return;
    responded = true;
    res.status(statusCode).json(data);
  };

  const processResponseHeaders = (originalUrlStr: string, finalUrlStr: string, statusCode: number | undefined, resHeaders: http.IncomingHttpHeaders, redirectCount: number) => {
    const securityAnalysis = [
      {
        name: "Strict-Transport-Security (HSTS)",
        found: !!resHeaders["strict-transport-security"],
        value: (Array.isArray(resHeaders["strict-transport-security"]) 
          ? resHeaders["strict-transport-security"].join("; ") 
          : resHeaders["strict-transport-security"]) || "Missing",
        explanation: "Informs browsers that the site should only be accessed using HTTPS. Prevents downgrading to unencrypted HTTP."
      },
      {
        name: "Content-Security-Policy (CSP)",
        found: !!resHeaders["content-security-policy"],
        value: (Array.isArray(resHeaders["content-security-policy"])
          ? resHeaders["content-security-policy"].join("; ")
          : resHeaders["content-security-policy"]) || "Missing",
        explanation: "Injects a security policy restricting resource loading. Crucial for fighting Cross-Site Scripting (XSS) attacks."
      },
      {
        name: "X-Frame-Options",
        found: !!resHeaders["x-frame-options"],
        value: (Array.isArray(resHeaders["x-frame-options"])
          ? resHeaders["x-frame-options"].join("; ")
          : resHeaders["x-frame-options"]) || "Missing",
        explanation: "Protects against clickjacking by preventing the page from appearing inside iframes on untrusted websites."
      },
      {
        name: "X-Content-Type-Options",
        found: !!resHeaders["x-content-type-options"],
        value: (Array.isArray(resHeaders["x-content-type-options"])
          ? resHeaders["x-content-type-options"].join("; ")
          : resHeaders["x-content-type-options"]) || "Missing",
        explanation: "Instructs browsers to strictly respect the content-type header. Stops MIME-sniffing and cross-site script triggers."
      },
      {
        name: "Referrer-Policy",
        found: !!resHeaders["referrer-policy"],
        value: (Array.isArray(resHeaders["referrer-policy"])
          ? resHeaders["referrer-policy"].join("; ")
          : resHeaders["referrer-policy"]) || "Missing",
        explanation: "Determines what referrer details map when navigation happens or assets map outside the origin domain."
      }
    ];

    sendResponse(200, {
      originalUrl: originalUrlStr,
      finalUrl: finalUrlStr,
      statusCode: statusCode || 200,
      headers: resHeaders,
      server: resHeaders["server"] || "Undetected/Hidden",
      contentType: resHeaders["content-type"] || "Unknown",
      securityAnalysis,
      redirectCount,
      error: null
    });
  };

  const tryRequest = (currentUrl: string, method: "HEAD" | "GET", redirectCount: number = 0, visitedUrls: Set<string> = new Set()) => {
    try {
      visitedUrls.add(currentUrl);
      const parsedUrl = new URL(currentUrl);
      const client = parsedUrl.protocol === "https:" ? https : http;

      const requestOptions = {
        method,
        headers: {
          "User-Agent": "NetCheckLite/1.0.0 (Android Network Diagnostics Tool)",
          "Accept": "*/*"
        },
        timeout: 5000,
        rejectUnauthorized: true
      };

      const request = client.request(currentUrl, requestOptions, (response) => {
        const { statusCode, headers } = response;
        response.resume(); // free connection memory

        if (statusCode && [301, 302, 303, 307, 308].includes(statusCode)) {
          const location = headers["location"];
          if (location && redirectCount < 5) {
            let nextUrl = location;
            try {
              nextUrl = new URL(location, currentUrl).toString();
            } catch (e) {
              // ignore
            }
            if (visitedUrls.has(nextUrl)) {
              return sendResponse(200, {
                originalUrl,
                finalUrl: currentUrl,
                statusCode,
                headers,
                server: headers["server"] || "Undetected/Hidden",
                contentType: headers["content-type"] || "Unknown",
                securityAnalysis: [],
                redirectCount,
                error: "Infinite redirect loop detected."
              });
            }
            return tryRequest(nextUrl, method, redirectCount + 1, visitedUrls);
          } else if (redirectCount >= 5) {
            return sendResponse(200, {
              originalUrl,
              finalUrl: currentUrl,
              statusCode,
              headers,
              server: headers["server"] || "Undetected/Hidden",
              contentType: headers["content-type"] || "Unknown",
              securityAnalysis: [],
              redirectCount,
              error: "Too many redirects (max 5)."
            });
          }
        }

        processResponseHeaders(originalUrl, currentUrl, statusCode, headers, redirectCount);
      });

      request.on("error", (err: any) => {
        let errorMsg = `Connection error (${method}): ${err.message}`;
        if (err.code === "CERT_HAS_EXPIRED" || err.message.includes("expired")) {
          errorMsg = "SSL Certificate Error: The remote SSL certificate has expired.";
        } else if (err.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" || err.message.includes("self-signed") || err.message.includes("unable to verify")) {
          errorMsg = "SSL Certificate Validation Error: Self-signed certificate or unable to verify build chains.";
        } else if (err.code === "ENOTFOUND") {
          errorMsg = `DNS lookup failed: Host ${parsedUrl.hostname} is not found.`;
        }

        if (method === "HEAD") {
          tryRequest(url, "GET", 0, new Set()); // Fallback
        } else {
          sendResponse(200, {
            originalUrl,
            finalUrl: currentUrl,
            statusCode: null,
            headers: {},
            server: null,
            contentType: null,
            securityAnalysis: [],
            redirectCount,
            error: errorMsg
          });
        }
      });

      request.on("timeout", () => {
        request.destroy();
        if (method === "HEAD") {
          tryRequest(url, "GET", 0, new Set()); // Fallback
        } else {
          sendResponse(200, {
            originalUrl,
            finalUrl: currentUrl,
            statusCode: null,
            headers: {},
            server: null,
            contentType: null,
            securityAnalysis: [],
            redirectCount,
            error: "HTTP Connection timeout: The target took more than 5 seconds to reply."
          });
        }
      });

      request.end();
    } catch (err: any) {
      sendResponse(200, {
        originalUrl,
        finalUrl: currentUrl,
        statusCode: null,
        headers: {},
        server: null,
        contentType: null,
        securityAnalysis: [],
        redirectCount,
        error: `Malformed URL: ${err.message}`
      });
    }
  };

  tryRequest(url, "HEAD");
});

// API: SSL/TLS Certificate Info
app.post("/api/ssl-cert", (req, res) => {
  const { domain } = req.body;
  if (!domain) {
    return res.status(400).json({ error: "Domain is required" });
  }

  let hostname = domain.trim();
  hostname = hostname.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0].split(":")[0];

  let responded = false;
  const sendResponse = (statusCode: number, data: any) => {
    if (responded) return;
    responded = true;
    res.status(statusCode).json(data);
  };

  try {
    const socketOptions = {
      servername: hostname,
      rejectUnauthorized: true // Secure compliance - do not bypass SSL validation
    };

    const socket = tls.connect(443, hostname, socketOptions, () => {
      const cert = socket.getPeerCertificate(true);
      socket.destroy();

      if (!cert || Object.keys(cert).length === 0) {
        return sendResponse(200, {
          domain: hostname,
          error: "No SSL certificate could be fetched from server on port 443."
        });
      }

      const validFrom = new Date(cert.valid_from);
      const validTo = new Date(cert.valid_to);
      const now = new Date();

      const timeDiff = validTo.getTime() - now.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
      const isExpired = daysRemaining <= 0;
      const isNearExpiry = daysRemaining > 0 && daysRemaining <= 30;

      // Clean presentation values
      const cn = cert.subject?.CN || "Unknown Name";
      const org = cert.subject?.O || "No organization declared";
      const subject = `${cn} (${org})`;

      const issuerCn = cert.issuer?.CN || "Unknown Issuer";
      const issuerOrg = cert.issuer?.O || "No issuer organization";
      const issuer = `${issuerCn} (${issuerOrg})`;

      sendResponse(200, {
        domain: hostname,
        subject,
        issuer,
        validFrom: validFrom.toISOString(),
        validTo: validTo.toISOString(),
        daysRemaining: isExpired ? 0 : daysRemaining,
        isExpired,
        warning: isExpired ? "expired" : (isNearExpiry ? "nearexpiry" : null),
        error: null
      });
    });

    socket.on("error", (err: any) => {
      socket.destroy();
      let detailMsg = `TLS/SSL handshake verification failed: ${err.message}`;
      if (err.code === "CERT_HAS_EXPIRED") {
        detailMsg = `SSL Verification Error: Certificate has EXPIRED. Connection is unsecure.`;
      } else if (err.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" || err.message.includes("self-signed")) {
        detailMsg = `SSL Verification Error: Self-signed certificate or untrusted certificate chain detected. Connection aborted.`;
      } else if (err.code === "ENOTFOUND") {
        detailMsg = `DNS Hostname resolution error: Domain not found.`;
      }
      sendResponse(200, {
        domain: hostname,
        error: detailMsg
      });
    });

    socket.setTimeout(5000);
    socket.on("timeout", () => {
      socket.destroy();
      sendResponse(200, {
        domain: hostname,
        error: `TLS connection negotiation timed out after 5s`
      });
    });

  } catch (err: any) {
    sendResponse(200, {
      domain: hostname,
      error: `Invalid domain formatting: ${err.message}`
    });
  }
});

// Vite & Static Asset Handling
async function initializeServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[NetCheck Server] Running on http://localhost:${PORT}`);
  });
}

initializeServer();
