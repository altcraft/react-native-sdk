    package com.altcraft.sdk.rn.providers

    import androidx.annotation.Keep
    import com.altcraft.sdk.interfaces.JWTInterface

    @Keep
    object RnJWTProvider : JWTInterface {

        @Volatile
        private var jwt: String? = null
        
        override fun getJWT(): String? = jwt

        fun setToken(newToken: String?) {
            jwt = newToken
        }
        
        fun clear() {
            jwt = null
        }
    }
