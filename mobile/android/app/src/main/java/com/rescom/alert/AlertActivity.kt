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
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class AlertActivity : Activity() {

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
        }
        @Suppress("DEPRECATION")
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        )

        // Force CPU & Screen to stay awake and full brightness
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as? android.os.PowerManager
            val wakeLock = pm?.newWakeLock(
                android.os.PowerManager.SCREEN_BRIGHT_WAKE_LOCK or
                        android.os.PowerManager.ACQUIRE_CAUSES_WAKEUP or
                        android.os.PowerManager.ON_AFTER_RELEASE,
                "10RCDG:AlertActivityWake"
            )
            wakeLock?.acquire(20000)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Light status bar with dark icons for minimal clean aesthetic
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
            window.statusBarColor = Color.parseColor("#F8FAFC")
        }
    }

    private fun startSirenAndVibration() {
        TacticalAlarmManager.start(this)
    }

    private fun stopSirenAndVibration() {
        if (isSilenced) return
        isSilenced = true
        TacticalAlarmManager.stop()
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? android.app.NotificationManager
        nm?.cancel(10001)
    }

    private fun handleAcknowledge() {
        stopSirenAndVibration()
        val toastMsg = if (senderNumber == "[SYSTEM TEST]") "Siren Test Completed." else "Order Acknowledged."
        Toast.makeText(this, toastMsg, Toast.LENGTH_SHORT).show()
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
            setBackgroundColor(Color.parseColor("#F8FAFC")) // Clean slate-50 background
            setPadding(dp(20), dp(36), dp(20), dp(24))
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        // 1. Top Minimal Emergency Badge
        val topBadge = TextView(this).apply {
            text = "🚨  10RCDG EMERGENCY ALERT"
            setTextColor(Color.parseColor("#DC2626")) // Red-600
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setPadding(dp(14), dp(6), dp(14), dp(6))
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#FEF2F2")) // Red-50
                setStroke(dp(1), Color.parseColor("#FECACA")) // Red-200
                cornerRadius = dp(20).toFloat()
            }
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.CENTER_HORIZONTAL
                setMargins(0, 0, 0, dp(14))
            }
        }
        rootLayout.addView(topBadge)

        // 2. Circular Emblem Logo (rescom-emblem.jpg)
        val logoContainer = FrameLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(dp(84), dp(84)).apply {
                gravity = Gravity.CENTER_HORIZONTAL
                setMargins(0, 0, 0, dp(12))
            }
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.WHITE)
                setStroke(dp(2), Color.parseColor("#E2E8F0")) // Slate-200 border
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                clipToOutline = true
                elevation = dp(3).toFloat()
            }
        }
        val logoView = ImageView(this).apply {
            val resId = resources.getIdentifier("rescom_emblem", "drawable", packageName)
            if (resId != 0) {
                setImageResource(resId)
            }
            scaleType = ImageView.ScaleType.CENTER_CROP
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }
        logoContainer.addView(logoView)
        rootLayout.addView(logoContainer)

        // 3. Organization Header & Title
        val titleView = TextView(this).apply {
            text = "10RCDG RESCOM, PA"
            setTextColor(Color.parseColor("#0F172A")) // Slate-900
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }
        rootLayout.addView(titleView)

        // 4. Timestamp
        val timeView = TextView(this).apply {
            val nowStr = SimpleDateFormat("EEEE, MMMM dd, yyyy • HH:mm'H'", Locale.getDefault()).format(Date())
            text = nowStr
            setTextColor(Color.parseColor("#64748B")) // Slate-500
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            gravity = Gravity.CENTER
            setPadding(0, dp(2), 0, dp(16))
        }
        rootLayout.addView(timeView)

        // 5. Clean, Minimal White Card Box for SMS Order Content
        val scrollView = ScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1.0f
            ).apply {
                setMargins(0, 0, 0, dp(16))
            }
        }

        val messageCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(18), dp(18), dp(18))
            background = GradientDrawable().apply {
                setColor(Color.WHITE)
                setStroke(dp(1), Color.parseColor("#E2E8F0")) // Slate-200
                cornerRadius = dp(16).toFloat()
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                elevation = dp(2).toFloat()
            }
        }

        val messageHeader = TextView(this).apply {
            text = "DISPATCH FROM: $senderNumber"
            setTextColor(Color.parseColor("#047857")) // Emerald-700
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
            typeface = Typeface.DEFAULT_BOLD
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                letterSpacing = 0.05f
            }
        }
        messageCard.addView(messageHeader)

        val messageBody = TextView(this).apply {
            text = alertMessage
            setTextColor(Color.parseColor("#0F172A")) // Slate-900
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            typeface = Typeface.DEFAULT_BOLD
            setPadding(0, dp(10), 0, 0)
            setLineSpacing(dp(4).toFloat(), 1.0f)
        }
        messageCard.addView(messageBody)

        scrollView.addView(messageCard)
        rootLayout.addView(scrollView)

        // 6. Action Buttons
        val btnAcknowledge = Button(this).apply {
            text = "✓ I RECEIVED THIS ORDER"
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            typeface = Typeface.DEFAULT_BOLD
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#047857")) // Emerald-700
                cornerRadius = dp(12).toFloat()
            }
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(52)
            )
            setOnClickListener { handleAcknowledge() }
        }
        rootLayout.addView(btnAcknowledge)

        val btnSilence = Button(this).apply {
            text = "Mute Siren & Dismiss"
            setTextColor(Color.parseColor("#475569")) // Slate-600
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            typeface = Typeface.DEFAULT_BOLD
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#F1F5F9")) // Slate-100
                setStroke(dp(1), Color.parseColor("#CBD5E1")) // Slate-300
                cornerRadius = dp(12).toFloat()
            }
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(46)
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
