package com.altcraft.sdk.core.utilities

//  Created by Andrey Pogodin.
//
//  Copyright © 2025 Altcraft. All rights reserved.

import com.altcraft.sdk.data.models.CoreModels.ProfileModel.CategoryData
import com.altcraft.sdk.data.models.CoreModels.ProfileModel.ProfileData
import com.altcraft.sdk.data.models.CoreModels.ProfileModel.SubscriptionData
import com.altcraft.sdk.data.models.CoreModels.ResponseModel.ResponseWithHttpCode
import com.altcraft.sdk.data.models.CoreModels.ResponseModel.ResponseWithProfile
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject

/** RN bridge converters for the modular Altcraft SDK. */
object Converter {

    private val jsonKx = Json { ignoreUnknownKeys = true }

    // ---------------- RN -> Kotlin ----------------

    /** ReadableMap? -> Map<String, Any?>?  (RN object -> Kotlin map) */
    fun toKotlinMap(map: ReadableMap?): Map<String, Any?>? {
        if (map == null) return null
        val result = LinkedHashMap<String, Any?>()
        val it = map.keySetIterator()
        while (it.hasNextKey()) {
            val key = it.nextKey()
            result[key] = readMapValue(map, key)
        }
        return result
    }

    /** ReadableArray? -> List<Any?>?  (RN array -> Kotlin list) */
    fun toKotlinList(array: ReadableArray?): List<Any?>? {
        if (array == null) return null
        val result = ArrayList<Any?>(array.size())
        for (i in 0 until array.size()) {
            result.add(readArrayValue(array, i))
        }
        return result
    }

    /** ReadableMap? -> Map<String, String>? (takes only string values; empty -> null). */
    fun toStringMapOrNull(map: ReadableMap?): Map<String, String>? {
        val anyMap = toKotlinMap(map) ?: return null
        val result = LinkedHashMap<String, String>()
        for ((k, v) in anyMap) {
            if (v is String) result[k] = v
        }
        return if (result.isEmpty()) null else result
    }

    /**
     * ReadableArray? -> List<CategoryData>?
     * RN array items:
     * - String -> CategoryData(name = string, active = true)
     * - Map    -> CategoryData(name/title/steady/active) (added only when name is present)
     */
    fun toCategoryListOrNull(array: ReadableArray?): List<CategoryData>? {
        if (array == null) return null

        val anyList = toKotlinList(array) ?: return emptyList()
        val result = ArrayList<CategoryData>(anyList.size)

        for (item in anyList) {
            when (item) {
                is String -> {
                    result.add(
                            CategoryData(
                                    name = item,
                                    title = null,
                                    steady = null,
                                    active = true
                            )
                    )
                }

                is Map<*, *> -> {
                    val name = item["name"] as? String
                    val title = item["title"] as? String
                    val steady = item["steady"] as? Boolean
                    val active = item["active"] as? Boolean

                    if (name != null) {
                        result.add(
                                CategoryData(
                                        name = name,
                                        title = title,
                                        steady = steady,
                                        active = active
                                )
                        )
                    }
                }
            }
        }

        return result
    }

    /**
     * ReadableMap? -> TargetModels.UTM?
     * RN map: campaign/content/keyword/medium/source/temp.
     */
    fun toUtmOrNull(map: ReadableMap?): com.altcraft.sdk.target.data.models.TargetModels.UTM? {
        if (map == null) return null
        return com.altcraft.sdk.target.data.models.TargetModels.UTM(
                campaign = map.getString("campaign"),
                content = map.getString("content"),
                keyword = map.getString("keyword"),
                medium = map.getString("medium"),
                source = map.getString("source"),
                temp = map.getString("temp")
        )
    }

