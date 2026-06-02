package com.netcheck.lite.data

import android.content.Context
import android.content.SharedPreferences
import android.os.Handler
import android.os.Looper
import org.json.JSONArray
import org.json.JSONObject
import java.io.Serializable
import java.util.Date

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
        currentList.add(0, newItem) // Add new item at the top of the list

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
}
