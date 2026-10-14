package com.rescom.alert

import android.app.ActivityOptions
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * 10RCDG Native Firebase Cloud Messaging Receiver
 * Intercepts incoming cloud push notifications with High Priority / Urgent alert payloads.
 * Triggers full-screen lock screen siren activity and persists alert to local history.
 */
class FcmAlertReceiverService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "10RCDG_FCM_RECEIVER"
        private const val CHANNEL_ID = "10RCDG_EMERGENCY_PUSH_CHANNEL"
        private const val NOTIFICATION_ID = 20002
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "New FCM Registration Token generated: $token")
        // Stored in native preferences so React Native can link it to Convex
        val prefs = getSharedPreferences("com.rescom.alert.prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("KEY_FCM_TOKEN", token).apply()
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.w(TAG, "Received FCM Push Message from: ${remoteMessage.from}")

        try {
            val data = remoteMessage.data
            val sender = data["sender"] ?: remoteMessage.notification?.title ?: "10RCDG HQ Push"
            val message = data["message"] ?: remoteMessage.notification?.body ?: "EMERGENCY BROADCAST FROM 10RCDG HEADQUARTERS"

            Log.w(TAG, "CRITICAL EMERGENCY PUSH DETECTED! Sender: $sender, Msg: $message")

            // 1. Immediately persist to device storage for history
            AlertStorage.saveAlert(applicationContext, sender, message)

            // 2. Launch full-screen alert & play siren
            launchAlertActivity(applicationContext, sender, message)
        } catch (e: Exception) {
            Log.e(TAG, "Error handling FCM message: ${e.message}", e)
        }
    }

    private fun launchAlertActivity(context: Context, sender: String, message: String) {
        try {
            val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            val wakeLock = pm?.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
                "10RCDG:FcmAlertWakeLock"
            )
            wakeLock?.acquire(20000)

            val fullScreenIntent = Intent(context, AlertActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                putExtra("EXTRA_SENDER", sender)
                putExtra("EXTRA_MESSAGE", message)
                putExtra("EXTRA_TIMESTAMP", System.currentTimeMillis())
            }

            // Attempt direct activity launch
            context.startActivity(fullScreenIntent)

            // High-priority full-screen intent notification fallback
            showFullScreenNotification(context, fullScreenIntent, sender, message)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch AlertActivity from FCM: ${e.message}", e)
        }
    }

    private fun showFullScreenNotification(
        context: Context,
        fullScreenIntent: Intent,
        sender: String,
        message: String
    ) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "10RCDG Emergency Cloud Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "High-priority push channel for emergency orders and sirens"
                enableVibration(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setBypassDnd(true)
            }
            nm.createNotificationChannel(channel)
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            NOTIFICATION_ID,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("🚨 $sender")
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(pendingIntent, true)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setOngoing(true)
            .build()

        nm.notify(NOTIFICATION_ID, notification)
    }
}
