package com.rescom.alert

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object AlertStorage {
    private const val PREFS_NAME = "10RCDG_ALERTS"
    private const val KEY_HISTORY = "ALERT_HISTORY"
    private const val MAX_ALERTS = 100

    @Synchronized
    fun saveAlert(context: Context, sender: String, message: String): Boolean {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val historyRaw = prefs.getString(KEY_HISTORY, "") ?: ""
            val jsonArray = parseHistoryToJsonArray(historyRaw)

            val timeFormatted = SimpleDateFormat("MMM dd, yyyy • HH:mm'H'", Locale.getDefault()).format(Date())

            // Prevent duplicate save if same sender and same message was saved within the same minute
            if (jsonArray.length() > 0) {
                val latest = jsonArray.getJSONObject(0)
                val latestSender = latest.optString("sender")
                val latestMsg = latest.optString("message")
                val latestTime = latest.optString("timestamp")
                if (latestSender == sender && latestMsg == message && latestTime == timeFormatted) {
                    return false
                }
            }

            val newObject = JSONObject().apply {
                put("timestamp", timeFormatted)
                put("sender", sender)
                put("message", message)
            }

            val newArray = JSONArray()
            newArray.put(newObject)
            for (i in 0 until minOf(jsonArray.length(), MAX_ALERTS - 1)) {
                newArray.put(jsonArray.get(i))
            }

            prefs.edit().putString(KEY_HISTORY, newArray.toString()).apply()
            return true
        } catch (e: Exception) {
            e.printStackTrace()
            return false
        }
    }

    @Synchronized
    fun getAlerts(context: Context): JSONArray {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val historyRaw = prefs.getString(KEY_HISTORY, "") ?: ""
        val jsonArray = parseHistoryToJsonArray(historyRaw)

        // Automatically migrate legacy pipe-separated format to clean JSON array
        if (historyRaw.isNotBlank() && !historyRaw.trimStart().startsWith("[")) {
            prefs.edit().putString(KEY_HISTORY, jsonArray.toString()).apply()
        }
        return jsonArray
    }

    @Synchronized
    fun deleteAlert(context: Context, index: Int): Boolean {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonArray = getAlerts(context)
            if (index in 0 until jsonArray.length()) {
                val newArray = JSONArray()
                for (i in 0 until jsonArray.length()) {
                    if (i != index) {
                        newArray.put(jsonArray.get(i))
                    }
                }
                prefs.edit().putString(KEY_HISTORY, newArray.toString()).apply()
                return true
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return false
    }

    @Synchronized
    fun clearHistory(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().clear().apply()
        return true
    }

    @Synchronized
    fun parseHistoryToJsonArray(raw: String): JSONArray {
        if (raw.isBlank()) return JSONArray()
        val trimmed = raw.trimStart()
        if (trimmed.startsWith("[")) {
            return try {
                JSONArray(raw)
            } catch (e: Exception) {
                JSONArray()
            }
        }

        // Backward compatibility: parse legacy pipe-separated string and reassemble multiline messages
        val result = JSONArray()
        val lines = raw.split("\n").filter { it.isNotBlank() }
        var currentObj: JSONObject? = null

        for (line in lines) {
            val parts = line.split("|")
            if (parts.size >= 3) {
                currentObj?.let { result.put(it) }
                currentObj = JSONObject().apply {
                    put("timestamp", parts[0].trim())
                    put("sender", parts[1].trim())
                    put("message", parts.subList(2, parts.size).joinToString("|"))
                }
            } else if (currentObj != null) {
                // Continuation line of the multiline SMS message that was split by newline!
                val existingMsg = currentObj.optString("message", "")
                val merged = if (existingMsg.isNotBlank()) "$existingMsg\n$line" else line
                currentObj.put("message", merged)
            }
        }
        currentObj?.let { result.put(it) }

        return result
    }
}
