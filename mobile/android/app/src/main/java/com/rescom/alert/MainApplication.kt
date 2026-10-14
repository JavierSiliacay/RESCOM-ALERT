package com.rescom.alert

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(AlertBridgePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()

    // 1. Global crash protection to log uncaught errors instead of silently dying
    val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
      android.util.Log.e("RESCOM_CRASH", "FATAL UNCAUGHT EXCEPTION on thread ${thread.name}: ${throwable.message}", throwable)
      try {
        val file = java.io.File(getExternalFilesDir(null), "rescom_crash.txt")
        file.writeText("CRASH: ${throwable.stackTraceToString()}\n")
      } catch (_: Exception) {}
      defaultHandler?.uncaughtException(thread, throwable)
    }

    // 2. React Native load
    try {
      loadReactNative(this)
    } catch (e: Exception) {
      android.util.Log.e("MainApplication", "Error during loadReactNative: ${e.message}", e)
    }

    // 4. Layer 2 SMS Retriever listener
    try {
      SmsRetrieverReceiver.startListening(this)
    } catch (e: Exception) {
      android.util.Log.e("MainApplication", "Error starting SmsRetriever: ${e.message}", e)
    }
  }
}
