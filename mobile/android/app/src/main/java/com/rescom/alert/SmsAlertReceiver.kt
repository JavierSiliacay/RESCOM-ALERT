package com.rescom.alert

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.provider.Telephony
import android.telephony.SmsMessage
import android.util.Log
import androidx.core.app.NotificationCompat

class SmsAlertReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "10RCDG_SMS_RECEIVER"
        private const val CHANNEL_ID = "10RCDG_EMERGENCY_ALERTS"
        private const val NOTIFICATION_ID = 10001
        const val ALERT_PREFIX = "[10RCDG"
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

            // Strictly require official "10RCDG" identifier in message body
            val hasOfficialTag = fullMessage.contains("10RCDG", ignoreCase = true)
            if (!hasOfficialTag) {
                Log.d(TAG, "Ignored SMS: does not contain official 10RCDG identifier.")
                return
            }

            Log.w(TAG, "OFFICIAL 10RCDG EMERGENCY BROADCAST DETECTED! Triggering Full-Screen Alarm...")
            // Immediately persist to local storage so it displays in React Native history
            AlertStorage.saveAlert(context, sender, fullMessage)
            launchAlertActivity(context, sender, fullMessage)
        } catch (e: Exception) {
            Log.e(TAG, "Error processing incoming SMS alert: ${e.message}", e)
        }
    }

    private fun launchAlertActivity(context: Context, sender: String, message: String) {
        // 1. Immediately fire dedicated siren audio & vibration (never delay sound)
        TacticalAlarmManager.start(context)

        // 2. Acquire WakeLock to turn on CPU & screen immediately
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val wakeLock = powerManager?.newWakeLock(
            PowerManager.FULL_WAKE_LOCK or
                    PowerManager.ACQUIRE_CAUSES_WAKEUP or
                    PowerManager.ON_AFTER_RELEASE,
            "10RCDG:SmsAlertWakeLock"
        )
        wakeLock?.acquire(30000) // 30 seconds wake lock

        // 3. Prepare AlertActivity Intent
        val alertIntent = Intent(context, AlertActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("EXTRA_SENDER", sender)
            putExtra("EXTRA_MESSAGE", message)
            putExtra("EXTRA_TIMESTAMP", System.currentTimeMillis())
        }

        // 4. Create Notification Channel on Android 8.0+
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && notificationManager != null) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "10RCDG Emergency Siren Alarms",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Tactical emergency siren notifications"
                setBypassDnd(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                enableVibration(true)
            }
            notificationManager.createNotificationChannel(channel)
        }

        // 5. Build Full-Screen Intent (Required on Android 10+ to launch activity over lockscreen from background)
        val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            context,
            System.currentTimeMillis().toInt(),
            alertIntent,
            pendingIntentFlags
        )

        // 6. Schedule AlarmClockInfo to force Android OS to execute as an official Alarm Clock (bypasses background activity blocks)
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && alarmManager != null) {
                val alarmClockInfo = AlarmManager.AlarmClockInfo(System.currentTimeMillis(), fullScreenPendingIntent)
                alarmManager.setAlarmClock(alarmClockInfo, fullScreenPendingIntent)
            }
        } catch (e: Exception) {
            Log.w(TAG, "AlarmManager setAlarmClock: ${e.message}")
        }

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("🚨 10RCDG EMERGENCY ORDER")
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setAutoCancel(true)
            .build()

        notificationManager?.notify(NOTIFICATION_ID, notification)

        // 7. Direct startActivity attempt (instant popup if screen is already on or OEM permits it)
        try {
            context.startActivity(alertIntent)
        } catch (e: Exception) {
            Log.w(TAG, "Direct startActivity blocked by background restriction, fullScreenIntent/AlarmClock will handle it: ${e.message}")
        }
    }
}