    /**
     * ReadableMap? -> TargetModels.SubscriptionModel.Subscription?
     *
     * RN subscription map comes from JS as Record<string, string> (string-only),
     * so resource_id / priority may arrive as strings. Supports email, SMS,
     * push, and cc_data subscription payloads. Returns `null` when the channel
     * is unknown or required fields for the selected channel are missing.
     */
    fun toSubscriptionOrNull(map: ReadableMap?):
            com.altcraft.sdk.target.data.models.TargetModels.SubscriptionModel.Subscription? {
        if (map == null) return null

        return try {
            val channel = (map.getString("channel") ?: map.getString("type"))
                    ?.trim()
                    .orEmpty()
            if (channel.isEmpty()) return null

            val resourceId = asInt(
                    map.getString("resourceId") ?: map.getString("resource_id")
            ) ?: return null

            val status = map.getString("status")
            val priority = asInt(map.getString("priority") ?: map.getString("priority"))

            val customFields: Map<String, Any?>? =
                    (map.getString("customFields") ?: map.getString("custom_fields"))
                            ?.takeIf { it.isNotBlank() }
                            ?.let { parseJsonToMap(it) }

            val cats: List<String>? =
                    map.getString("cats")
                            ?.takeIf { it.isNotBlank() }
                            ?.let { parseJsonToStringList(it) }

            when (channel) {
                "email" -> {
                    val email = map.getString("email") ?: return null
                    com.altcraft.sdk.target.data.models.TargetModels.SubscriptionModel
                            .EmailSubscription(
                            resourceId = resourceId,
                            email = email,
                            status = status,
                            priority = priority,
                            customFields = customFields,
                            cats = cats
                    )
                }

                "sms" -> {
                    val phone = map.getString("phone") ?: return null
                    com.altcraft.sdk.target.data.models.TargetModels.SubscriptionModel
                            .SmsSubscription(
                            resourceId = resourceId,
                            phone = phone,
                            status = status,
                            priority = priority,
                            customFields = customFields,
                            cats = cats
                    )
                }

                "push" -> {
                    val provider = map.getString("provider") ?: return null
                    val subscriptionId =
                            (map.getString("subscriptionId")
                                    ?: map.getString("subscription_id")) ?: return null
                    com.altcraft.sdk.target.data.models.TargetModels.SubscriptionModel
                            .PushSubscription(
                            resourceId = resourceId,
                            provider = provider,
                            subscriptionId = subscriptionId,
                            status = status,
                            priority = priority,
                            customFields = customFields,
                            cats = cats
                    )
                }

                "cc_data" -> {
                    val ccChannel =
                            (map.getString("ccChannel") ?: map.getString("cc_channel"))
                                    ?: return null
                    val ccDataRaw =
                            (map.getString("ccData") ?: map.getString("cc_data")) ?: "{}"
                    val ccData = parseJsonObjectToKotlinx(ccDataRaw)
                    com.altcraft.sdk.target.data.models.TargetModels.SubscriptionModel
                            .CcDataSubscription(
                            resourceId = resourceId,
                            channel = ccChannel,
                            ccData = ccData,
                            status = status,
                            priority = priority,
                            customFields = customFields,
                            cats = cats
                    )
                }

                else -> null
            }
        } catch (_: Exception) {
            null
        }
    }

    // ---------------- Kotlin -> RN ----------------

    /**
     * Converts an arbitrary native value into an RN-safe value
     * ([WritableMap], [WritableArray] or primitive). Returns `null` for
     * `null` input — callers put `null` explicitly.
     */
    fun writableFromAny(value: Any?): Any? {
        return when (value) {
            null -> null
            is Boolean -> value
            is Int -> value
            is Long -> value
            is Double -> value
            is Float -> value.toDouble()
            is String -> value
            is ProfileData -> profileToWritableMap(value)
            is SubscriptionData -> subscriptionToWritableMap(value)
            is CategoryData -> categoryToWritableMap(value)
            is JsonElement -> writableFromJson(value)
            is Map<*, *> -> {
                val map = Arguments.createMap()
                for ((k, v) in value) {
                    putWritable(map, k?.toString() ?: "", writableFromAny(v))
                }
                map
            }

            is List<*> -> {
                val array = Arguments.createArray()
                for (v in value) {
                    putWritableArrayValue(array, writableFromAny(v))
                }
                array
            }

            is Date -> formatDateToTimestampString(value)
            else -> value.toString()
        }
    }

