package com.altcraft.sdk.rn.providers

//  Created by Andrey Pogodin.
//
//  Copyright © 2025 Altcraft. All rights reserved.

import android.content.Context
import androidx.annotation.Keep
import com.altcraft.sdk.interfaces.HMSInterface

@Keep
object RnHMSProvider : HMSInterface {

    @Volatile
    private var token: String? = null

    override suspend fun getToken(context: Context): String? = token


    override suspend fun deleteToken(context: Context, complete: (Boolean) -> Unit) {
        token = null
        complete(true)
    }

    fun setToken(newToken: String?) {
        token = newToken
    }

    fun clear() {
        token = null
    }
}
