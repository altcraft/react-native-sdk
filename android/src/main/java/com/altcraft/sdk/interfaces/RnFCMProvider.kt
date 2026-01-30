package com.altcraft.sdk.rn.providers

import androidx.annotation.Keep
import com.altcraft.sdk.interfaces.FCMInterface


@Keep
object RnFCMProvider : FCMInterface {
    @Volatile
    private var token: String? = null

    override suspend fun getToken(): String? = token

    override suspend fun deleteToken(completion: (Boolean) -> Unit) {
        token = null
        completion(true)
    }

    fun setToken(newToken: String?) {
        token = newToken
    }

    fun clear() {
        token = null
    }
}