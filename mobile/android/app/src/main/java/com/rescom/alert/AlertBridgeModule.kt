package com.rescom.alert

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AlertBridgeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "AlertBridge"
    }

    @ReactMethod
    fun testAlarm(message: String, promise: Promise) {
        try {
            val intent = Intent(reactContext, AlertActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("EXTRA_SENDER", "[SYSTEM TEST]")
                putExtra("EXTRA_MESSAGE", message.ifBlank { "TEST ALARM: 10RCDG Emergency Siren and Vibration verification." })
                putExtra("EXTRA_TIMESTAMP", System.currentTimeMillis())
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("TEST_ALARM_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun getAlertHistory(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("10RCDG_ALERTS", Context.MODE_PRIVATE)
            val history = prefs.getString("ALERT_HISTORY", "") ?: ""
            val alertList = Arguments.createArray()

            if (history.isNotBlank()) {
                val lines = history.split("\n").filter { it.isNotBlank() }
                for (line in lines) {
                    val parts = line.split("|")
                    if (parts.size >= 3) {
                        val alertMap = Arguments.createMap().apply {
                            putString("timestamp", parts[0])
                            putString("sender", parts[1])
                            putString("message", parts.subList(2, parts.size).joinToString("|"))
                        }
                        alertList.pushMap(alertMap)
                    }
                }
            }
            promise.resolve(alertList)
        } catch (e: Exception) {
            promise.reject("GET_HISTORY_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun clearAlertHistory(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("10RCDG_ALERTS", Context.MODE_PRIVATE)
            prefs.edit().clear().apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEAR_HISTORY_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun deleteAlert(index: Double, promise: Promise) {
        try {
            val targetIndex = index.toInt()
            val prefs = reactContext.getSharedPreferences("10RCDG_ALERTS", Context.MODE_PRIVATE)
            val history = prefs.getString("ALERT_HISTORY", "") ?: ""
            if (history.isNotBlank()) {
                val lines = history.split("\n").filter { it.isNotBlank() }.toMutableList()
                if (targetIndex in 0 until lines.size) {
                    lines.removeAt(targetIndex)
                    val newHistory = lines.joinToString("\n")
                    prefs.edit().putString("ALERT_HISTORY", newHistory).apply()
                }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DELETE_ALERT_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun requestBatteryOptimization(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent().apply {
                    action = Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
                    data = Uri.parse("package:${reactContext.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("BATTERY_OPT_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                val intent = Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT).apply {
                    data = Uri.parse("package:${reactContext.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(intent)
                promise.resolve(true)
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(reactContext)) {
                val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
                    data = Uri.parse("package:${reactContext.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(intent)
                promise.resolve(true)
            } else {
                // Fallback to app details
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:${reactContext.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(intent)
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("OVERLAY_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun checkPermissions(promise: Promise) {
        try {
            val map = Arguments.createMap()
            val hasSms = ContextCompat.checkSelfPermission(
                reactContext,
                android.Manifest.permission.RECEIVE_SMS
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED

            var isBatteryIgnored = true
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val pm = reactContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
                isBatteryIgnored = pm?.isIgnoringBatteryOptimizations(reactContext.packageName) ?: false
            }

            var canDrawOverlays = true
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                canDrawOverlays = Settings.canDrawOverlays(reactContext)
            }

            var canFullScreen = true
            if (Build.VERSION.SDK_INT >= 34) {
                val nm = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                try {
                    val method = NotificationManager::class.java.getMethod("canUseFullScreenIntent")
                    canFullScreen = (method.invoke(nm) as? Boolean) ?: true
                } catch (e: Exception) {
                    canFullScreen = true
                }
            }

            val overlayOrFullScreenOk = if (Build.VERSION.SDK_INT >= 34) {
                canFullScreen
            } else {
                canDrawOverlays || canFullScreen
            }

            map.putBoolean("hasSmsPermission", hasSms)
            map.putBoolean("isBatteryIgnored", isBatteryIgnored)
            map.putBoolean("canDrawOverlays", canDrawOverlays)
            map.putBoolean("canFullScreen", canFullScreen)
            map.putBoolean("isFullyArmed", hasSms && isBatteryIgnored && overlayOrFullScreenOk)
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("CHECK_PERMISSIONS_FAILED", e.message, e)
        }
    }
}
