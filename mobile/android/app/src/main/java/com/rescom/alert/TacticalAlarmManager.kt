package com.rescom.alert

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log

object TacticalAlarmManager {

    private const val TAG = "TacticalAlarmManager"
    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var isPlaying = false

    private var strobeThread: Thread? = null
    @Volatile private var isStrobeRunning = false

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

            var alertUri: Uri? = null

            // Check if user set a custom sound (.wav / .mp3)
            val customUriStr = AlertStorage.getCustomSoundUri(context)
            if (!customUriStr.isNullOrBlank()) {
                try {
                    alertUri = Uri.parse(customUriStr)
                } catch (e: Exception) {
                    Log.w(TAG, "Invalid custom alert sound URI, falling back to default.", e)
                }
            }

            // Fallback: Default 10RCDG official siren raw asset
            val resId = context.resources.getIdentifier("siren", "raw", context.packageName)
            val defaultUri = if (resId != 0) {
                Uri.parse("android.resource://${context.packageName}/$resId")
            } else {
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            }

            val targetUri = alertUri ?: defaultUri

            if (targetUri != null) {
                try {
                    mediaPlayer = MediaPlayer().apply {
                        setAudioAttributes(audioAttributes)
                        setDataSource(context.applicationContext, targetUri)
                        isLooping = true
                        prepare()
                        start()
                    }
                    Log.d(TAG, "Siren audio playback started successfully.")
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to play custom URI, attempting default fallback: ${e.message}")
                    // If custom file moved/deleted, seamlessly fallback to default!
                    if (defaultUri != null && defaultUri != targetUri) {
                        try {
                            mediaPlayer = MediaPlayer().apply {
                                setAudioAttributes(audioAttributes)
                                setDataSource(context.applicationContext, defaultUri)
                                isLooping = true
                                prepare()
                                start()
                            }
                            Log.d(TAG, "Fallback siren playback started.")
                        } catch (e2: Exception) {
                            Log.e(TAG, "Fallback siren also failed: ${e2.message}")
                        }
                    }
                }
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

            // 3. Strobe Flashlight on Camera Torch (Zero camera permissions needed)
            startStrobe(context)

        } catch (e: Exception) {
            Log.e(TAG, "Error starting siren audio/vibration: ${e.message}", e)
        }
    }

    private fun startStrobe(context: Context) {
        if (!AlertStorage.isFlashlightStrobeEnabled(context)) return
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return

        try {
            val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager ?: return
            val cameraId = cameraManager.cameraIdList.firstOrNull { id ->
                val characteristics = cameraManager.getCameraCharacteristics(id)
                characteristics.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
            } ?: return

            isStrobeRunning = true
            strobeThread = Thread {
                var torchOn = false
                var elapsedMs = 0L
                val maxDurationMs = 45_000L // 45 seconds max safety timeout to protect battery

                try {
                    while (isStrobeRunning && elapsedMs < maxDurationMs) {
                        torchOn = !torchOn
                        cameraManager.setTorchMode(cameraId, torchOn)
                        Thread.sleep(250)
                        elapsedMs += 250
                    }
                } catch (e: Exception) {
                    Log.d(TAG, "Flashlight strobe interrupted: ${e.message}")
                } finally {
                    try {
                        cameraManager.setTorchMode(cameraId, false)
                    } catch (e: Exception) {}
                }
            }.apply {
                isDaemon = true
                start()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start flashlight strobe: ${e.message}")
        }
    }

    private fun stopStrobe(context: Context) {
        isStrobeRunning = false
        strobeThread?.interrupt()
        strobeThread = null

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager
                cameraManager?.cameraIdList?.forEach { id ->
                    try {
                        cameraManager.setTorchMode(id, false)
                    } catch (e: Exception) {}
                }
            } catch (e: Exception) {}
        }
    }

    @Synchronized
    fun stop(context: Context? = null) {
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

            if (context != null) {
                stopStrobe(context)
            } else {
                isStrobeRunning = false
                strobeThread?.interrupt()
                strobeThread = null
            }

            Log.d(TAG, "Siren, vibration, and flashlight silenced.")
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping siren: ${e.message}", e)
        }
    }

    /**
     * Preview sound for 3.5 seconds to test volume and tone
     */
    @Synchronized
    fun previewSound(context: Context, customUriStr: String? = null, onFinished: (() -> Unit)? = null) {
        try {
            stop(context)
            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()

            val uri = if (!customUriStr.isNullOrBlank()) {
                Uri.parse(customUriStr)
            } else {
                val resId = context.resources.getIdentifier("siren", "raw", context.packageName)
                if (resId != 0) {
                    Uri.parse("android.resource://${context.packageName}/$resId")
                } else {
                    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                }
            }

            if (uri != null) {
                val previewPlayer = MediaPlayer().apply {
                    setAudioAttributes(audioAttributes)
                    setDataSource(context.applicationContext, uri)
                    prepare()
                    start()
                }

                Handler(Looper.getMainLooper()).postDelayed({
                    try {
                        if (previewPlayer.isPlaying) previewPlayer.stop()
                        previewPlayer.release()
                    } catch (e: Exception) {}
                    onFinished?.invoke()
                }, 3500)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error previewing sound: ${e.message}")
            onFinished?.invoke()
        }
    }

    fun isAlarmActive(): Boolean = isPlaying
}
