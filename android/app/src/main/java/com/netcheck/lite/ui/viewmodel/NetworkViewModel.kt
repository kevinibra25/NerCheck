package com.netcheck.lite.ui.viewmodel

import android.app.Application
import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.netcheck.lite.data.HistoryItem
import com.netcheck.lite.data.HistoryManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.InetAddress
import java.net.URL
import java.security.cert.X509Certificate
import javax.net.ssl.HttpsURLConnection

// State wrappers for network tools
data class PingState(
    val target: String = "",
    val isRunning: Boolean = false,
    val isReachable: Boolean? = null,
    val responseTimeMs: Long? = null,
    val resolvedIps: List<String> = emptyList(),
    val connectedPort: Int? = null,
    val error: String? = null
)

data class DnsState(
    val domain: String = "",
    val isRunning: Boolean = false,
    val hostName: String = "",
    val ipv4List: List<String> = emptyList(),
    val ipv6List: List<String> = emptyList(),
    val lookupTimeMs: Long? = null,
    val error: String? = null
)

data class HttpState(
    val url: String = "",
    val isRunning: Boolean = false,
    val finalUrl: String = "",
    val statusCode: Int? = null,
    val protocol: String = "",
    val headers: Map<String, List<String>> = emptyMap(),
    val securityHeaders: List<SecurityHeaderAnalysis> = emptyList(),
    val redirectCount: Int = 0,
    val error: String? = null
)

data class SecurityHeaderAnalysis(
    val headerName: String,
    val value: String,
    val exists: Boolean,
    val explanation: String
)

data class SslState(
    val domain: String = "",
    val isRunning: Boolean = false,
    val subject: String = "",
    val issuer: String = "",
    val validFrom: String = "",
    val validUntil: String = "",
    val daysRemaining: Int = 0,
    val warning: String? = null,
    val error: String? = null
)

class NetworkViewModel(application: Application) : AndroidViewModel(application) {
    private val historyManager = HistoryManager(application)

    private val _historyState = mutableStateOf<List<HistoryItem>>(emptyList())
    val historyState: State<List<HistoryItem>> = _historyState

    // Tools screen individual states
    private val _pingState = mutableStateOf(PingState())
    val pingState: State<PingState> = _pingState

    private val _dnsState = mutableStateOf(DnsState())
    val dnsState: State<DnsState> = _dnsState

    private val _httpState = mutableStateOf(HttpState())
    val httpState: State<HttpState> = _httpState

    private val _sslState = mutableStateOf(SslState())
    val sslState: State<SslState> = _sslState

    init {
        loadHistory()
    }

    fun loadHistory() {
        _historyState.value = historyManager.getHistory()
    }

    fun clearHistory() {
        historyManager.clearHistory()
        loadHistory()
    }

    private fun cleanHost(input: String): String {
        return input
            .trim()
            .replace(Regex("""^(https?://)?(www\.)?"""), "")
            .split("/")[0]
            .split(":")[0]
    }

