package com.rescom.alert

import android.app.Activity
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.OpenableColumns
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AlertBridgeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var pickAudioPromise: Promise? = null
    private val REQUEST_PICK_AUDIO = 9482

    private val activityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
            if (requestCode == REQUEST_PICK_AUDIO) {
                if (resultCode == Activity.RESULT_OK && data?.data != null) {
                    val uri = data.data!!
                    try {
                        val flags = Intent.FLAG_GRANT_READ_URI_PERMISSION
                        reactContext.contentResolver.takePersistableUriPermission(uri, flags)
                    } catch (e: Exception) {}

                    var displayName = "Custom Audio (.mp3/.wav)"
                    try {
                        val cursor = reactContext.contentResolver.query(uri, null, null, null, null)
                        cursor?.use {
                            if (it.moveToFirst()) {
                                val nameIndex = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                                if (nameIndex != -1) {
                                    val name = it.getString(nameIndex)
                                    if (!name.isNullOrBlank()) displayName = name
                                }
                            }
                        }
                    } catch (e: Exception) {}

                    AlertStorage.setCustomSound(reactContext, uri.toString(), displayName)
                    val map = Arguments.createMap().apply {
                        putBoolean("success", true)
                        putString("uri", uri.toString())
                        putString("title", displayName)
                        putBoolean("isDefault", false)
                    }
                    pickAudioPromise?.resolve(map)
                } else {
                    val map = Arguments.createMap().apply {
                        putBoolean("success", false)
                        putString("error", "Selection cancelled")
                    }
                    pickAudioPromise?.resolve(map)
                }
                pickAudioPromise = null
            }
        }
    }

    init {
        try {
            reactContext.addActivityEventListener(activityEventListener)
        } catch (e: Exception) {
            android.util.Log.e("AlertBridgeModule", "Error adding activity event listener: ${e.message}", e)
        }
    }

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
            val jsonArray = AlertStorage.getAlerts(reactContext)
            val alertList = Arguments.createArray()

            for (i in 0 until jsonArray.length()) {
                val item = jsonArray.getJSONObject(i)
                val alertMap = Arguments.createMap().apply {
                    putString("timestamp", item.optString("timestamp"))
                    putString("sender", item.optString("sender"))
                    putString("message", item.optString("message"))
                }
                alertList.pushMap(alertMap)
            }
            promise.resolve(alertList)
        } catch (e: Exception) {
            promise.reject("GET_HISTORY_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun clearAlertHistory(promise: Promise) {
        try {
            AlertStorage.clearHistory(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEAR_HISTORY_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun deleteAlert(index: Double, promise: Promise) {
        try {
            val ok = AlertStorage.deleteAlert(reactContext, index.toInt())
            promise.resolve(ok)
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
    fun stopAlarm(promise: Promise) {
        try {
            TacticalAlarmManager.stop(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ALARM_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun isAlarmActive(promise: Promise) {
        try {
            promise.resolve(TacticalAlarmManager.isAlarmActive())
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun isFlashlightStrobeEnabled(promise: Promise) {
        try {
            promise.resolve(AlertStorage.isFlashlightStrobeEnabled(reactContext))
        } catch (e: Exception) {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun setFlashlightStrobe(enabled: Boolean, promise: Promise) {
        try {
            val ok = AlertStorage.setFlashlightStrobeEnabled(reactContext, enabled)
            promise.resolve(ok)
        } catch (e: Exception) {
            promise.reject("SET_STROBE_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun getAlertSoundSettings(promise: Promise) {
        try {
            val uri = AlertStorage.getCustomSoundUri(reactContext)
            val title = AlertStorage.getCustomSoundTitle(reactContext)
            val map = Arguments.createMap().apply {
                putBoolean("isDefault", uri.isNullOrBlank())
                putString("title", if (uri.isNullOrBlank()) "10RCDG Tactical Klaxon (Default)" else (title ?: "Custom Siren Sound"))
                putString("uri", uri ?: "")
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("GET_SOUND_SETTINGS_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun resetToDefaultAlertSound(promise: Promise) {
        try {
            AlertStorage.setCustomSound(reactContext, null, null)
            val map = Arguments.createMap().apply {
                putBoolean("isDefault", true)
                putString("title", "10RCDG Tactical Klaxon (Default)")
                putString("uri", "")
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("RESET_SOUND_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun previewAlertSound(promise: Promise) {
        try {
            val customUri = AlertStorage.getCustomSoundUri(reactContext)
            TacticalAlarmManager.previewSound(reactContext, customUri)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("PREVIEW_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun pickAudioFile(promise: Promise) {
        val act = reactContext.currentActivity
        if (act == null) {
            promise.reject("NO_ACTIVITY", "Cannot open file picker without an active window.")
            return
        }
        pickAudioPromise = promise
        try {
            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "audio/*"
                putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg", "audio/mp4"))
            }
            act.startActivityForResult(intent, REQUEST_PICK_AUDIO)
        } catch (e: Exception) {
            pickAudioPromise = null
            promise.reject("PICK_AUDIO_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(reactContext)) {
                val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
                    data = Uri.parse("package:${reactContext.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(intent)
                promise.resolve(true)
            } else if (Build.VERSION.SDK_INT >= 34) {
                val intent = Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT).apply {
                    data = Uri.parse("package:${reactContext.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(intent)
                promise.resolve(true)
            } else {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:${reactContext.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(intent)
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("OVERLAY_PERMISSION_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun checkPermissions(promise: Promise) {
        try {
            val hasSms = ContextCompat.checkSelfPermission(
                reactContext,
                android.Manifest.permission.RECEIVE_SMS
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED

            val isBatteryIgnored = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val pm = reactContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
                pm?.isIgnoringBatteryOptimizations(reactContext.packageName) == true
            } else {
                true
            }

            val canDrawOverlays = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Settings.canDrawOverlays(reactContext)
            } else {
                true
            }

            val canFullScreen = if (Build.VERSION.SDK_INT >= 34) {
                val nm = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                nm?.canUseFullScreenIntent() == true
            } else {
                true
            }

            val isFullyArmed = hasSms && isBatteryIgnored && canDrawOverlays && canFullScreen

            val result = Arguments.createMap().apply {
                putBoolean("hasSmsPermission", hasSms)
                putBoolean("isBatteryIgnored", isBatteryIgnored)
                putBoolean("canDrawOverlays", canDrawOverlays)
                putBoolean("canFullScreen", canFullScreen)
                putBoolean("isFullyArmed", isFullyArmed)
                putBoolean("smsRetrieverActive", true)
            }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("CHECK_PERMISSIONS_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun saveSoldierProfile(profileJson: String, promise: Promise) {
        try {
            val ok = AlertStorage.saveSoldierProfile(reactContext, profileJson)
            promise.resolve(ok)
        } catch (e: Exception) {
            promise.reject("SAVE_PROFILE_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun getSoldierProfile(promise: Promise) {
        try {
            val profile = AlertStorage.getSoldierProfile(reactContext)
            promise.resolve(profile)
        } catch (e: Exception) {
            promise.reject("GET_PROFILE_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun clearSoldierProfile(promise: Promise) {
        try {
            val ok = AlertStorage.clearSoldierProfile(reactContext)
            promise.resolve(ok)
        } catch (e: Exception) {
            promise.reject("CLEAR_PROFILE_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun getHardwareDeviceInfo(promise: Promise) {
        try {
            val androidId = Settings.Secure.getString(
                reactContext.contentResolver,
                Settings.Secure.ANDROID_ID
            ) ?: ""
            val map = Arguments.createMap().apply {
                putString("deviceId", if (androidId.isBlank()) "" else "and_$androidId")
                putString("manufacturer", Build.MANUFACTURER ?: "")
                putString("model", Build.MODEL ?: "")
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("DEVICE_INFO_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun getFcmToken(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("com.rescom.alert.prefs", Context.MODE_PRIVATE)
            val cached = prefs.getString("KEY_FCM_TOKEN", "") ?: ""
            if (cached.isNotEmpty()) {
                promise.resolve(cached)
                return
            }

            // If not cached yet, query Firebase directly
            com.google.firebase.messaging.FirebaseMessaging.getInstance().token
                .addOnCompleteListener { task ->
                    if (task.isSuccessful && !task.result.isNullOrEmpty()) {
                        val token = task.result
                        prefs.edit().putString("KEY_FCM_TOKEN", token).apply()
                        promise.resolve(token)
                    } else {
                        promise.resolve("")
                    }
                }
        } catch (e: Exception) {
            promise.resolve("")
        }
    }

    @ReactMethod
    fun startSmsRetriever(promise: Promise) {
        try {
            SmsRetrieverReceiver.startListening(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_RETRIEVER_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun getSmsRetrieverHash(promise: Promise) {
        try {
            val helper = AppSignatureHelper(reactContext)
            val signatures = helper.appSignatures
            val hash = if (signatures.isNotEmpty()) signatures[0] else "7V8UpW3jxbp"
            promise.resolve(hash)
        } catch (e: Exception) {
            promise.resolve("7V8UpW3jxbp")
        }
    }
}
