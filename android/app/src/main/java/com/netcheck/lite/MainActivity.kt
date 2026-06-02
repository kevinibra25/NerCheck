package com.netcheck.lite

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
                        selectedScreenIndex = 1 // Navigates to tools screen
                    }
                )
                1 -> ToolsScreen(viewModel = viewModel, initialSubTab = selectedToolSubTab)
                2 -> HistoryScreen(viewModel = viewModel)
                3 -> AboutScreen()
            }
        }
    }
}
