package com.rescom.alert

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.telephony.SmsManager
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class AlertActivity : Activity() {

    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var senderNumber: String = ""
    private var alertMessage: String = ""
    private var isSilenced: Boolean = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Turn on Screen & Show over Lock Screen
        setupLockScreenFlags()

        senderNumber = intent.getStringExtra("EXTRA_SENDER") ?: "10RCDG Command"
        alertMessage = intent.getStringExtra("EXTRA_MESSAGE") ?: "MANDATORY MUSTER ORDER ISSUED."

        // 2. Save alert locally to SharedPreferences for React Native Tab 1 to display
        saveAlertLocally(alertMessage, senderNumber)

        // 3. Build Tactical Emergency Screen
        setContentView(createTacticalLayout())

        // 4. Sound Emergency Siren (ALARM stream) & Vibrate
        startSirenAndVibration()
    }

    private fun setupLockScreenFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
            keyguardManager?.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                        WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }
    }

    private fun startSirenAndVibration() {
        try {
            // Audio channel: USAGE_ALARM (Plays even if phone is on Silent/Mute)
            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()

            // Try default alarm sound or fallback to notification ringtone
            var alertUri: Uri? = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            if (alertUri == null) {
                alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            }

            if (alertUri != null) {
                mediaPlayer = MediaPlayer().apply {
                    setAudioAttributes(audioAttributes)
                    setDataSource(applicationContext, alertUri)
                    isLooping = true
                    prepare()
                    start()
                }
            }

            // Continuous tactical pulse vibration: wait 0ms, vibrate 800ms, pause 400ms, vibrate 800ms...
            val vibrationPattern = longArrayOf(0, 800, 400, 800, 400, 1000)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vibrator = vibratorManager?.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createWaveform(vibrationPattern, 0)) // 0 = repeat
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(vibrationPattern, 0)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun stopSirenAndVibration() {
        if (isSilenced) return
        isSilenced = true
        try {
            mediaPlayer?.let {
                if (it.isPlaying) {
                    it.stop()
                }
                it.release()
            }
            mediaPlayer = null
            vibrator?.cancel()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun handleAcknowledge() {
        stopSirenAndVibration()

        // Send silent SMS response if sender number is available
        try {
            if (senderNumber.isNotBlank() && senderNumber != "10RCDG Command") {
                val smsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    getSystemService(SmsManager::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    SmsManager.getDefault()
                }
                smsManager.sendTextMessage(senderNumber, null, "ACK - 10RCDG TROOP MOBILIZING", null, null)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        Toast.makeText(this, "Acknowledge Logged. Stand by for muster instructions.", Toast.LENGTH_LONG).show()
        finish()
    }

    private fun saveAlertLocally(message: String, sender: String) {
        val prefs = getSharedPreferences("10RCDG_ALERTS", Context.MODE_PRIVATE)
        val history = prefs.getString("ALERT_HISTORY", "") ?: ""
        val timeFormatted = SimpleDateFormat("MMM dd, yyyy • HH:mm'H'", Locale.getDefault()).format(Date())
        val newEntry = "$timeFormatted|$sender|$message\n$history"
        prefs.edit().putString("ALERT_HISTORY", newEntry.take(5000)).apply()
    }

    private fun createTacticalLayout(): View {
        val rootLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#090D16")) // Deep tactical midnight
            setPadding(dp(20), dp(36), dp(20), dp(24))
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        // 1. Top Alert Badge
        val topBadge = TextView(this).apply {
            text = "🚨 OFFICIAL COMMAND DISPATCH // 10RCDG"
            setTextColor(Color.parseColor("#F59E0B")) // Amber
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setPadding(dp(12), dp(6), dp(12), dp(6))
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#1F180A"))
                setStroke(dp(1), Color.parseColor("#F59E0B"))
                cornerRadius = dp(8).toFloat()
            }
        }
        rootLayout.addView(topBadge)

        // 2. Headline
        val titleView = TextView(this).apply {
            text = "MANDATORY MUSTER ALERT"
            setTextColor(Color.parseColor("#FFFFFF"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 22f)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setPadding(0, dp(16), 0, dp(4))
        }
        rootLayout.addView(titleView)

        // 3. Subtitle / Timestamp
        val timeView = TextView(this).apply {
            val nowStr = SimpleDateFormat("EEEE, MMMM dd, yyyy • HH:mm:ss'H'", Locale.getDefault()).format(Date())
            text = nowStr
            setTextColor(Color.parseColor("#94A3B8"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
            gravity = Gravity.CENTER
        }
        rootLayout.addView(timeView)

        // 4. Card Box for SMS Message Content
        val scrollView = ScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1.0f
            ).apply {
                setMargins(0, dp(20), 0, dp(20))
            }
        }

        val messageCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(18), dp(18), dp(18))
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#131B2E"))
                setStroke(dp(2), Color.parseColor("#DC2626")) // Crimson emergency border
                cornerRadius = dp(16).toFloat()
            }
        }

        val messageHeader = TextView(this).apply {
            text = "DISPATCH FROM: $senderNumber"
            setTextColor(Color.parseColor("#EF4444"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
            typeface = Typeface.DEFAULT_BOLD
        }
        messageCard.addView(messageHeader)

        val messageBody = TextView(this).apply {
            text = alertMessage
            setTextColor(Color.parseColor("#F8FAFC"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            typeface = Typeface.DEFAULT_BOLD
            setPadding(0, dp(10), 0, 0)
            setLineSpacing(dp(4).toFloat(), 1.0f)
        }
        messageCard.addView(messageBody)

        scrollView.addView(messageCard)
        rootLayout.addView(scrollView)

        // 5. Action Buttons (Acknowledge & Silence)
        val btnAcknowledge = Button(this).apply {
            text = "🛡️ ACKNOWLEDGE & REPORT IN"
            setTextColor(Color.parseColor("#FFFFFF"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            typeface = Typeface.DEFAULT_BOLD
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#047857")) // Emerald Green
                cornerRadius = dp(12).toFloat()
            }
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(54)
            )
            setOnClickListener { handleAcknowledge() }
        }
        rootLayout.addView(btnAcknowledge)

        val btnSilence = Button(this).apply {
            text = "MUTE SIREN & DISMISS"
            setTextColor(Color.parseColor("#94A3B8"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            typeface = Typeface.DEFAULT_BOLD
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#1E293B"))
                cornerRadius = dp(12).toFloat()
            }
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(44)
            ).apply {
                setMargins(0, dp(10), 0, 0)
            }
            setOnClickListener {
                stopSirenAndVibration()
                finish()
            }
        }
        rootLayout.addView(btnSilence)

        return rootLayout
    }

    private fun dp(value: Int): Int {
        return (value * resources.displayMetrics.density).toInt()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopSirenAndVibration()
    }
}