    // Coroutine-driven TCP Reachability Checker
    fun executePing(targetInput: String) {
        val target = targetInput.trim()
        if (target.isEmpty()) {
            _pingState.value = PingState(error = "Input cannot be empty")
            return
        }

        _pingState.value = PingState(target = target, isRunning = true)

        viewModelScope.launch {
            val result = withContext(Dispatchers.IO) {
                val startTime = System.currentTimeMillis()
                try {
                    val cleanHost = cleanHost(target)
                    val addresses = InetAddress.getAllByName(cleanHost)
                    val ipAddresses = addresses.map { it.hostAddress }

                    if (ipAddresses.isEmpty()) {
                        throw Exception("No IP addresses found")
                    }

                    var isReachable = false
                    var connectedPort: Int? = null
                    var connectionTime: Long? = null
                    var errorMsg: String? = null

                    // Try port 443 first
                    try {
                        val socket = java.net.Socket()
                        socket.connect(java.net.InetSocketAddress(ipAddresses[0], 443), 2500)
                        socket.close()
                        isReachable = true
                        connectedPort = 443
                        connectionTime = System.currentTimeMillis() - startTime
                    } catch (e443: Exception) {
                        // If 443 fails, try port 80
                        try {
                            val socket = java.net.Socket()
                            socket.connect(java.net.InetSocketAddress(ipAddresses[0], 80), 2500)
                            socket.close()
                            isReachable = true
                            connectedPort = 80
                            connectionTime = System.currentTimeMillis() - startTime
                        } catch (e80: Exception) {
                            errorMsg = "TCP Reachability failed on both port 443 (${e443.localizedMessage}) and port 80 (${e80.localizedMessage})"
                        }
                    }

                    if (isReachable) {
                        val summaryText = "Reachable on port $connectedPort, IPs: ${ipAddresses.joinToString(", ")} (${connectionTime}ms)"
                        historyManager.saveItem("TCP Reachability", target, summaryText)
                        PingState(
                            target = target,
                            isReachable = true,
                            responseTimeMs = connectionTime,
                            resolvedIps = ipAddresses,
                            connectedPort = connectedPort,
                            error = null
                        )
                    } else {
                        historyManager.saveItem("TCP Reachability", target, "Unreachable")
                        PingState(
                            target = target,
                            isReachable = false,
                            resolvedIps = ipAddresses,
                            connectedPort = null,
                            error = errorMsg
                        )
                    }
                } catch (e: Exception) {
                    PingState(
                        target = target,
                        isReachable = false,
                        error = e.localizedMessage ?: "Unknown diagnostic error"
                    )
                }
            }
            _pingState.value = result
            loadHistory()
        }
    }

    // Coroutine-driven DNS Lookup
    fun executeDnsLookup(domainInput: String) {
        val domain = domainInput.trim()
        if (domain.isEmpty()) {
            _dnsState.value = DnsState(error = "Input hostname cannot be empty")
            return
        }

        _dnsState.value = DnsState(domain = domain, isRunning = true)

        viewModelScope.launch {
            val result = withContext(Dispatchers.IO) {
                val startTime = System.currentTimeMillis()
                try {
                    val cleanHost = cleanHost(domain)
                    val addresses = InetAddress.getAllByName(cleanHost)
                    val ipv4s = addresses.filter { it is java.net.Inet4Address }.map { it.hostAddress }
                    val ipv6s = addresses.filter { it is java.net.Inet6Address }.map { it.hostAddress }
                    val elapsedTime = System.currentTimeMillis() - startTime

                    historyManager.saveItem("DNS Lookup", domain, "Resolved ${ipv4s.size} IPv4, ${ipv6s.size} IPv6 records in ${elapsedTime}ms")
                    DnsState(
                        domain = domain,
                        hostName = cleanHost,
                        ipv4List = ipv4s,
                        ipv6List = ipv6s,
                        lookupTimeMs = elapsedTime
                    )
                } catch (e: java.net.UnknownHostException) {
                    DnsState(domain = domain, error = "Unknown host lookup error: ${e.localizedMessage}")
                } catch (e: Exception) {
                    DnsState(domain = domain, error = e.localizedMessage ?: "Failed to resolve DNS")
                }
            }
            _dnsState.value = result
            loadHistory()
        }
    }

