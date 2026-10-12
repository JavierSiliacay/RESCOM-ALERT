package com.rescom.alert

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.PowerManager
import android.util.Log
import com.google.android.gms.auth.api.phone.SmsRetriever
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Status

/**
 * Layer 2 Zero-Permission SMS Receiver using Google Play Services SMS Retriever API.
 * Bypasses Android 13, 14, 15, and 16 "Restricted Settings" completely.
 * Requires ZERO runtime permissions (no RECEIVE_SMS or READ_SMS needed).
 */
class SmsRetrieverReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "10RCDG_SMS_RETRIEVER"

        /**
         * Arms the SMS Retriever listener. Auto-called on app startup,
         * resume, boot, and after every 5-minute timeout window.
         */
        fun startListening(context: Context) {
            try {
                val client = SmsRetriever.getClient(context)
                val task = client.startSmsRetriever()
                task.addOnSuccessListener {
                    Log.d(TAG, "Layer 2 Zero-Permission SMS Retriever armed & listening.")
                }
                task.addOnFailureListener { e ->
                    Log.w(TAG, "Failed to arm SMS Retriever: ${e.message}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error starting SMS Retriever: ${e.message}", e)
            }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (SmsRetriever.SMS_RETRIEVED_ACTION != intent.action) {
            return
        }

        val extras = intent.extras ?: return
        val status = extras.get(SmsRetriever.EXTRA_STATUS) as? Status ?: return

        when (status.statusCode) {
            CommonStatusCodes.SUCCESS -> {
                // Get the emergency message body
                val message = extras.getString(SmsRetriever.EXTRA_SMS_MESSAGE) ?: ""
                Log.w(TAG, "OFFICIAL 10RCDG RETRIEVER SMS RECEIVED: $message")

                // Verify official 10RCDG emergency identifier
                if (message.contains("10RCDG", ignoreCase = true)) {
                    val sender = "10RCDG Command Gateway"
                    AlertStorage.saveAlert(context, sender, message)
                    launchEmergencySiren(context, sender, message)
                }

                // Immediately re-arm for subsequent dispatches
                startListening(context)
            }

            CommonStatusCodes.TIMEOUT -> {
                // 5-minute window expired without an alert; silently re-arm listener
                Log.d(TAG, "Retriever 5-min window refreshed. Re-arming listener...")
                startListening(context)
            }

            else -> {
                Log.d(TAG, "SMS Retriever event: ${status.statusMessage ?: status.statusCode}")
                startListening(context)
            }
        }
    }

    private fun launchEmergencySiren(context: Context, sender: String, message: String) {
        try {
            // 1. Immediately sound dedicated siren audio & vibration (never delay sound)
            TacticalAlarmManager.start(context)

            // 2. Wake device screen & CPU from deep sleep (Doze mode)
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            val wakeLock = powerManager?.newWakeLock(
                PowerManager.FULL_WAKE_LOCK or
                        PowerManager.ACQUIRE_CAUSES_WAKEUP or
                        PowerManager.ON_AFTER_RELEASE,
                "10RCDG:RetrieverWakeLock"
            )
            wakeLock?.acquire(30000) // 30 seconds wake lock

            // 3. Launch full-screen AlertActivity over lock screen
            val alertIntent = Intent(context, AlertActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("EXTRA_SENDER", sender)
                putExtra("EXTRA_MESSAGE", message)
                putExtra("EXTRA_TIMESTAMP", System.currentTimeMillis())
            }
            context.startActivity(alertIntent)
            Log.w(TAG, "Successfully triggered Full-Screen Emergency Siren via Layer 2 Retriever!")
        } catch (e: Exception) {
            Log.e(TAG, "Error launching emergency siren from retriever: ${e.message}", e)
        }
    }
}
