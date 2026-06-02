import React, { useState, useEffect } from "react";
import {
  Smartphone,
  Activity,
  Globe,
  Database,
  Info,
  ShieldCheck,
  ShieldAlert,
  Search,
  Copy,
  Check,
  HelpCircle,
  ExternalLink,
  Trash2,
  FolderOpen,
  FileCode,
  Share2,
  Moon,
  Sun,
  Play,
  Terminal,
  ChevronRight,
  Cpu
} from "lucide-react";
import { ANDROID_FILES, CodeFile } from "./codefiles";

// Simulated diagnostic logs interface
interface LocalLog {
  id: string;
  toolType: string;
  target: string;
  summary: string;
  timestamp: string;
}

export default function App() {
  // Mobile Frame Theme Toggle
  const [phoneDark, setPhoneDark] = useState<boolean>(true);
  
  // Simulated device system time
  const [deviceTime, setDeviceTime] = useState<string>("12:00 PM");

  // Navigation tab state for the simulated Android App
  // 0: Home, 1: Tools, 2: History, 3: About
  const [activeScreen, setActiveScreen] = useState<number>(0);
  
  // Specific tool selected inside the Tools view
  // 0: TCP Reachability, 1: DNS Lookup, 2: HTTP Headers, 3: SSL Cert
  const [activeToolTab, setActiveToolTab] = useState<number>(0);

  // States for live API results
  const [pingTarget, setPingTarget] = useState<string>("google.com");
  const [pingRunning, setPingRunning] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<any>(null);

  const [dnsTarget, setDnsTarget] = useState<string>("example.com");
  const [dnsRunning, setDnsRunning] = useState<boolean>(false);
  const [dnsResult, setDnsResult] = useState<any>(null);

  const [httpUrl, setHttpUrl] = useState<string>("https://example.com");
  const [httpRunning, setHttpRunning] = useState<boolean>(false);
  const [httpResult, setHttpResult] = useState<any>(null);

  const [sslDomain, setSslDomain] = useState<string>("google.com");
  const [sslRunning, setSslRunning] = useState<boolean>(false);
  const [sslResult, setSslResult] = useState<any>(null);

  // Persistence (History logs)
  const [historyLogs, setHistoryLogs] = useState<LocalLog[]>([]);

  // Right Panel: Source Code Explorer
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(2); // Default to MainActivity.kt
  const [copiedFileIndex, setCopiedFileIndex] = useState<number | null>(null);

  // General clipboard helper for user-facing outputs
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Clock tick on the client
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let hour = now.getHours();
      const ampm = hour >= 12 ? "PM" : "AM";
      hour = hour % 12;
      hour = hour ? hour : 12; // hour looks up 0 as 12
      const min = String(now.getMinutes()).padStart(2, "0");
      setDeviceTime(`${hour}:${min} ${ampm}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 15000);
    return () => clearInterval(timer);
  }, []);

  // Hydrate local storage for simulation history
  useEffect(() => {
    const loaded = localStorage.getItem("netcheck_lite_history");
    if (loaded) {
      try {
        setHistoryLogs(JSON.parse(loaded));
      } catch (e) {
        setHistoryLogs([]);
      }
    } else {
      // Default placeholder log histories for lookups
      const defaults: LocalLog[] = [
        {
          id: "log1",
          toolType: "TCP Reachability",
          target: "google.com",
          summary: "Reachable, IP: 8.8.8.8 (24ms)",
          timestamp: new Date(Date.now() - 3600000).toLocaleString()
        },
        {
          id: "log2",
          toolType: "SSL Certificate",
          target: "example.com",
          summary: "Issuer: DigiCert, Expires in: 284 days",
          timestamp: new Date(Date.now() - 7200000).toLocaleString()
        }
      ];
      setHistoryLogs(defaults);
      localStorage.setItem("netcheck_lite_history", JSON.stringify(defaults));
    }
  }, []);

  const saveToLogs = (toolType: string, target: string, summary: string) => {
    const newLog: LocalLog = {
      id: "log_" + Date.now(),
      toolType,
      target,
      summary,
      timestamp: new Date().toLocaleString()
    };
    const updated = [newLog, ...historyLogs];
    setHistoryLogs(updated);
    localStorage.setItem("netcheck_lite_history", JSON.stringify(updated));
  };

  const clearLogs = () => {
    setHistoryLogs([]);
    localStorage.setItem("netcheck_lite_history", "[]");
  };

  // -------------------------------------------------------------
  // Real live tool invokers triggering the server
  // -------------------------------------------------------------
  const executePing = async () => {
    if (!pingTarget.trim()) return;
    setPingRunning(true);
    setPingResult(null);
    try {
      const response = await fetch("/api/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: pingTarget })
      });
      const data = await response.json();
      setPingResult(data);
      if (data.reachable) {
        saveToLogs("TCP Reachability", pingTarget, `Reachable, IP: ${data.resolvedIp} (${data.responseTime}ms)`);
      } else {
        saveToLogs("TCP Reachability", pingTarget, `Unreachable: ${data.error || "No response"}`);
      }
    } catch (e: any) {
      setPingResult({ error: e.message || "Failed client request trigger" });
    } finally {
      setPingRunning(false);
    }
  };

  const executeDns = async () => {
    if (!dnsTarget.trim()) return;
    setDnsRunning(true);
    setDnsResult(null);
    try {
      const response = await fetch("/api/dns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: dnsTarget })
      });
      const data = await response.json();
      setDnsResult(data);
      if (data.ips && data.ips.length > 0) {
        saveToLogs("DNS Lookup", dnsTarget, `Resolved ${data.ips.length} IPs in ${data.lookupTime}ms`);
      } else {
        saveToLogs("DNS Lookup", dnsTarget, `DNS query failure`);
      }
    } catch (e: any) {
      setDnsResult({ error: e.message || "Failed client request trigger" });
    } finally {
      setDnsRunning(false);
    }
  };

  const executeHttpHeaders = async () => {
    if (!httpUrl.trim()) return;
    setHttpRunning(true);
    setHttpResult(null);
    try {
      const response = await fetch("/api/headers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: httpUrl })
      });
      const data = await response.json();
      setHttpResult(data);
      if (data.statusCode) {
        saveToLogs("HTTP Headers", httpUrl, `Status: ${data.statusCode} (${data.server})`);
      } else {
        saveToLogs("HTTP Headers", httpUrl, `Connection checkup failed`);
      }
    } catch (e: any) {
      setHttpResult({ error: e.message || "Failed connection handshake" });
    } finally {
      setHttpRunning(false);
    }
  };

  const executeSslCert = async () => {
    if (!sslDomain.trim()) return;
    setSslRunning(true);
    setSslResult(null);
    try {
      const response = await fetch("/api/ssl-cert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: sslDomain })
      });
      const data = await response.json();
      setSslResult(data);
      if (data.subject) {
        saveToLogs("SSL Certificate", sslDomain, `Expires in: ${data.daysRemaining} days (Issuer: ${data.issuer})`);
      } else {
        saveToLogs("SSL Certificate", sslDomain, "Failed negotiation");
      }
    } catch (e: any) {
      setSslResult({ error: e.message || "TLS check aborted" });
    } finally {
      setSslRunning(false);
    }
  };

  // Clipboard copy handlers
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(label);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const handleCopyCodeFile = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedFileIndex(index);
    setTimeout(() => setCopiedFileIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-900 border-t-4 border-cyan-500">
      
      {/* App Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 py-4 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-cyan-600 to-indigo-600 p-2.5 rounded-xl shadow-lg ring-1 ring-cyan-400">
            <Smartphone className="h-6 w-6 text-cyan-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold tracking-tight text-white">NetCheck Lite</h1>
              <span className="text-xs bg-cyan-900/50 text-cyan-200 px-2 py-0.5 rounded border border-cyan-800 font-mono">v1.0.0</span>
            </div>
            <span className="text-xs text-slate-400 font-medium">Native Android Jetpack Compose Simulation Sandbox</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right text-xs hidden lg:block mr-2 border-r border-slate-800 pr-4">
            <p className="text-slate-500">Developer Profile</p>
            <p className="text-slate-200 font-semibold">Kevin Ibrahimovic</p>
          </div>

          <a 
            href="#code-explorer"
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-4 py-2.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
          >
            <FileCode className="h-4 w-4" />
            Browse Kotlin Source
          </a>
          
          <button 
            onClick={() => setPhoneDark(!phoneDark)}
            className="text-xs bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-300 font-semibold px-4 py-2.5 rounded-lg border border-cyan-800/60 transition flex items-center gap-2 shadow-sm"
          >
            {phoneDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-cyan-400" />}
            Toggle Device Theme ({phoneDark ? "Dark" : "Light"})
          </button>
        </div>
      </header>

      {/* Main Split Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* LEFT PANEL - Live Android Emulator */}
        <section className="flex flex-col items-center justify-center">
          
          <div className="mb-3 text-center">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-cyan-400 font-display">Interactive Device Mock</h2>
            <p className="text-xs text-slate-400 mt-0.5">Test real diagnostics directly inside this simulated Android frame!</p>
          </div>

          {/* Android Smartphone Frame (Pixel 8 Mock) */}
          <div className="relative w-full max-w-[390px] aspect-[9/18.8] bg-slate-900 rounded-[48px] p-4 shadow-2xl ring-12 ring-slate-800 border border-slate-700/60 flex flex-col overflow-hidden">
            
            {/* Camera Punchhole and Speaker Slit */}
            <div className="absolute top-0 left-0 right-0 h-8 flex items-center justify-center z-50 pointer-events-none">
              <div className="w-16 h-4 bg-black rounded-lg flex items-center justify-center relative">
                {/* Speaker slit */}
                <div className="absolute top-1 w-8 h-[2px] bg-neutral-800 rounded"></div>
                {/* Camera circle */}
                <div className="absolute left-10 top-[2px] w-[10px].5 h-[10px].5 bg-neutral-900 rounded-full border border-neutral-800"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-neutral-900 ml-4"></div>
              </div>
            </div>

            {/* Simulated Phone Screen Contents */}
            <div 
              id="android-frame-screen"
              className={`w-full h-full rounded-[34px] overflow-hidden flex flex-col relative transition-colors duration-300 ${
                phoneDark ? "bg-[#121824] text-slate-200" : "bg-[#f8fafc] text-slate-850"
              }`}
            >
              
              {/* Device Status Bar */}
              <div className={`pt-8 pb-2 px-6 flex items-center justify-between text-xs font-semibold select-none z-10 shrink-0 ${
                phoneDark ? "text-slate-400" : "text-slate-500"
              }`}>
                <span>{deviceTime}</span>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span>5G</span>
                  {/* Custom SVG Net Strength */}
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 3c-1.2 0-2.4.2-3.6.7L18.7 14c.5-1.2.7-2.4.7-3.6 0-4.4-3.6-8-8-8zm-5.4 6c-.5 1.2-.7 2.4-.7 3.6 0 4.4 3.6 8 8 8 1.2 0 2.4-.2 3.6-.7L6.6 9z" opacity="0.3" />
                    <path d="M17 17L5 5v12h12z" />
                  </svg>
                  {/* Wifi Icon */}
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 21l-12-14.3c1.7-1.4 6-4.7 12-4.7s10.3 3.3 12 4.7l-12 14.3z" />
                  </svg>
                  {/* Battery percentage */}
                  <span className="font-mono">100%</span>
                  <div className="w-5 h-2.5 bg-current opacity-80 rounded-[2px] relative flex items-center p-[1px]">
                    <div className="h-full w-full bg-emerald-500 rounded-[1px]"></div>
                    <div className="absolute -right-1 w-0.5 h-1.5 bg-current rounded-r-[1px]"></div>
                  </div>
                </div>
              </div>

              {/* Simulated Screen Inner Layout (Saves scroll area) */}
              <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2 scroll-smooth code-scrollbar flex flex-col">
                
                {/* ----------------------------------------------------------- */}
                {/* SCREEN 0: HOME */}
                {/* ----------------------------------------------------------- */}
                {activeScreen === 0 && (
                  <div className="flex-1 flex flex-col animate-fadeIn">
                    <div className="text-center my-6">
                      <h3 className={`text-2xl font-bold tracking-tight font-display ${phoneDark ? 'text-white' : 'text-slate-900'}`}>
                        NetCheck Lite
                      </h3>
                      <p className={`text-xs mt-1 ${phoneDark ? 'text-cyan-400' : 'text-cyan-600'} font-semibold uppercase tracking-wide`}>
                        Legal Network Diagnostic Toolkit
                      </p>
                    </div>

                    {/* Legal reminder card in Material 3 style */}
                    <div className={`p-4 rounded-2xl mb-6 border ${
                      phoneDark 
                        ? 'bg-rose-950/20 border-rose-900/60 text-rose-200' 
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}>
                      <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Legal Compliance Scope
                      </h4>
                      <p className="text-[11px] leading-relaxed mt-1.5 opacity-90">
                        “Only test networks, domains, and systems you own or have permission to check. NetCheck Lite forbids hacking, exploit testing, or unauthorized scanning.”
                      </p>
                    </div>

                    {/* Quick Access Grid Title */}
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${phoneDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Select Action Utilities
                    </h4>

                    {/* Action Cards Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      {[
                        { title: "TCP Reachability", desc: "Check port 443/80 delays", subId: 0 },
                        { title: "DNS Lookup", desc: "A/AAAA resolved addresses", subId: 1 },
                        { title: "HTTP Headers", desc: "Inspect security parameters", subId: 2 },
                        { title: "SSL Certificate", desc: "Analyze HTTPS server seals", subId: 3 }
                      ].map((item, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setActiveToolTab(item.subId);
                            setActiveScreen(1); // Jump to Tools view
                          }}
                          className={`text-left p-3.5 rounded-2xl border transition hover:scale-[1.02] ${
                            phoneDark
                              ? "bg-slate-800/80 border-slate-700/60 text-slate-100 hover:bg-slate-800"
                              : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50 shadow-sm"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                            phoneDark ? "bg-cyan-950 text-cyan-300" : "bg-cyan-100 text-cyan-700"
                          }`}>
                            {index === 0 && <Activity className="h-4 w-4" />}
                            {index === 1 && <Globe className="h-4 w-4" />}
                            {index === 2 && <ShieldCheck className="h-4 w-4" />}
                            {index === 3 && <HelpCircle className="h-4 w-4" />}
                          </div>
                          <h5 className="text-[12px] font-bold tracking-tight">{item.title}</h5>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{item.desc}</p>
                        </button>
                      ))}
                    </div>

                    {/* Quick educational hint card */}
                    <div className={`p-4 rounded-2xl mt-auto border ${
                      phoneDark ? 'bg-slate-800/40 border-slate-800/80 text-slate-400' : 'bg-slate-100/80 border-slate-250 text-slate-500'
                    }`}>
                      <p className="text-[11px] leading-relaxed text-center">
                        <strong className={phoneDark ? 'text-slate-300' : 'text-slate-700'}>Educational:</strong> Missing security headers like HSTS or CSP expose web servers to simple framing triggers and clickjacking. Always audits your assets.
                      </p>
                    </div>
                  </div>
                )}

                {/* ----------------------------------------------------------- */}
                {/* SCREEN 1: TOOLS */}
                {/* ----------------------------------------------------------- */}
                {activeScreen === 1 && (
                  <div className="flex-1 flex flex-col animate-fadeIn">
                    
                    {/* Material 3 Styled Sub-Navigation Tabs */}
                    <div className="flex border-b border-cyan-800/30 mb-4 pb-1 overflow-x-auto text-xs shrink-0 code-scrollbar select-none gap-2">
                      {["TCP Reachability", "DNS Lookup", "HTTP Headers", "SSL Cert"].map((tool, index) => (
                        <button
                          key={index}
                          onClick={() => setActiveToolTab(index)}
                          className={`font-semibold shrink-0 py-1.5 px-3 rounded-full transition ${
                            activeToolTab === index
                              ? "bg-cyan-600 text-white"
                              : phoneDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {tool}
                        </button>
                      ))}
                    </div>

                    {/* subview 0: TCP Reachability */}
                    {activeToolTab === 0 && (
                      <div className="flex-0 space-y-4">
                        <div>
                          <h4 className={`text-base font-bold ${phoneDark ? 'text-white' : 'text-slate-950'}`}>TCP Reachability</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">Checks whether a host is reachable over TCP.</p>
                        </div>

                        {/* Presets */}
                        <div className="flex gap-2.5">
                          {["google.com", "example.com", "1.1.1.1"].map(pill => (
                            <button
                              key={pill}
                              onClick={() => setPingTarget(pill)}
                              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                                phoneDark 
                                  ? 'bg-slate-800 border-slate-700/60 text-slate-300' 
                                  : 'bg-slate-100 border-slate-300 text-slate-600'
                              }`}
                            >
                              {pill}
                            </button>
                          ))}
                        </div>

                        {/* Input & Go button */}
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Target Host</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={pingTarget}
                              onChange={(e) => setPingTarget(e.target.value)}
                              placeholder="e.g. google.com"
                              className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono font-medium outline-none border transition ${
                                phoneDark 
                                  ? 'bg-slate-900 border-slate-850 focus:border-cyan-500 text-white' 
                                  : 'bg-white border-slate-300 focus:border-cyan-600 text-slate-900'
                              }`}
                            />
                            <button
                              onClick={executePing}
                              disabled={pingRunning}
                              className="bg-cyan-600 hover:bg-cyan-500 text-white size-10 rounded-xl flex items-center justify-center transition disabled:opacity-50"
                            >
                              {pingRunning ? (
                                <span className="animate-spin text-white">⚙️</span>
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Diagnostic result logs */}
                        {pingResult && (
                          <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2 ${
                            phoneDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex justify-between items-center pb-2 border-b border-cyan-800/20">
                              <span className="font-bold uppercase tracking-wider text-cyan-400 text-[10px]">TCP Reachability Results</span>
                              <button
                                onClick={() => handleCopyText(`Target: ${pingResult.target}\nReachable: ${pingResult.reachable}\nConnected Port: ${pingResult.connectedPort}\nResolved IPs: ${pingResult.resolvedIps?.join(", ")}\nResponse Time: ${pingResult.responseTime}ms\nError: ${pingResult.error}`, "ping")}
                                className="text-slate-400 hover:text-slate-200 p-1"
                              >
                                {copyStatus === "ping" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>

                            <p><strong className="text-slate-400">Hostname:</strong> <code className="font-mono">{pingResult.target}</code></p>
                            
                            {pingResult.resolvedIps && pingResult.resolvedIps.length > 0 && (
                              <p><strong className="text-slate-400">Resolved IP Addresses:</strong> <code className="font-mono text-cyan-400">{pingResult.resolvedIps.join(", ")}</code></p>
                            )}

                            {pingResult.connectedPort && (
                              <p><strong className="text-slate-400">Connected Port:</strong> <code className="font-mono text-amber-400">{pingResult.connectedPort}</code></p>
                            )}

                            <div>
                              <strong className="text-slate-400">Connection:</strong>&nbsp;
                              <span className={`font-bold uppercase tracking-wide px-2 py-0.5 rounded text-[10px] ${
                                pingResult.reachable 
                                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40' 
                                  : 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
                              }`}>
                                {pingResult.reachable ? "Reachable" : "Unreachable"}
                              </span>
                            </div>

                            {pingResult.responseTime && (
                              <p><strong className="text-slate-400">Response Handshake Delay:</strong> <span className="font-mono text-amber-400 font-bold">{pingResult.responseTime} ms</span></p>
                            )}

                            {pingResult.error && (
                              <p className="text-rose-400 mt-2 p-1.5 bg-rose-950/20 rounded border border-rose-900/40 text-[11px] font-mono leading-tight">{pingResult.error}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* subview 1: DNS Lookup */}
                    {activeToolTab === 1 && (
                      <div className="flex-0 space-y-4">
                        <div>
                          <h4 className={`text-base font-bold ${phoneDark ? 'text-white' : 'text-slate-950'}`}>DNS A/AAAA Resolver</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">Loads DNS records asynchronously using background providers.</p>
                        </div>

                        {/* Presets */}
                        <div className="flex gap-2.5">
                          {["example.com", "google.com", "github.com"].map(pill => (
                            <button
                              key={pill}
                              onClick={() => setDnsTarget(pill)}
                              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                                phoneDark 
                                  ? 'bg-slate-800 border-slate-700/60 text-slate-300' 
                                  : 'bg-slate-100 border-slate-300 text-slate-600'
                              }`}
                            >
                              {pill}
                            </button>
                          ))}
                        </div>

                        {/* Input entry */}
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Target Hostname</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={dnsTarget}
                              onChange={(e) => setDnsTarget(e.target.value)}
                              placeholder="e.g. example.com"
                              className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono font-medium outline-none border transition ${
                                phoneDark 
                                  ? 'bg-slate-900 border-slate-850 focus:border-cyan-500 text-white' 
                                  : 'bg-white border-slate-300 focus:border-cyan-600 text-slate-900'
                              }`}
                            />
                            <button
                              onClick={executeDns}
                              disabled={dnsRunning}
                              className="bg-cyan-600 hover:bg-cyan-500 text-white size-10 rounded-xl flex items-center justify-center transition disabled:opacity-50"
                            >
                              {dnsRunning ? (
                                <span className="animate-spin text-white">⚙️</span>
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* DNS Logs Result */}
                        {dnsResult && (
                          <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2 ${
                            phoneDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex justify-between items-center pb-2 border-b border-cyan-800/20">
                              <span className="font-bold uppercase tracking-wider text-cyan-400 text-[10px]">A/AAAA Records info</span>
                              <button
                                onClick={() => handleCopyText(`Hostname: ${dnsResult.hostname}\nIPs: ${dnsResult.ips?.join(", ")}\nLookup Time: ${dnsResult.lookupTime}ms\nError: ${dnsResult.error}`, "dns")}
                                className="text-slate-400 hover:text-slate-200 p-1"
                              >
                                {copyStatus === "dns" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>

                            <p><strong className="text-slate-400">DNS Target:</strong> <code className="font-mono">{dnsResult.hostname}</code></p>
                            
                            {dnsResult.lookupTime != null && (
                              <p><strong className="text-slate-400">Resolution delay:</strong> <span className="font-mono text-amber-400">{dnsResult.lookupTime} ms</span></p>
                            )}

                            <div>
                              <strong className="text-slate-400 font-bold block mb-1">Mapped IP Entries:</strong>
                              {dnsResult.ips && dnsResult.ips.length > 0 ? (
                                <div className="space-y-1.5 pl-2.5">
                                  {dnsResult.ips.map((ip: string, idx: number) => (
                                    <div key={idx} className="font-mono bg-cyan-950/20 border border-cyan-900/30 text-cyan-300 px-2.5 py-1 rounded text-[11px] select-all">
                                      {ip}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-500 block italic pl-2.5">No registries resolved.</span>
                              )}
                            </div>

                            {dnsResult.error && (
                              <p className="text-rose-400 mt-2 p-1.5 bg-rose-950/20 rounded border border-rose-900/40 font-mono text-[11px]">{dnsResult.error}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* subview 2: HTTP Headers */}
                    {activeToolTab === 2 && (
                      <div className="flex-0 space-y-4">
                        <div>
                          <h4 className={`text-base font-bold ${phoneDark ? 'text-white' : 'text-slate-950'}`}>HTTP Headers Inspector</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">Analyses secure network header parameters and highlights vulnerabilities.</p>
                        </div>

                        {/* Presets */}
                        <div className="flex gap-2.5">
                          {["google.com", "example.com"].map(pill => (
                            <button
                              key={pill}
                              onClick={() => setHttpUrl(pill)}
                              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                                phoneDark 
                                  ? 'bg-slate-800 border-slate-700/60 text-slate-300' 
                                  : 'bg-slate-100 border-slate-300 text-slate-600'
                              }`}
                            >
                              {pill}
                            </button>
                          ))}
                        </div>

                        {/* Form URL Input */}
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Target URL</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={httpUrl}
                              onChange={(e) => setHttpUrl(e.target.value)}
                              placeholder="e.g. example.com"
                              className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono font-medium outline-none border transition ${
                                phoneDark 
                                  ? 'bg-slate-900 border-slate-850 focus:border-cyan-500 text-white' 
                                  : 'bg-white border-slate-300 focus:border-cyan-600 text-slate-900'
                              }`}
                            />
                            <button
                              onClick={executeHttpHeaders}
                              disabled={httpRunning}
                              className="bg-cyan-600 hover:bg-cyan-500 text-white size-10 rounded-xl flex items-center justify-center transition disabled:opacity-50"
                            >
                              {httpRunning ? (
                                <span className="animate-spin text-white">⚙️</span>
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Result Panel */}
                        {httpResult && (
                          <div className={`p-3.5 rounded-2xl border text-xs space-y-3 ${
                            phoneDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex justify-between items-center pb-2 border-b border-cyan-800/20">
                              <span className="font-bold uppercase tracking-wider text-cyan-400 text-[10px]">Diagnostics Summary</span>
                              <button
                                onClick={() => handleCopyText(`URL: ${httpResult.finalUrl}\nStatus: ${httpResult.statusCode}\nServer: ${httpResult.server}`, "headers")}
                                className="text-slate-400 hover:text-slate-200 p-1"
                              >
                                {copyStatus === "headers" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>

                            <p className="truncate"><strong className="text-slate-400">Original URL:</strong> <code className="font-mono text-cyan-600">{httpResult.originalUrl || httpResult.url}</code></p>
                            <p className="truncate"><strong className="text-slate-400">Final URL:</strong> <code className="font-mono text-cyan-500">{httpResult.finalUrl}</code></p>
                            
                            {httpResult.statusCode && (
                              <p className="flex items-center gap-1.5">
                                <strong className="text-slate-400">Status Code:</strong>&nbsp;
                                <span className={`font-mono px-2 py-0.5 rounded font-black text-xs ${
                                  httpResult.statusCode >= 200 && httpResult.statusCode < 300 
                                    ? 'bg-emerald-950/40 text-emerald-300' 
                                    : 'bg-amber-950/40 text-amber-300'
                                  }`}>
                                  {httpResult.statusCode}
                                </span>
                              </p>
                            )}

                            <p><strong className="text-slate-400">Redirected:</strong> <span className="font-mono text-slate-300">{httpResult.redirectCount !== undefined ? httpResult.redirectCount : 0} / 5</span></p>

                            {httpResult.server && (
                              <p><strong className="text-slate-400">Server Signature:</strong> <span className="font-mono text-slate-300">{httpResult.server}</span></p>
                            )}

                            {httpResult.securityAnalysis && (
                              <div className="space-y-2 mt-3 pt-3 border-t border-cyan-800/10">
                                {(() => {
                                  const score = httpResult.securityAnalysis.filter((check: any) => check.found).length;
                                  let riskLevel = "GOOD";
                                  let riskColor = "text-emerald-400 bg-emerald-950/30 border-emerald-950/40";
                                  if (score <= 1) {
                                    riskLevel = "HIGH";
                                    riskColor = "text-rose-400 bg-rose-950/30 border-rose-950/40";
                                  } else if (score <= 3) {
                                    riskLevel = "MEDIUM";
                                    riskColor = "text-amber-400 bg-amber-950/30 border-amber-950/40";
                                  }
                                  return (
                                    <div className={`p-4 rounded-xl border ${phoneDark ? 'bg-slate-950/45 border-slate-800' : 'bg-slate-100/60 border-slate-200'} space-y-2.5`}>
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-800/10 pb-2">
                                        <span className={`font-bold text-xs ${phoneDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                          Security Header Score: <span className="text-cyan-400 font-mono text-sm">{score}/5</span>
                                        </span>
                                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase whitespace-nowrap tracking-wider ${riskColor}`}>
                                          Risk: {riskLevel}
                                        </span>
                                      </div>
                                      <p className={`text-[10px] sm:text-[11px] leading-relaxed whitespace-normal break-words ${phoneDark ? 'text-slate-300/90' : 'text-slate-600'}`}>
                                        Missing headers do not always mean a website is dangerous, but they indicate the security configuration can be improved.
                                      </p>
                                    </div>
                                  );
                                })()}
                                <h5 className="font-bold text-slate-300 text-[10px] uppercase tracking-wider mt-3">Compliance Checklist:</h5>
                                {httpResult.securityAnalysis.map((check: any, idx: number) => (
                                  <div 
                                    key={idx} 
                                    className={`p-2 rounded-xl border leading-relaxed ${
                                      check.found 
                                        ? 'bg-emerald-950/10 border-emerald-900/35 text-emerald-200' 
                                        : 'bg-rose-950/10 border-rose-900/35 text-rose-200'
                                    }`}
                                  >
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                      <span>{check.name}</span>
                                      <span>{check.found ? "✓ SAFE" : "✗ MISSING"}</span>
                                    </div>
                                    <p className="text-[9px] mt-1 opacity-80 leading-normal">
                                      {check.found ? `Current parameter: ${check.value}` : check.explanation}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {httpResult.error && (
                              <p className="text-rose-400 mt-2 p-1.5 bg-rose-950/20 rounded border border-rose-900/40 font-mono text-[11px]">{httpResult.error}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* subview 3: SSL Certificate Info */}
                    {activeToolTab === 3 && (
                      <div className="flex-0 space-y-4">
                        <div>
                          <h4 className={`text-base font-bold ${phoneDark ? 'text-white' : 'text-slate-950'}`}>SSL/TLS Certificate Checker</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">Connects safely to port 443 to retrieve validity epochs, seals, and issuers.</p>
                        </div>

                        {/* Presets */}
                        <div className="flex gap-2.5">
                          {["google.com", "microsoft.com", "github.com"].map(pill => (
                            <button
                              key={pill}
                              onClick={() => setSslDomain(pill)}
                              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                                phoneDark 
                                  ? 'bg-slate-800 border-slate-700/60 text-slate-300' 
                                  : 'bg-slate-100 border-slate-300 text-slate-600'
                              }`}
                            >
                              {pill}
                            </button>
                          ))}
                        </div>

                        {/* Input entry */}
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Secure Domain</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={sslDomain}
                              onChange={(e) => setSslDomain(e.target.value)}
                              placeholder="e.g. google.com"
                              className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono font-medium outline-none border transition ${
                                phoneDark 
                                  ? 'bg-slate-900 border-slate-850 focus:border-cyan-500 text-white' 
                                  : 'bg-white border-slate-300 focus:border-cyan-600 text-slate-900'
                              }`}
                            />
                            <button
                              onClick={executeSslCert}
                              disabled={sslRunning}
                              className="bg-cyan-600 hover:bg-cyan-500 text-white size-10 rounded-xl flex items-center justify-center transition disabled:opacity-50"
                            >
                              {sslRunning ? (
                                <span className="animate-spin text-white">⚙️</span>
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* SSL Diagnostics Log Result */}
                        {sslResult && (
                          <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2 ${
                            phoneDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex justify-between items-center pb-2 border-b border-cyan-800/20">
                              <span className="font-bold uppercase tracking-wider text-cyan-400 text-[10px]">SSL/TLS Certificate Info</span>
                              <button
                                onClick={() => handleCopyText(`Domain: ${sslResult.domain}\nIssuer: ${sslResult.issuer}\nSubject: ${sslResult.subject}\nRemaining: ${sslResult.daysRemaining} days`, "ssl")}
                                className="text-slate-400 hover:text-slate-200 p-1"
                              >
                                {copyStatus === "ssl" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>

                            {sslResult.warning && (
                              <div className="p-2 border border-rose-800 bg-rose-950/20 text-rose-300 rounded font-bold text-[10px] uppercase">
                                ⚠️ {sslResult.warning}
                              </div>
                            )}

                            <p><strong className="text-slate-400">Target Host:</strong> <code className="font-mono">{sslResult.domain}</code></p>
                            
                            {sslResult.subject && (
                              <p className="break-all"><strong className="text-slate-400">Subject CN:</strong> <span className="font-mono text-slate-300 transform-none">{sslResult.subject}</span></p>
                            )}

                            {sslResult.issuer && (
                              <p className="break-all"><strong className="text-slate-400">Issuer CA:</strong> <span className="font-mono text-slate-300">{sslResult.issuer}</span></p>
                            )}

                            {sslResult.validFrom && (
                              <p><strong className="text-slate-400">Valid From:</strong> <span className="font-mono text-slate-300">{new Date(sslResult.validFrom).toLocaleDateString()}</span></p>
                            )}

                            {sslResult.validTo && (
                              <p><strong className="text-slate-400">Valid Until:</strong> <span className="font-mono text-slate-300">{new Date(sslResult.validTo).toLocaleDateString()}</span></p>
                            )}

                            {sslResult.daysRemaining !== undefined && !sslResult.error && (
                              <p className="mt-2.5 pt-2.5 border-t border-cyan-800/10">
                                <strong className="text-slate-400">Active Epoch Status:</strong>&nbsp;
                                <span className={`font-mono font-bold text-xs ${sslResult.daysRemaining > 30 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {sslResult.daysRemaining} Days remaining
                                </span>
                              </p>
                            )}

                            {sslResult.error && (
                              <p className="text-rose-400 mt-2 p-1.5 bg-rose-950/20 rounded border border-rose-900/40 font-mono text-[11px]">{sslResult.error}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ----------------------------------------------------------- */}
                {/* SCREEN 2: HISTORY */}
                {/* ----------------------------------------------------------- */}
                {activeScreen === 2 && (
                  <div className="flex-1 flex flex-col animate-fadeIn">
                    <div className="flex items-center justify-between my-4 border-b border-cyan-800/20 pb-2 shrink-0">
                      <div>
                        <h4 className={`text-base font-bold ${phoneDark ? 'text-white' : 'text-slate-950'}`}>Audit Log History</h4>
                        <p className="text-[10px] text-slate-400">Persisted locally on device storage</p>
                      </div>
                      {historyLogs.length > 0 && (
                        <button
                          onClick={clearLogs}
                          className="text-[10px] font-bold text-rose-400 hover:text-rose-300 bg-rose-955/20 border border-rose-900/30 px-2 py-1 rounded"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {historyLogs.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <Database className="h-8 w-8 text-slate-600 mb-2" />
                        <p className="text-xs font-bold text-slate-400">No diagnostic logs found</p>
                        <p className="text-[10px] text-slate-500 mt-1">Check target servers under the Tools tab to log automated reports.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 pb-8">
                        {historyLogs.map((log) => (
                          <div 
                            key={log.id} 
                            className={`p-3 rounded-xl border leading-relaxed text-xs ${
                              phoneDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                              <span>{log.toolType}</span>
                              <span className="text-slate-500 shrink-0 font-mono text-[9px] font-normal">{log.timestamp.split(",")[1] || log.timestamp}</span>
                            </div>
                            <p className="font-semibold text-slate-200 mt-1 truncate">Target: <code className="font-mono text-slate-300 font-bold">{log.target}</code></p>
                            <p className="text-slate-400 text-[10px] mt-0.5 leading-normal">{log.summary}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ----------------------------------------------------------- */}
                {/* SCREEN 3: ABOUT */}
                {/* ----------------------------------------------------------- */}
                {activeScreen === 3 && (
                  <div className="flex-1 flex flex-col animate-fadeIn">
                    <div className="text-center my-6 shrink-0">
                      <div className="bg-gradient-to-tr from-cyan-600 to-indigo-600 w-12 h-12 rounded-xl flex items-center justify-center mx-auto shadow-md ring-1 ring-cyan-400">
                        <Smartphone className="h-6 w-6 text-cyan-200" />
                      </div>
                      <h4 className={`text-base font-bold mt-2.5 ${phoneDark ? 'text-white' : 'text-slate-950'}`}>NetCheck Lite v1.0.0</h4>
                      <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mt-0.5">Authorized Network diagnostics</p>
                    </div>

                    <div className="space-y-4 text-xs leading-relaxed">
                      
                      {/* App context */}
                      <div className={`p-4 rounded-xl border ${
                        phoneDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-sm'
                      }`}>
                        <h5 className="font-bold text-slate-300 uppercase tracking-wide text-[10px] mb-1">Philosophy</h5>
                        <p className="text-[11px] text-slate-400 leading-normal">
                          NetCheck Lite is is a clean, modern, beginner-friendly network diagnostic toolkit for Android compiling on Jetpack Compose and Material 3 design libraries. Built cleanly to demystify cryptographic SSL certificates, name resolutions, and missing security parameters on target HTTP endpoints.
                        </p>
                      </div>

                      {/* Legal disclaimers */}
                      <div className={`p-4 rounded-xl border ${
                        phoneDark ? 'bg-rose-950/15 border-rose-955 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-800 shadow-sm'
                      }`}>
                        <h5 className="font-bold uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3" />
                          Authorized diagnostics only
                        </h5>
                        <p className="text-[10px] leading-relaxed mt-0.5">
                          “This app is for education and authorized diagnostics only. Do not use it to test systems or remote network hosts without explicit authenticated permission.”
                        </p>
                      </div>

                      {/* Developer Profile card */}
                      <div className={`p-4 rounded-xl border ${
                        phoneDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-sm'
                      }`}>
                        <h5 className="font-bold text-slate-300 uppercase tracking-wide text-[10px] mb-2">Lead Developer</h5>
                        
                        <div className="flex items-center gap-3">
                          <div className="bg-cyan-600/20 text-cyan-400 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                            KI
                          </div>
                          <div>
                            <p className={`font-bold ${phoneDark ? 'text-white' : 'text-slate-900'} text-xs`}>Kevin Ibrahimovic</p>
                            <p className="text-slate-500 text-[10px]">Cybersecurity & Mobile Architect</p>
                            <a 
                              href="https://github.com/kevinibra25" 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 mt-0.5"
                            >
                              github.com/kevinibra25
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Simulated Device Bottom Navigation bar (Material 3 look) */}
              <div className={`border-t py-2 px-3 flex items-center justify-around z-20 shrink-0 select-none ${
                phoneDark ? "bg-[#1e293b] border-slate-800" : "bg-white border-slate-200 shadow-lg"
              }`}>
                {[
                  { label: "Home", idx: 0, icon: <Activity className="h-4 w-4" /> },
                  { label: "Tools", idx: 1, icon: <Terminal className="h-4 w-4" /> },
                  { label: "History", idx: 2, icon: <Database className="h-4 w-4" /> },
                  { label: "About", idx: 3, icon: <Info className="h-4 w-4" /> }
                ].map((btn) => (
                  <button
                    key={btn.idx}
                    onClick={() => setActiveScreen(btn.idx)}
                    className="flex flex-col items-center justify-center w-14 py-1.5 transition relative"
                  >
                    {/* Active Screen oval outline indicator block as per Android 13/14 M3 nav system */}
                    <div className={`absolute top-0.5 h-6 w-11 rounded-full -z-10 transition-transform ${
                      activeScreen === btn.idx 
                        ? 'scale-100 bg-cyan-600/30' 
                        : 'scale-0'
                    }`}></div>

                    <span className={activeScreen === btn.idx ? "text-cyan-400" : phoneDark ? "text-slate-400" : "text-slate-600"}>
                      {btn.icon}
                    </span>
                    <span className={`text-[9px] font-bold mt-1 tracking-wide ${
                      activeScreen === btn.idx 
                        ? phoneDark ? 'text-white' : 'text-cyan-700' 
                        : phoneDark ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {btn.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Simulated Guest Navigation Bar line (modern Android gesture navigation) */}
              <div className={`py-1.5 flex justify-center shrink-0 ${
                phoneDark ? "bg-[#1e293b]" : "bg-white"
              }`}>
                <div className={`w-36 h-1 rounded-full ${
                  phoneDark ? 'bg-slate-700' : 'bg-slate-350'
                }`}></div>
              </div>

            </div>
          </div>
        </section>

        {/* RIGHT PANEL - Android Project Source Explorer */}
        <section id="code-explorer" className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full lg:min-h-[750px]">
          
          {/* Panel Header */}
          <div className="bg-slate-850 border-b border-slate-850 p-4 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-cyan-400 shrink-0" />
              <div>
                <h2 className="text-sm font-bold text-white font-display">Android Kotlin Project Codebase</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Root Package:</span>
                  <code className="text-[10px] text-cyan-400 font-mono bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-900/30">com.netcheck.lite</code>
                </div>
              </div>
            </div>
            
            <div className="text-xs text-slate-400 font-medium bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 shrink-0 flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              Coroutines + MVVM + Jetpack Compose
            </div>
          </div>

          {/* Files List and Code Side-by-side or Nested */}
          <div className="flex-1 flex flex-col sm:flex-row overflow-hidden min-h-[500px]">
            
            {/* Folder explorer tree column */}
            <div className="w-full sm:w-60 border-b sm:border-b-0 sm:border-r border-slate-800 p-2 overflow-y-auto max-h-[220px] sm:max-h-none shrink-0 bg-slate-900/40 code-scrollbar">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-2">Source Files Tree</h3>
              <div className="space-y-1">
                {ANDROID_FILES.map((file, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedFileIndex(index)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition group ${
                      selectedFileIndex === index
                        ? "bg-cyan-950/50 border border-cyan-800/50 text-cyan-300 font-semibold"
                        : "text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className={`h-4 w-4 shrink-0 ${file.type === 'kotlin' ? 'text-amber-500' : 'text-cyan-500'}`} />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Code lines visualizer block */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
              
              {/* File Title and Actions */}
              <div className="bg-slate-900/80 border-b border-slate-850 px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
                <div className="truncate">
                  <span className="text-[10px] text-slate-500 font-mono tracking-wide">Path: </span>
                  <code className="text-xs font-mono text-slate-350">{ANDROID_FILES[selectedFileIndex].path}</code>
                </div>
                
                <button
                  onClick={() => handleCopyCodeFile(ANDROID_FILES[selectedFileIndex].content, selectedFileIndex)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-3 py-1.5 rounded text-xs transition flex items-center gap-1.5 shrink-0"
                >
                  {copiedFileIndex === selectedFileIndex ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy Code
                    </>
                  )}
                </button>
              </div>

              {/* Real syntax container viewer */}
              <div className="flex-1 p-4 overflow-auto code-scrollbar text-xs font-mono leading-relaxed bg-[#0c1017]">
                <pre className="text-slate-300">
                  <code>
                    {ANDROID_FILES[selectedFileIndex].content.split("\n").map((line, idx) => {
                      // Ultra lightweight, elegant syntax highlight simulator for clean aesthetics
                      let styledLine = line;
                      let isComment = line.trim().startsWith("//") || line.trim().startsWith("/*") || line.trim().startsWith("*");
                      let isImport = line.trim().startsWith("import ") || line.trim().startsWith("package ");
                      let isAnnotation = line.trim().startsWith("@");

                      if (isComment) {
                        return <div key={idx} className="text-slate-500 select-none italic">{line}</div>;
                      } else if (isImport) {
                        return <div key={idx} className="text-rose-400">{line}</div>;
                      } else if (isAnnotation) {
                        return <div key={idx} className="text-yellow-400 font-semibold">{line}</div>;
                      }

                      return <div key={idx} className="hover:bg-slate-900/30 px-1 rounded transition">{line}</div>;
                    })}
                  </code>
                </pre>
              </div>

            </div>

          </div>

          {/* Quick info notes for Android developers */}
          <div className="bg-slate-850/60 p-4 border-t border-slate-850 text-xs text-slate-400 leading-normal flex items-start gap-2.5 shrink-0">
            <Info className="h-4.5 w-4.5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-300 font-semibold">How to compiling & run on a physical device:</strong> Cloning this repository, copy the provided <code className="font-mono text-cyan-400 bg-cyan-950/20 px-1 py-0.5 rounded border border-cyan-900/30">/android</code> folder, and import it into **Android Studio**. Android Studio will resolve matching Kotlin libraries and Gradle settings. The app starts asynchronously using Coroutines without interrupting Android main thread cycles.
            </div>
          </div>

        </section>

      </main>

      {/* Footer disclaimer summary */}
      <footer className="bg-slate-900 border-t border-slate-800 text-xs text-slate-500 py-6 px-12 text-center mt-auto">
        <p className="max-w-2xl mx-auto">
          NetCheck Lite is a legal and educational network diagnostic sandbox. All network queries (Ping, DNS resolv, Header inspection, and cryptographic verification) are routed safely through this host container's network stack.
        </p>
        <p className="mt-2 text-[10px] text-slate-600 font-mono">
          AI Studio Build Project • Kevin Ibrahimovic Profile • Designed with Space Grotesk display & JetBrains Mono elements.
        </p>
      </footer>

    </div>
  );
}