    // Coroutine-driven HTTP Headers Checker
    fun executeHttpCheck(urlInput: String) {
        var urlStr = urlInput.trim()
        if (urlStr.isEmpty()) {
            _httpState.value = HttpState(error = "URL cannot be empty")
            return
        }

        if (!urlStr.startsWith("http://", ignoreCase = true) && !urlStr.startsWith("https://", ignoreCase = true)) {
            urlStr = "https://$urlStr"
        }

        _httpState.value = HttpState(url = urlStr, isRunning = true)

        viewModelScope.launch {
            val result = withContext(Dispatchers.IO) {
                try {
                    var finalUrlStr = urlStr
                    var responseCode = -1
                    var headersMap: Map<String, List<String>> = emptyMap()
                    var redirectCount = 0

                    // Try HEAD first, then fallback to GET
                    var success = false
                    var currentError: String? = null

                    for (method in listOf("HEAD", "GET")) {
                        if (success) break
                        var currentUrl = urlStr
                        var currentRedirectCount = 0
                        var tempResponseCode = -1
                        var tempHeadersMap: Map<String, List<String>> = emptyMap()
                        var loopSuccess = false
                        val visitedUrls = mutableSetOf<String>()

                        while (true) {
                            visitedUrls.add(currentUrl)
                            try {
                                val urlObj = URL(currentUrl)
                                val connection = urlObj.openConnection() as HttpURLConnection
                                connection.requestMethod = method
                                connection.connectTimeout = 5000
                                connection.readTimeout = 5000
                                connection.instanceFollowRedirects = false
                                connection.setRequestProperty("User-Agent", "NetCheckLite/1.0.0 (Android Network Diagnostics)")

                                tempResponseCode = connection.responseCode
                                tempHeadersMap = connection.headerFields

                                if (tempResponseCode in listOf(301, 302, 303, 307, 308)) {
                                    val location = connection.getHeaderField("Location")
                                    connection.disconnect()
                                    if (location != null && currentRedirectCount < 5) {
                                        currentRedirectCount++
                                        val nextUrl = try {
                                            URL(URL(currentUrl), location).toString()
                                        } catch (e: Exception) {
                                            location
                                        }
                                        if (visitedUrls.contains(nextUrl)) {
                                            currentError = "Infinite redirect loop detected."
                                            break
                                        }
                                        currentUrl = nextUrl
                                    } else if (currentRedirectCount >= 5) {
                                        currentError = "Too many redirects (max 5)."
                                        break
                                    } else {
                                        loopSuccess = true
                                        break
                                    }
                                } else {
                                    connection.disconnect()
                                    loopSuccess = true
                                    break
                                }
                            } catch (sslEx: javax.net.ssl.SSLException) {
                                currentError = "SSL / TLS Handshake Certificate Error: ${sslEx.localizedMessage}. Server certificate may be self-signed, invalid, or expired."
                                break
                            } catch (timeoutEx: java.net.SocketTimeoutException) {
                                currentError = "HTTP Connection Timeout: Server took too long to complete request headers."
                                break
                            } catch (e: Exception) {
                                currentError = "Connection Error (${method}): ${e.localizedMessage}"
                                break
                            }
                        }

                        if (loopSuccess) {
                            responseCode = tempResponseCode
                            headersMap = tempHeadersMap
                            finalUrlStr = currentUrl
                            redirectCount = currentRedirectCount
                            success = true
                        }
                    }

                    if (!success) {
                        HttpState(url = urlStr, error = currentError ?: "Failed connection handshake")
                    } else {
                        // Extract headers (case-insensitive search)
                        fun getHeaderVal(name: String): String? {
                            return headersMap.entries.firstOrNull { it.key?.equals(name, ignoreCase = true) == true }?.value?.firstOrNull()
                        }

                        val securityHeaders = listOf(
                            SecurityHeaderAnalysis(
                                headerName = "Strict-Transport-Security",
                                value = getHeaderVal("Strict-Transport-Security") ?: "Missing",
                                exists = getHeaderVal("Strict-Transport-Security") != null,
                                explanation = "Enforces secure browser connections via HTTPS only. Prevents SSL strip/mitm fallback actions."
                            ),
                            SecurityHeaderAnalysis(
                                headerName = "Content-Security-Policy",
                                value = getHeaderVal("Content-Security-Policy") ?: "Missing",
                                exists = getHeaderVal("Content-Security-Policy") != null,
                                explanation = "Mitigates cross-site scripting (XSS) and frame hijacking risk by white-listing resource locations."
                            ),
                            SecurityHeaderAnalysis(
                                headerName = "X-Frame-Options",
                                value = getHeaderVal("X-Frame-Options") ?: "Missing",
                                exists = getHeaderVal("X-Frame-Options") != null,
                                explanation = "Stops clickjacking exploits by stating whether browsers are allowed to run the webpage in an iframe."
                            ),
                            SecurityHeaderAnalysis(
                                headerName = "X-Content-Type-Options",
                                value = getHeaderVal("X-Content-Type-Options") ?: "Missing",
                                exists = getHeaderVal("X-Content-Type-Options") != null,
                                explanation = "Halts browser MIME parsing sniffs that turn user text or media assets into executable code files."
                            ),
                            SecurityHeaderAnalysis(
                                headerName = "Referrer-Policy",
                                value = getHeaderVal("Referrer-Policy") ?: "Missing",
                                exists = getHeaderVal("Referrer-Policy") != null,
                                explanation = "Sets guidelines on what connection metadata points pass over to external target servers."
                            )
                        )

                        historyManager.saveItem("HTTP Headers", urlStr, "Status: $responseCode")
                        HttpState(
                            url = urlStr,
                            finalUrl = finalUrlStr,
                            statusCode = responseCode,
                            headers = headersMap
                                .filterKeys { it != null }
                                .mapKeys { it.key!! },
                            securityHeaders = securityHeaders,
                            redirectCount = redirectCount
                        )
                    }
                } catch (e: Exception) {
                    HttpState(url = urlStr, error = e.localizedMessage ?: "Failed connection handshake")
                }
            }
            _httpState.value = result
            loadHistory()
        }
    }

