package com.rescom.alert

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.provider.Telephony
import android.telephony.SmsMessage
import android.util.Log

class SmsAlertReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "10RCDG_SMS_RECEIVER"
        const val ALERT_PREFIX = "[10RCDG"
        const val RED_ALERT_KEYWORD = "RED ALERT"
        const val MUSTER_KEYWORD = "MUSTER"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            return
        }

        try {
            val messages: Array<SmsMessage> = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            val fullBodyBuilder = StringBuilder()
            var sender = "10RCDG Gateway"

            for (sms in messages) {
                fullBodyBuilder.append(sms.messageBody)
                sms.originatingAddress?.let { sender = it }
            }

            val fullMessage = fullBodyBuilder.toString()
            Log.d(TAG, "Received SMS from: $sender - Body: $fullMessage")

            // Check if this is an official 10RCDG Tactical Broadcast
            val isOfficialAlert = fullMessage.contains(ALERT_PREFIX, ignoreCase = true) ||
                    fullMessage.contains(RED_ALERT_KEYWORD, ignoreCase = true) ||
                    fullMessage.contains(MUSTER_KEYWORD, ignoreCase = true)

            if (isOfficialAlert) {
                Log.w(TAG, "OFFICIAL 10RCDG EMERGENCY BROADCAST DETECTED! Triggering Full-Screen Alarm...")
                launchAlertActivity(context, sender, fullMessage)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error processing incoming SMS alert: ${e.message}", e)
        }
    }

    private fun launchAlertActivity(context: Context, sender: String, message: String) {
        // 1. Acquire WakeLock to turn on CPU & screen immediately
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val wakeLock = powerManager?.newWakeLock(
            PowerManager.FULL_WAKE_LOCK or
                    PowerManager.ACQUIRE_CAUSES_WAKEUP or
                    PowerManager.ON_AFTER_RELEASE,
            "10RCDG:SmsAlertWakeLock"
        )
        wakeLock?.acquire(10000) // 10 seconds wake lock

        // 2. Launch Full-Screen Alert Activity over lock screen
        val alertIntent = Intent(context, AlertActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("EXTRA_SENDER", sender)
            putExtra("EXTRA_MESSAGE", message)
            putExtra("EXTRA_TIMESTAMP", System.currentTimeMillis())
        }

        context.startActivity(alertIntent)
    }
}
