package com.rescom.alert

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class TacticalBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            
            val profile = AlertStorage.getSoldierProfile(context)
            if (!profile.isNullOrBlank()) {
                // If soldier was paired, automatically re-arm the background tracking service on reboot
                TacticalLocationService.startService(context, emergency = false)
            }
        }
    }
}