    // Coroutine-driven SSL/TLS Certificate Info Lookups
    fun executeSslCheck(domainInput: String) {
        val domain = domainInput.trim()
        if (domain.isEmpty()) {
            _sslState.value = SslState(error = "Input domain cannot be empty")
            return
        }

        val cleanHost = cleanHost(domain)
        _sslState.value = SslState(domain = cleanHost, isRunning = true)

        viewModelScope.launch {
            val result = withContext(Dispatchers.IO) {
                try {
                    // Custom HttpsURLConnection utilizing system validation rules (does not bypass SSL)
                    val connection = URL("https://$cleanHost").openConnection() as HttpsURLConnection
                    connection.connectTimeout = 5000
                    connection.readTimeout = 5000
                    connection.connect()

                    val certs = connection.serverCertificates
                    val cert = certs.firstOrNull() as? X509Certificate
                    connection.disconnect()

                    if (cert != null) {
                        val validFrom = cert.notBefore
                        val validUntil = cert.notAfter
                        val now = java.util.Date()

                        val diffMs = validUntil.time - now.time
                        val daysRemaining = (diffMs / (1000 * 60 * 60 * 24)).toInt()
                        val isExpired = daysRemaining <= 0
                        val isNearExpiry = daysRemaining in 1..30

                        val warningMsg = when {
                            isExpired -> "Expired Certificate! Secure socket connection rejected by default clients."
                            isNearExpiry -> "Caution: Certificate pending expiry! Renew domain credentials in $daysRemaining days."
                            else -> null
                        }

                        val subjectName = cert.subjectX500Principal.name
                        val issuerName = cert.issuerX500Principal.name

                        historyManager.saveItem("SSL Certificate", cleanHost, "Issuer: ${cert.issuerX500Principal.name.split(",").firstOrNull()}, Expires in: $daysRemaining days")
                        SslState(
                            domain = cleanHost,
                            subject = subjectName,
                            issuer = issuerName,
                            validFrom = validFrom.toString(),
                            validUntil = validUntil.toString(),
                            daysRemaining = if (isExpired) 0 else daysRemaining,
                            warning = warningMsg
                        )
                    } else {
                        SslState(domain = cleanHost, error = "SSL Handshake response didn't supply readable certificate chains")
                    }
                } catch (sslEx: javax.net.ssl.SSLHandshakeException) {
                    SslState(domain = cleanHost, error = "SSL Validation Failed: Secure socket connection rejected. Certificate is untrusted, self-signed, or expired.")
                } catch (e: Exception) {
                    SslState(domain = cleanHost, error = e.localizedMessage ?: "TLS connection handshake aborted error")
                }
            }
            _sslState.value = result
            loadHistory()
        }
    }
}
