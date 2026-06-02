package com.netcheck.lite.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.netcheck.lite.ui.viewmodel.NetworkViewModel

@Composable
fun ToolsScreen(
    viewModel: NetworkViewModel,
    initialSubTab: Int = 0
) {
    var selectedTab by remember { mutableIntStateOf(initialSubTab) }
    val tabTitles = listOf("TCP Reachability", "DNS Lookup", "HTTP Headers", "SSL Cert")

    Column(modifier = Modifier.fillMaxSize()) {
        TabRow(selectedTabIndex = selectedTab) {
            tabTitles.forEachIndexed { index, title ->
                Tab(
                    selected = selectedTab == index,
                    onClick = { selectedTab = index },
                    text = { Text(text = title, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            when (selectedTab) {
                0 -> PingSubview(viewModel)
                1 -> DnsSubview(viewModel)
                2 -> HttpHeadersSubview(viewModel)
                3 -> SslCertSubview(viewModel)
            }
        }
    }
}

// -------------------------------------------------------------
// Helper to copy strings to android clipboard
fun copyToClipboard(context: Context, text: String, label: String = "Diagnostics Result") {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    val clip = ClipData.newPlainText(label, text)
    clipboard.setPrimaryClip(clip)
    Toast.makeText(context, "Copied $label to clipboard", Toast.LENGTH_SHORT).show()
}

// -------------------------------------------------------------
// PING TOOl VIEWPORT
@Composable
fun PingSubview(viewModel: NetworkViewModel) {
    val context = LocalContext.current
    val state by viewModel.pingState
    var testHost by remember { mutableStateOf("google.com") }
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
    ) {
        Text(
            text = "TCP Reachability",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = "Initiates local connectivity checkups to verify route delays.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.secondary
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Sample Pills for quick tests
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf("google.com", "example.com", "1.1.1.1").forEach { sample ->
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .clickable { testHost = sample }
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(text = sample, style = MaterialTheme.typography.labelMedium)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = testHost,
            onValueChange = { testHost = it },
            label = { Text("Domain Name or IP Address") },
            placeholder = { Text("e.g. google.com") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        Spacer(modifier = Modifier.height(12.dp))

        Button(
            onClick = { viewModel.executePing(testHost) },
            modifier = Modifier.fillMaxWidth(),
            enabled = !state.isRunning
        ) {
            if (state.isRunning) {
                CircularProgressIndicator(strokeWidth = 2.dp, modifier = Modifier.height(18.dp).width(18.dp), color = Color.White)
            } else {
                Text("Check TCP Reachability")
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        if (state.isReachable != null || state.error != null) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = "Diagnostic Log", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        OutlinedButton(
                            onClick = {
                                val logText = "Target: ${state.target}\nStatus: ${if (state.isReachable == true) "Reachable" else "Unreachable"}\nDelay: ${state.responseTimeMs ?: "N/A"} ms\nError: ${state.error ?: "None"}"
                                copyToClipboard(context, logText, "Ping Diagnostic")
                            }
                        ) {
                            Text("Copy Result", fontSize = 11.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(text = "Target Verified: ${state.target}", style = MaterialTheme.typography.bodySmall)
                    
                    val reachableText = if (state.isReachable == true) "● REACHABLE" else "● UNREACHABLE"
                    val statusColor = if (state.isReachable == true) Color(0xFF2E7D32) else Color(0xFFC62828)
                    
                    Text(
                        text = "Connection: $reachableText",
                        color = statusColor,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(vertical = 4.dp)
                    )

                    if (state.responseTimeMs != null) {
                        Text(
                            text = "Socket Handshake Delay: ${state.responseTimeMs} ms",
                            style = MaterialTheme.typography.bodySmall,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    if (state.error != null) {
                        Text(
                            text = "Error Stack: ${state.error}",
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                }
            }
        }
    }
}

// -------------------------------------------------------------
// DNS LOOKUP VIEWPORT
@Composable
fun DnsSubview(viewModel: NetworkViewModel) {
    val context = LocalContext.current
    val state by viewModel.dnsState
    var dnsHost by remember { mutableStateOf("example.com") }
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
    ) {
        Text(
            text = "DNS Lookup (A/AAAA Resolver)",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = "Resolves an authorized domain name to its registry IPs.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.secondary
        )

        Spacer(modifier = Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf("example.com", "google.com", "wikipedia.org").forEach { sample ->
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .clickable { dnsHost = sample }
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(text = sample, style = MaterialTheme.typography.labelMedium)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = dnsHost,
            onValueChange = { dnsHost = it },
            label = { Text("Authoritative Host Name") },
            placeholder = { Text("e.g. example.com") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        Spacer(modifier = Modifier.height(12.dp))

        Button(
            onClick = { viewModel.executeDnsLookup(dnsHost) },
            modifier = Modifier.fillMaxWidth(),
            enabled = !state.isRunning
        ) {
            if (state.isRunning) {
                CircularProgressIndicator(strokeWidth = 2.dp, modifier = Modifier.height(18.dp).width(18.dp), color = Color.White)
            } else {
                Text("Lookup DNS Records")
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        if (state.ipList.isNotEmpty() || state.error != null) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = "A/AAAA Records", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        OutlinedButton(
                            onClick = {
                                val logText = "Domain: ${state.hostName}\nIPs: ${state.ipList.joinToString(", ")}\nDuration: ${state.lookupTimeMs} ms\nError: ${state.error ?: "None"}"
                                copyToClipboard(context, logText, "DNS diagnostic logs")
                            }
                        ) {
                            Text("Copy Records", fontSize = 11.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(text = "Resolved Host: ${state.hostName}", style = MaterialTheme.typography.bodySmall)
                    
                    if (state.lookupTimeMs != null) {
                        Text(text = "Resolution Speed: ${state.lookupTimeMs} ms", style = MaterialTheme.typography.bodySmall, fontFamily = FontFamily.Monospace)
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(text = "Mapped IPs:", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                    state.ipList.forEach { ip ->
                        Text(
                            text = " -> $ip",
                            fontFamily = FontFamily.Monospace,
                            color = MaterialTheme.colorScheme.primary,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.padding(start = 12.dp, top = 4.dp)
                        )
                    }

                    if (state.error != null) {
                        Text(
                            text = "[Fail] ${state.error}",
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }
                }
            }
        }
    }
}

// -------------------------------------------------------------
// HTTP HEADER CHECKER VIEWPORT
@Composable
fun HttpHeadersSubview(viewModel: NetworkViewModel) {
    val context = LocalContext.current
    val state by viewModel.httpState
    var testUrl by remember { mutableStateOf("https://example.com") }
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
    ) {
        Text(
            text = "HTTP Header & Security Analyzer",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = "Loads response headers to identify missing cryptographic security parameters.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.secondary
        )

        Spacer(modifier = Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf("example.com", "https://google.com").forEach { sample ->
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .clickable { testUrl = sample }
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(text = sample, style = MaterialTheme.typography.labelMedium)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = testUrl,
            onValueChange = { testUrl = it },
            label = { Text("Secure URL") },
            placeholder = { Text("e.g. example.com") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        Spacer(modifier = Modifier.height(12.dp))

        Button(
            onClick = { viewModel.executeHttpCheck(testUrl) },
            modifier = Modifier.fillMaxWidth(),
            enabled = !state.isRunning
        ) {
            if (state.isRunning) {
                CircularProgressIndicator(strokeWidth = 2.dp, modifier = Modifier.height(18.dp).width(18.dp), color = Color.White)
            } else {
                Text("Analyze Security Headers")
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        if (state.statusCode != null || state.error != null) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = "Header Log Result", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        OutlinedButton(
                            onClick = {
                                val secText = state.securityHeaders.map { "${it.headerName}: ${it.value}" }.joinToString("\n")
                                copyToClipboard(context, "URL: ${state.finalUrl}\nStatus: ${state.statusCode}\n$secText", "HTTP Security Headers Check")
                            }
                        ) {
                            Text("Copy Result", fontSize = 11.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(text = "Original URL: ${state.url}", style = MaterialTheme.typography.bodySmall)
                    Text(text = "Final URL: ${state.finalUrl}", style = MaterialTheme.typography.bodySmall)
                    Text(text = "Redirected: ${state.redirectCount} / 5", style = MaterialTheme.typography.bodySmall)
                    
                    val sColor = if (state.statusCode in 200..299) Color(0xFF2E7D32) else Color(0xFFD84315)
                    Text(
                        text = "HTTP Code: ${state.statusCode}",
                        color = sColor,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(vertical = 4.dp)
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    if (state.securityHeaders.isNotEmpty()) {
                        val score = state.securityHeaders.count { it.exists }
                        val (riskLevel, riskColor) = when (score) {
                            in 0..1 -> "HIGH" to Color(0xFFC62828)
                            in 2..3 -> "MEDIUM" to Color(0xFFE65100)
                            else -> "GOOD" to Color(0xFF2E7D32)
                        }

                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)
                            ),
                            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "Security Header Score: $score/5",
                                        fontWeight = FontWeight.Bold,
                                        style = MaterialTheme.typography.titleMedium,
                                        modifier = Modifier.weight(1f, fill = false)
                                    )
                                    Text(
                                        text = "Risk: $riskLevel",
                                        fontWeight = FontWeight.Black,
                                        fontSize = 11.sp,
                                        color = riskColor,
                                        modifier = Modifier
                                            .background(riskColor.copy(alpha = 0.12f), shape = RoundedCornerShape(4.dp))
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = "Missing headers do not always mean a website is dangerous, but they indicate the security configuration can be improved.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    Text(
                        text = "Security Compliance Auditing:",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    state.securityHeaders.forEach { check ->
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = if (check.exists) Color(0xFFE8F5E9) else Color(0xFFFFEBEE)
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                        ) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = check.headerName,
                                        fontWeight = FontWeight.Bold,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = if (check.exists) Color(0xFF2E7D32) else Color(0xFFC62828)
                                    )
                                    Text(
                                        text = if (check.exists) "FOUND" else "MISSING",
                                        fontWeight = FontWeight.Heavy,
                                        fontSize = 10.sp,
                                        color = if (check.exists) Color(0xFF1B5E20) else Color(0xFFB71C1C)
                                    )
                                }
                                if (check.exists) {
                                    Text(
                                        text = "Value: ${check.value}",
                                        style = MaterialTheme.typography.bodySmall,
                                        fontFamily = FontFamily.Monospace,
                                        lineHeight = 14.sp,
                                        modifier = Modifier.padding(top = 2.dp)
                                    )
                                } else {
                                    Text(
                                        text = check.explanation,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Color(0xFF5D4037),
                                        lineHeight = 14.sp,
                                        modifier = Modifier.padding(top = 2.dp)
                                    )
                                }
                            }
                        }
                    }

                    if (state.error != null) {
                        Text(
                            text = "Error Output: ${state.error}",
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(top = 10.dp)
                        )
                    }
                }
            }
        }
    }
}

// -------------------------------------------------------------
// SSL / TLS CERTIFICATE INFO VIEWPORT
@Composable
fun SslCertSubview(viewModel: NetworkViewModel) {
    val context = LocalContext.current
    val state by viewModel.sslState
    var sslDomain by remember { mutableStateOf("google.com") }
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
    ) {
        Text(
            text = "SSL/TLS Certificate Checker",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = "Inspect the asymmetric cryptography certificate details of HTTPS targets.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.secondary
        )

        Spacer(modifier = Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf("google.com", "github.com", "example.com").forEach { sample ->
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .clickable { sslDomain = sample }
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(text = sample, style = MaterialTheme.typography.labelMedium)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = sslDomain,
            onValueChange = { sslDomain = it },
            label = { Text("HTTPS Domain Name") },
            placeholder = { Text("e.g. google.com") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        Spacer(modifier = Modifier.height(12.dp))

        Button(
            onClick = { viewModel.executeSslCheck(sslDomain) },
            modifier = Modifier.fillMaxWidth(),
            enabled = !state.isRunning
        ) {
            if (state.isRunning) {
                CircularProgressIndicator(strokeWidth = 2.dp, modifier = Modifier.height(18.dp).width(18.dp), color = Color.White)
            } else {
                Text("Analyze Certificate")
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        if (state.subject.isNotEmpty() || state.error != null) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = "Security Certificate Parameters", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        OutlinedButton(
                            onClick = {
                                val text = "Domain: ${state.domain}\nSubject: ${state.subject}\nIssuer: ${state.issuer}\nValid From: ${state.validFrom}\nValid To: ${state.validUntil}\nDays Remaining: ${state.daysRemaining}"
                                copyToClipboard(context, text, "SSL Certificate Info")
                            }
                        ) {
                            Text("Copy Cert", fontSize = 11.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "Checked: ${state.domain}",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    if (state.warning != null) {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 6.dp)
                        ) {
                            Text(
                                text = "⚠️ ${state.warning}",
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                modifier = Modifier.padding(8.dp)
                            )
                        }
                    }

                    DetailField(label = "Subject (Common Name & Org)", value = state.subject)
                    DetailField(label = "Certificate Issuer", value = state.issuer)
                    DetailField(label = "Active From Date", value = state.validFrom)
                    DetailField(label = "Active Until Date", value = state.validUntil)

                    Spacer(modifier = Modifier.height(8.dp))

                    val dColor = if (state.daysRemaining > 30) Color(0xFF2E7D32) else Color(0xFFC62828)
                    Text(
                        text = "Security validity remaining: ${state.daysRemaining} Days",
                        color = dColor,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.bodyMedium,
                        fontFamily = FontFamily.Monospace
                    )

                    if (state.error != null) {
                        Text(
                            text = "Handshake Error Logs: ${state.error}",
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(top = 10.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun DetailField(label: String, value: String) {
    Column(modifier = Modifier.padding(vertical = 4.dp)) {
        Text(text = label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.secondary)
        Text(
            text = value,
            style = MaterialTheme.typography.bodySmall,
            fontFamily = FontFamily.Monospace,
            color = MaterialTheme.colorScheme.onSurface,
            lineHeight = 14.sp
        )
    }
}
