package com.altcraft.sdk.core.rn

import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType

/** Puts Int or null into WritableMap. */
fun WritableMap.putNullableInt(key: String, value: Int?) {
    if (value != null) putInt(key, value) else putNull(key)
 }

/** Puts Double or null into WritableMap. */
fun WritableMap.putNullableDouble(key: String, value: Double?) {
     if (value != null) putDouble(key, value) else putNull(key)
    }

/** Puts Boolean or null into WritableMap. */
fun WritableMap.putNullableBoolean(key: String, value: Boolean?) {
     if (value != null) putBoolean(key, value) else putNull(key)
    }

/** Puts String or null into WritableMap. */
fun WritableMap.putNullableString(key: String, value: String?) {
    if (value != null) putString(key, value) else putNull(key)
}

/** Puts nested map or null into WritableMap. */
fun WritableMap.putNullableMap(key: String, value: WritableMap?) {
    if (value != null) putMap(key, value) else putNull(key)
}

/** Returns true if key exists and is not null. */
fun ReadableMap.hasNonNullKey(key: String): Boolean {
    return hasKey(key) && !isNull(key)
}

/** Returns String value or null if missing/null. */
fun ReadableMap.getStringOrNull(key: String): String? {
    return if (hasNonNullKey(key)) getString(key) else null
 }

/** Returns Boolean value or null if missing/null. */
fun ReadableMap.getBooleanOrNull(key: String): Boolean? {
    return if (hasNonNullKey(key)) getBoolean(key) else null
}

/** Returns Int value or null if missing/null/not a number. */
fun ReadableMap.getIntOrNull(key: String): Int? {
    if (!hasNonNullKey(key)) return null
    return if (getType(key) == ReadableType.Number) getInt(key) else null
}

/** Returns nested map or null if missing/null. */
fun ReadableMap.getMapOrNull(key: String): ReadableMap? {
     return if (hasNonNullKey(key)) getMap(key) else null
     }

/** Returns array or null if missing/null. */
fun ReadableMap.getArrayOrNull(key: String): ReadableArray? {
    return if (hasNonNullKey(key)) getArray(key) else null
}

/** Converts ReadableArray of strings to Kotlin List<String> (skips nulls/non-strings). */
fun ReadableArray.toStringList(): List<String> {
    val result = ArrayList<String>(size())
    for (i in 0 until size()) {
        if (!isNull(i)) {
            val v = getString(i)
            if (v != null) result.add(v)
        }
    }
    return result
}