    /**
     * Maps [ResponseWithHttpCode] to a RN [WritableMap]. Returns `null` if
     * input is `null`.
     */
    fun responseWithHttpCodeToWritableMap(
            data: ResponseWithHttpCode<ResponseWithProfile>?
    ): WritableMap? {
        if (data == null) return null

        val resp = data.response

        return Arguments.createMap().apply root@{
            val httpCode = data.httpCode
            if (httpCode == null) putNull("httpCode") else putInt("httpCode", httpCode)

            if (resp == null) {
                putNull("response")
                return@root
            }

            val respMap = Arguments.createMap().apply resp@{
                val error = resp.error
                if (error == null) putNull("error") else putInt("error", error)
                if (resp.errorText == null) putNull("errorText")
                else putString("errorText", resp.errorText)

                val profile = resp.profile
                if (profile == null) {
                    putNull("profile")
                    return@resp
                }

                putMap("profile", profileToWritableMap(profile))
            }

            putMap("response", respMap)
        }
    }

    /**
     * Formats a date in the device local time zone
     * (pattern: `yyyy-MM-dd HH:mm:ss.SSS`).
     */
    fun formatDateToTimestampString(date: Date): String {
        val formatter = SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.US)
        formatter.timeZone = TimeZone.getDefault()
        return formatter.format(date)
    }

    // ---------------- Private helpers ----------------

    /** Converts a native profile model into an RN-safe map. */
    private fun profileToWritableMap(profile: ProfileData): WritableMap {
        return Arguments.createMap().apply {
            if (profile.id == null) putNull("id") else putString("id", profile.id)
            if (profile.status == null) putNull("status") else putString("status", profile.status)
            if (profile.acid == null) putNull("acid") else putString("acid", profile.acid)
            if (profile.isTest == null) putNull("isTest")
            else putBoolean("isTest", profile.isTest == true)
            val subscription = profile.subscription
            if (subscription == null) putNull("subscription")
            else putMap("subscription", subscriptionToWritableMap(subscription))
        }
    }

    /** Converts a native subscription model into an RN-safe map. */
    private fun subscriptionToWritableMap(subscription: SubscriptionData): WritableMap {
        return Arguments.createMap().apply {
            if (subscription.subscriptionId == null) putNull("subscriptionId")
            else putString("subscriptionId", subscription.subscriptionId)
            if (subscription.hashId == null) putNull("hashId")
            else putString("hashId", subscription.hashId)
            if (subscription.provider == null) putNull("provider")
            else putString("provider", subscription.provider)
            if (subscription.status == null) putNull("status")
            else putString("status", subscription.status)

            val fields = subscription.fields
            if (fields == null) {
                putNull("fields")
            } else {
                val fieldsMap = Arguments.createMap()
                for ((k, v) in fields) {
                    putWritable(fieldsMap, k, writableFromJson(v))
                }
                putMap("fields", fieldsMap)
            }

            val cats = subscription.cats
            if (cats == null) {
                putNull("cats")
            } else {
                val catsArray = Arguments.createArray()
                for (cat in cats) {
                    catsArray.pushMap(categoryToWritableMap(cat))
                }
                putArray("cats", catsArray)
            }
        }
    }

    /** Converts a native subscription category into an RN-safe map. */
    private fun categoryToWritableMap(category: CategoryData): WritableMap {
        return Arguments.createMap().apply {
            if (category.name == null) putNull("name") else putString("name", category.name)
            if (category.title == null) putNull("title") else putString("title", category.title)
            if (category.steady == null) putNull("steady")
            else putBoolean("steady", category.steady == true)
            if (category.active == null) putNull("active")
            else putBoolean("active", category.active == true)
        }
    }

    /** Converts a kotlinx JSON element into an RN-safe value. */
    private fun writableFromJson(element: JsonElement): Any? {
        return when (element) {
            is JsonNull -> null
            is JsonPrimitive -> when {
                element.isString -> element.content
                element.content == "true" -> true
                element.content == "false" -> false
                else -> element.content.toLongOrNull()
                        ?: element.content.toDoubleOrNull()
                        ?: element.content
            }

            is JsonArray -> {
                val array = Arguments.createArray()
                for (item in element) {
                    putWritableArrayValue(array, writableFromJson(item))
                }
                array
            }

            is JsonObject -> {
                val map = Arguments.createMap()
                for ((k, v) in element) {
                    putWritable(map, k, writableFromJson(v))
                }
                map
            }
        }
    }

    /** Puts an RN-safe value into a [WritableMap]. */
    private fun putWritable(map: WritableMap, key: String, value: Any?) {
        when (value) {
            null -> map.putNull(key)
            is String -> map.putString(key, value)
            is Boolean -> map.putBoolean(key, value)
            is Int -> map.putInt(key, value)
            is Double -> map.putDouble(key, value)
            is WritableMap -> map.putMap(key, value)
            is WritableArray -> map.putArray(key, value)
            else -> map.putString(key, value.toString())
        }
    }

    /** Puts an RN-safe value into a [WritableArray]. */
    private fun putWritableArrayValue(array: WritableArray, value: Any?) {
        when (value) {
            null -> array.pushNull()
            is String -> array.pushString(value)
            is Boolean -> array.pushBoolean(value)
            is Int -> array.pushInt(value)
            is Double -> array.pushDouble(value)
            is WritableMap -> array.pushMap(value)
            is WritableArray -> array.pushArray(value)
            else -> array.pushString(value.toString())
        }
    }

    /** ReadableMap[key] -> Kotlin Any? */
    private fun readMapValue(map: ReadableMap, key: String): Any? {
        return when (map.getType(key)) {
            ReadableType.Null -> null
            ReadableType.Boolean -> map.getBoolean(key)
            ReadableType.String -> map.getString(key)
            ReadableType.Number -> normalizeNumber(map.getDouble(key))
            ReadableType.Map -> toKotlinMap(map.getMap(key))
            ReadableType.Array -> toKotlinList(map.getArray(key))
        }
    }

    /** ReadableArray[index] -> Kotlin Any? */
    private fun readArrayValue(array: ReadableArray, index: Int): Any? {
        return when (array.getType(index)) {
            ReadableType.Null -> null
            ReadableType.Boolean -> array.getBoolean(index)
            ReadableType.String -> array.getString(index)
            ReadableType.Number -> normalizeNumber(array.getDouble(index))
            ReadableType.Map -> toKotlinMap(array.getMap(index))
            ReadableType.Array -> toKotlinList(array.getArray(index))
        }
    }

    /**
     * Double(JS number) -> Int/Long/Double
     * - NaN/Infinity -> Double
     * - integer -> Int if it fits, otherwise Long
     * - fractional -> Double
     */
    private fun normalizeNumber(d: Double): Any {
        if (!d.isFinite()) return d

        val asLong = d.toLong()
        val isInteger = d == asLong.toDouble()
        if (!isInteger) return d

        return if (asLong in Int.MIN_VALUE.toLong()..Int.MAX_VALUE.toLong()) {
            asLong.toInt()
        } else {
            asLong
        }
    }

    /** Safely converts a dynamic value to int. */
    private fun asInt(value: String?): Int? {
        if (value == null) return null
        return value.trim().toIntOrNull()
    }

    // ---------------- JSON helpers ----------------

    private fun parseJsonToMap(jsonString: String): Map<String, Any?> {
        val result = mutableMapOf<String, Any?>()
        try {
            val jsonObject = org.json.JSONObject(jsonString)
            val keys = jsonObject.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                val value = jsonObject.get(key)
                result[key] = when (value) {
                    is org.json.JSONObject -> parseJsonToMap(value.toString())
                    is org.json.JSONArray -> parseJsonArrayToList(value)
                    org.json.JSONObject.NULL -> null
                    else -> value
                }
            }
        } catch (_: Exception) {
            // return empty map on parse error
        }
        return result
    }

    private fun parseJsonToStringList(jsonString: String): List<String> {
        val result = mutableListOf<String>()
        try {
            val jsonArray = org.json.JSONArray(jsonString)
            for (i in 0 until jsonArray.length()) {
                val item = jsonArray.optString(i, null)
                if (item != null) result.add(item)
            }
        } catch (_: Exception) {
            // return empty list on parse error
        }
        return result
    }

    private fun parseJsonArrayToList(jsonArray: org.json.JSONArray): List<Any?> {
        val result = mutableListOf<Any?>()
        for (i in 0 until jsonArray.length()) {
            val value = jsonArray.get(i)
            result.add(
                    when (value) {
                        is org.json.JSONObject -> parseJsonToMap(value.toString())
                        is org.json.JSONArray -> parseJsonArrayToList(value)
                        org.json.JSONObject.NULL -> null
                        else -> value
                    }
            )
        }
        return result
    }

    private fun parseJsonObjectToKotlinx(jsonString: String): JsonObject {
        return try {
            jsonKx.parseToJsonElement(jsonString).jsonObject
        } catch (_: Exception) {
            JsonObject(emptyMap())
        }
    }
}
