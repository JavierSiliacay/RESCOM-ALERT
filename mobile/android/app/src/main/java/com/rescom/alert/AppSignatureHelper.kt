package com.rescom.alert

import android.content.Context
import android.content.ContextWrapper
import android.content.pm.PackageManager
import android.content.pm.Signature
import android.os.Build
import android.util.Base64
import android.util.Log
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.security.NoSuchAlgorithmException
import java.util.Arrays

/**
 * Official Google AppSignatureHelper for SMS Retriever API.
 * Computes the 11-character hash code derived from the app's package name and signing key.
 */
class AppSignatureHelper(context: Context) : ContextWrapper(context) {

    companion object {
        val TAG = "AppSignatureHelper"
        private const val HASH_TYPE = "SHA-256"
        const val NUM_HASHED_BYTES = 9
        const val NUM_BASE64_CHAR = 11
    }

    /**
     * Get all the app signatures for current package
     */
    val appSignatures: ArrayList<String>
        get() {
            val appCodes = ArrayList<String>()

            try {
                // Get all package signatures for the current package
                val packageName = packageName
                val packageManager = packageManager
                val signatures: Array<Signature>? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    val packageInfo = packageManager.getPackageInfo(
                        packageName,
                        PackageManager.GET_SIGNING_CERTIFICATES
                    )
                    packageInfo.signingInfo?.apkContentsSigners
                } else {
                    @Suppress("DEPRECATION")
                    val packageInfo = packageManager.getPackageInfo(
                        packageName,
                        PackageManager.GET_SIGNATURES
                    )
                    @Suppress("DEPRECATION")
                    packageInfo.signatures
                }

                if (signatures != null) {
                    for (sig in signatures) {
                        val hash = hash(packageName, sig.toCharsString())
                        if (hash != null) {
                            appCodes.add(hash)
                            Log.d(TAG, "Official 10RCDG SMS Retriever Hash: $hash")
                        }
                    }
                }
            } catch (e: PackageManager.NameNotFoundException) {
                Log.e(TAG, "Unable to find package to obtain hash.", e)
            }

            return appCodes
        }

    private fun hash(packageName: String, signature: String): String? {
        val appInfo = "$packageName $signature"
        try {
            val messageDigest = MessageDigest.getInstance(HASH_TYPE)
            messageDigest.update(appInfo.toByteArray(StandardCharsets.UTF_8))
            var hashSignature = messageDigest.digest()

            // Truncated into NUM_HASHED_BYTES (9 bytes)
            hashSignature = Arrays.copyOfRange(hashSignature, 0, NUM_HASHED_BYTES)
            // Encode into base64
            var base64Hash = Base64.encodeToString(hashSignature, Base64.NO_PADDING or Base64.NO_WRAP)
            base64Hash = base64Hash.substring(0, NUM_BASE64_CHAR)

            return base64Hash
        } catch (e: NoSuchAlgorithmException) {
            Log.e(TAG, "hash:NoSuchAlgorithm", e)
        }
        return null
    }
}
