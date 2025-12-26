package com.altcraft.sdk.rn.providers

//  Created by Andrey Pogodin.
//
//  Copyright © 2025 Altcraft. All rights reserved.

import androidx.annotation.Keep
import com.altcraft.sdk.interfaces.RustoreInterface

/**
 * React Native RuStore token provider implementation.
 *
 * This provider acts as a bridge between the JavaScript side and the native SDK.
 * React Native supplies the RuStore token manually, and the SDK retrieves it
 * through this implementation of [RustoreInterface].
 *
 * Notes:
 * - The token is stored in memory only. It is not persisted and will be lost
 *   when the process is killed.
 */
@Keep
object RnRuStoreProvider : RustoreInterface {

    @Volatile
    private var token: String? = null

    /**
     * Returns the currently stored RuStore token or null.
     */
    override suspend fun getToken(): String? = token

    /**
     * Deletes the current RuStore token and invokes the completion callback.
     */
    override suspend fun deleteToken(complete: (Boolean) -> Unit) {
        token = null
        complete(true)
    }

    /**
     * Sets a new RuStore token.
     */
    fun setToken(newToken: String?) {
        token = newToken
    }

    /**
     * Clears the stored RuStore token.
     */
    fun clear() {
        token = null
    }
}