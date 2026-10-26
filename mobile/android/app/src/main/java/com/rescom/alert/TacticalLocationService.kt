package com.rescom.alert

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

class TacticalLocationService : Service() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback

    private var lastReportedLat: Double? = null
    private var lastReportedLng: Double? = null
    private var lastReportedTimestamp: Long = 0L

    companion object {
        const val CHANNEL_ID = "10RCDG_TACTICAL_LOCATION_CHANNEL"
        const val NOTIFICATION_ID = 10091
        const val ACTION_START = "ACTION_START_TRACKING"
        const val ACTION_STOP = "ACTION_STOP_TRACKING"
        const val ACTION_SET_EMERGENCY = "ACTION_SET_EMERGENCY"

        private const val INGEST_URL = "https://rescom-location-ingest.siliacay-javier.workers.dev"
        private const val INGEST_FALLBACK_URL = "https://rescom-alert.site/api/mobile/location"
        private const val DISPLACEMENT_METERS_NORMAL = 100f
        private const val DISPLACEMENT_METERS_EMERGENCY = 20f
        private const val HEARTBEAT_INTERVAL_MS = 15 * 60 * 1000L // 15 minutes

        private var isEmergencyMode = false

        fun startService(context: Context, emergency: Boolean = false) {
            val intent = Intent(context, TacticalLocationService::class.java).apply {
                action = if (emergency) ACTION_SET_EMERGENCY else ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, TacticalLocationService::class.java).apply {
                action = ACTION_STOP
            }
            context.stopService(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                for (location in result.locations) {
                    handleLocationUpdate(location)
                }
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopTracking()
            stopForeground(true)
            stopSelf()
            return START_NOT_STICKY
        }

        if (intent?.action == ACTION_SET_EMERGENCY) {
            isEmergencyMode = true
        }

        startForeground(NOTIFICATION_ID, buildForegroundNotification())
        startLocationUpdates()
        return START_STICKY
    }

    private fun startLocationUpdates() {
        try {
            val minDisplacement = if (isEmergencyMode) DISPLACEMENT_METERS_EMERGENCY else DISPLACEMENT_METERS_NORMAL
            val interval = if (isEmergencyMode) 10000L else 60000L // Check every 60s for displacement

            val locationRequest = LocationRequest.Builder(
                Priority.PRIORITY_BALANCED_POWER_ACCURACY,
                interval
            ).apply {
                setMinUpdateDistanceMeters(minDisplacement)
                setMinUpdateIntervalMillis(15000L)
            }.build()

            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
        } catch (e: SecurityException) {
            android.util.Log.e("TacticalLocationService", "Permission not granted: ${e.message}")
        } catch (e: Exception) {
            android.util.Log.e("TacticalLocationService", "Failed to start location updates: ${e.message}")
        }
    }

    private fun stopTracking() {
        try {
            fusedLocationClient.removeLocationUpdates(locationCallback)
        } catch (_: Exception) {}
    }

    private fun handleLocationUpdate(location: Location) {
        val now = System.currentTimeMillis()
        val lat = location.latitude
        val lng = location.longitude

        val soldierProfileJson = AlertStorage.getSoldierProfile(this)
        if (soldierProfileJson.isNullOrBlank()) {
            return // Not paired yet
        }

        val soldierId = try {
            val json = JSONObject(soldierProfileJson)
            json.optString("id").ifBlank { json.optString("_id") }
        } catch (_: Exception) {
            null
        }

        if (soldierId.isNullOrBlank()) return

        var shouldSend = false
        if (lastReportedLat == null || isEmergencyMode) {
            shouldSend = true
        } else {
            val distance = calculateDistanceMeters(lastReportedLat!!, lastReportedLng!!, lat, lng)
            val elapsed = now - lastReportedTimestamp
            if (distance >= DISPLACEMENT_METERS_NORMAL || elapsed >= HEARTBEAT_INTERVAL_MS) {
                shouldSend = true
            }
        }

        if (shouldSend) {
            sendLocationToCloudflare(soldierId, lat, lng, location.accuracy.toDouble())
            lastReportedLat = lat
            lastReportedLng = lng
            lastReportedTimestamp = now
        }
    }

    private fun sendLocationToCloudflare(soldierId: String, lat: Double, lng: Double, accuracy: Double) {
        Thread {
            try {
                val url = URL(INGEST_URL)
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.setRequestProperty("Accept", "application/json")
                conn.setRequestProperty("X-Rescom-Client", "mobile-native")
                conn.connectTimeout = 10000
                conn.readTimeout = 10000
                conn.doOutput = true

                val payload = JSONObject().apply {
                    put("soldierId", soldierId)
                    put("latitude", lat)
                    put("longitude", lng)
                    put("accuracy", accuracy)
                    put("isEmergency", isEmergencyMode)
                }

                OutputStreamWriter(conn.outputStream).use { writer ->
                    writer.write(payload.toString())
                    writer.flush()
                }

                val responseCode = conn.responseCode
                conn.disconnect()
            } catch (e: Exception) {
                // Silent fail on network drop
            }
        }.start()
    }

    private fun calculateDistanceMeters(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val r = 6371e3
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLon / 2) * sin(dLon / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return r * c
    }

    private fun buildForegroundNotification(): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("10RCDG RESCOM Duty Active")
            .setContentText("Tactical location monitoring operational (100m filter)")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "10RCDG Tactical Duty Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps soldier location in sync with command center"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        stopTracking()
        super.onDestroy()
    }
}
