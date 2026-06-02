export interface CodeFile {
  name: string;
  path: string;
  type: "gradle" | "xml" | "kotlin" | "json";
  content: string;
}

export const ANDROID_FILES: CodeFile[] = [
  {
    name: "AndroidManifest.xml",
    path: "app/src/main/AndroidManifest.xml",
    type: "xml",
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.netcheck.lite">

    <!-- NetCheck Lite Permissions: Legal diagnostics requires internet state awareness -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="NetCheck Lite"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.NetCheckLite">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.NetCheckLite">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`
  },
  {
    name: "build.gradle.kts (App)",
    path: "app/build.gradle.kts",
    type: "gradle",
    content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.netcheck.lite"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.netcheck.lite"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
    
    // Jetpack Compose & Material 3
    implementation(platform("androidx.compose:compose-bom:2024.01.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.navigation:navigation-compose:2.7.7")

    // Coroutines for safe background network ops
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // Testing
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
    androidTestImplementation(platform("androidx.compose:compose-bom:2024.01.00"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}`
  },
  {
    name: "MainActivity.kt",
    path: "app/src/main/java/com/netcheck/lite/MainActivity.kt",
    type: "kotlin",
    content: `package com.netcheck.lite

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Box
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Icon
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Build
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import com.netcheck.lite.ui.screens.AboutScreen
import com.netcheck.lite.ui.screens.HistoryScreen
import com.netcheck.lite.ui.screens.HomeScreen
import com.netcheck.lite.ui.screens.ToolsScreen
import com.netcheck.lite.ui.theme.NetCheckLiteTheme
import com.netcheck.lite.ui.viewmodel.NetworkViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            NetCheckLiteTheme {
                MainAppLayout()
            }
        }
    }
}

data class BottomNavItem(
    val title: String,
    val icon: ImageVector,
    val route: String
)

@Composable
fun MainAppLayout() {
    val viewModel: NetworkViewModel = viewModel()
    var selectedScreenIndex by remember { mutableIntStateOf(0) }
    var selectedToolSubTab by remember { mutableIntStateOf(0) }

    val navItems = listOf(
        BottomNavItem("Home", Icons.Default.Home, "home"),
        BottomNavItem("Tools", Icons.Default.Build, "tools"),
        BottomNavItem("History", Icons.Default.List, "history"),
        BottomNavItem("About", Icons.Default.Info, "about")
    )

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        bottomBar = {
            NavigationBar {
                navItems.forEachIndexed { index, item ->
                    NavigationBarItem(
                        selected = selectedScreenIndex == index,
                        onClick = {
                            selectedScreenIndex = index
                            // Reset tool context if needed
                            if (index == 1) {
                                selectedToolSubTab = 0
                            }
                        },
                        icon = { Icon(imageVector = item.icon, contentDescription = item.title) },
                        label = { Text(text = item.title) }
                    )
                }
            }
        }
    ) { innerPadding ->
        Box(modifier = Modifier.padding(innerPadding)) {
            when (selectedScreenIndex) {
                0 -> HomeScreen(
                    onNavigateToTool = { toolIndex ->
                        selectedToolSubTab = toolIndex
                        selectedScreenIndex = 1
                    }
                )
                1 -> ToolsScreen(viewModel = viewModel, initialSubTab = selectedToolSubTab)
                2 -> HistoryScreen(viewModel = viewModel)
                3 -> AboutScreen()
            }
        }
    }
}`
  },
  {
    name: "NetworkViewModel.kt",
    path: "app/src/main/java/com/netcheck/lite/ui/viewmodel/NetworkViewModel.kt",
    type: "kotlin",
    content: `package com.netcheck.lite.ui.viewmodel

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
                            errorMsg = "TCP Reachability failed on both port 443 (\${e443.localizedMessage}) and port 80 (\${e80.localizedMessage})"
                        }
                    }

                    if (isReachable) {
                        val summaryText = "Reachable on port \$connectedPort, IPs: \${ipAddresses.joinToString(\", \")} (\${connectionTime}ms)"
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

                    historyManager.saveItem("DNS Lookup", domain, "Resolved \${ipv4s.size} IPv4, \${ipv6s.size} IPv6 records in \${elapsedTime}ms")
                    DnsState(
                        domain = domain,
                        hostName = cleanHost,
                        ipv4List = ipv4s,
                        ipv6List = ipv6s,
                        lookupTimeMs = elapsedTime
                    )
                } catch (e: java.net.UnknownHostException) {
                    DnsState(domain = domain, error = "Unknown host lookup error: \${e.localizedMessage}")
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
            urlStr = "https://\$urlStr"
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
                                currentError = "SSL / TLS Handshake Certificate Error: \${sslEx.localizedMessage}. Server certificate may be self-signed, invalid, or expired."
                                break
                            } catch (timeoutEx: java.net.SocketTimeoutException) {
                                currentError = "HTTP Connection Timeout: Server took too long to complete request headers."
                                break
                            } catch (e: Exception) {
                                currentError = "Connection Error (\${method}): \${e.localizedMessage}"
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

                        historyManager.saveItem("HTTP Headers", urlStr, "Status: \$responseCode")
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
                    val connection = URL("https://\$cleanHost").openConnection() as HttpsURLConnection
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
                            isNearExpiry -> "Caution: Certificate pending expiry! Renew domain credentials in \$daysRemaining days."
                            else -> null
                        }

                        val subjectName = cert.subjectX500Principal.name
                        val issuerName = cert.issuerX500Principal.name

                        historyManager.saveItem("SSL Certificate", cleanHost, "Issuer: \${cert.issuerX500Principal.name.split(\",\").firstOrNull()}, Expires in: \$daysRemaining days")
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
}`
  },
  {
    name: "HistoryManager.kt",
    path: "app/src/main/java/com/netcheck/lite/data/HistoryManager.kt",
    type: "kotlin",
    content: `package com.netcheck.lite.data

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.io.Serializable

data class HistoryItem(
    val id: String,
    val toolType: String,
    val target: String,
    val summary: String,
    val timestamp: Long
) : Serializable

class HistoryManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("netcheck_history_prefs", Context.MODE_PRIVATE)

    fun saveItem(toolType: String, target: String, summary: String) {
        val id = java.util.UUID.randomUUID().toString()
        val newItem = HistoryItem(
            id = id,
            toolType = toolType,
            target = target,
            summary = summary,
            timestamp = System.currentTimeMillis()
        )
        val currentList = getHistory().toMutableList()
        currentList.add(0, newItem)

        saveList(currentList)
    }

    fun getHistory(): List<HistoryItem> {
        val jsonStr = prefs.getString("history_items", "[]") ?: "[]"
        return try {
            val arr = JSONArray(jsonStr)
            val list = mutableListOf<HistoryItem>()
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                list.add(
                    HistoryItem(
                        id = obj.getString("id"),
                        toolType = obj.getString("toolType"),
                        target = obj.getString("target"),
                        summary = obj.getString("summary"),
                        timestamp = obj.getLong("timestamp")
                    )
                )
            }
            list
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun clearHistory() {
        prefs.edit().putString("history_items", "[]").apply()
    }

    private fun saveList(list: List<HistoryItem>) {
        try {
            val arr = JSONArray()
            for (item in list) {
                val obj = JSONObject()
                obj.put("id", item.id)
                obj.put("toolType", item.toolType)
                obj.put("target", item.target)
                obj.put("summary", item.summary)
                obj.put("timestamp", item.timestamp)
                arr.put(obj)
            }
            prefs.edit().putString("history_items", arr.toString()).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}`
  },
  {
    name: "HomeScreen.kt",
    path: "app/src/main/java/com/netcheck/lite/ui/screens/HomeScreen.kt",
    type: "kotlin",
    content: `package com.netcheck.lite.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun HomeScreen(
    onNavigateToTool: (Int) -> Unit
) {
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(scrollState),
        verticalArrangement = Arrangement.Top,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "NetCheck Lite",
            style = MaterialTheme.typography.headlineLarge.copy(
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            ),
            color = MaterialTheme.colorScheme.primary,
            textAlign = TextAlign.Center
        )

        Text(
            text = "Legal Network Diagnostic Toolkit",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.secondary,
            modifier = Modifier.padding(top = 4.dp),
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(24.dp))

        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f)
            ),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Legal Warning & Scope Constraint",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.error,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Only test networks, domains, and systems you own or have permission to check. NetCheck Lite does not support hacking, brute force, WiFi key cracking, or unauthorized audits.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    lineHeight = 16.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Diagnostic Utilities",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.onBackground
        )

        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            ToolCard(
                title = "TCP Reachability",
                description = "Verify safe connectivity & response times",
                modifier = Modifier.weight(1f),
                onClick = { onNavigateToTool(0) }
            )
            ToolCard(
                title = "DNS Lookup",
                description = "Perform name resolution checkups",
                modifier = Modifier.weight(1f),
                onClick = { onNavigateToTool(1) }
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            ToolCard(
                title = "HTTP Headers",
                description = "Inspect status logs and security tags",
                modifier = Modifier.weight(1f),
                onClick = { onNavigateToTool(2) }
            )
            ToolCard(
                title = "SSL Certificate",
                description = "Read validity epochs, issuers, & seals",
                modifier = Modifier.weight(1f),
                onClick = { onNavigateToTool(3) }
            )
        }

        Spacer(modifier = Modifier.height(32.dp))
    }
}`
  },
  {
    name: "Theme.kt",
    path: "app/src/main/java/com/netcheck/lite/ui/theme/Theme.kt",
    type: "kotlin",
    content: `package com.netcheck.lite.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

val Purple80 = Color(0xFF90CAF9)
val PurpleGrey80 = Color(0xFFB0BEC5)
val Pink80 = Color(0xFF80DEEA)

val Purple40 = Color(0xFF1565C0)
val PurpleGrey40 = Color(0xFF37474F)
val Pink40 = Color(0xFF00838F)

private val DarkColorScheme = darkColorScheme(
    primary = Purple80,
    secondary = PurpleGrey80,
    tertiary = Pink80,
    background = Color(0xFF121824),
    surface = Color(0xFF1E293B),
    onPrimary = Color(0xFF0D47A1),
    onSecondary = Color(0xFF212121),
    onBackground = Color(0xFFECEFF1),
    onSurface = Color(0xFFF8FAFC)
)

private val LightColorScheme = lightColorScheme(
    primary = Purple40,
    secondary = PurpleGrey40,
    tertiary = Pink40,
    background = Color(0xFFF8FAFC),
    surface = Color(0xFFFFFFFF),
    onPrimary = Color(0xFFFFFFFF),
    onSecondary = Color(0xFFFFFFFF),
    onBackground = Color(0xFF0F172A),
    onSurface = Color(0xFF1E293B)
)

@Composable
fun NetCheckLiteTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}`
  }
];
