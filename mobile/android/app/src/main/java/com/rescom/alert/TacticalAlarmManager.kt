package com.rescom.alert

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log

object TacticalAlarmManager {

    private const val TAG = "TacticalAlarmManager"
    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var isPlaying = false

    @Synchronized
    fun start(context: Context) {
        if (isPlaying) {
            Log.d(TAG, "Tactical siren is already sounding.")
            return
        }
        isPlaying = true

        try {
            // 1. Audio Channel: USAGE_ALARM (Bypasses Silent/Vibrate/DND)
            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()

            val resId = context.resources.getIdentifier("siren", "raw", context.packageName)
            val alertUri = if (resId != 0) {
                Uri.parse("android.resource://${context.packageName}/$resId")
            } else {
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            }

            if (alertUri != null) {
                mediaPlayer = MediaPlayer().apply {
                    setAudioAttributes(audioAttributes)
                    setDataSource(context.applicationContext, alertUri)
                    isLooping = true
                    prepare()
                    start()
                }
                Log.d(TAG, "Siren audio playback started successfully.")
            }

            // 2. High-intensity repeating tactical vibration
            vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vm?.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            }

            val pattern = longArrayOf(0, 600, 250, 600, 250, 900, 400)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(pattern, 0)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error starting siren audio/vibration: ${e.message}", e)
        }
    }

    @Synchronized
    fun stop() {
        if (!isPlaying) return
        isPlaying = false

        try {
            mediaPlayer?.let {
                if (it.isPlaying) {
                    it.stop()
                }
                it.release()
            }
            mediaPlayer = null

            vibrator?.cancel()
            vibrator = null
            Log.d(TAG, "Siren and vibration silenced.")
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping siren: ${e.message}", e)
        }
    }

    fun isAlarmActive(): Boolean = isPlaying
}
