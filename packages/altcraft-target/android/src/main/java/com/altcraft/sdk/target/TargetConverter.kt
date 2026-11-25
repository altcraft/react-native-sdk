package com.altcraft.sdk.target

//  Created by Andrey Pogodin.
//
//  Copyright © 2025 Altcraft. All rights reserved.

import com.facebook.react.bridge.ReadableMap
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject

/** RN bridge converters for target-specific models. */
object TargetConverter {

    private val jsonKx = Json { ignoreUnknownKeys = true }

    /**
     * ReadableMap? -> TargetModels.UTM?
     * RN map: campaign/content/keyword/medium/source/temp.
     */
    fun toUtmOrNull(map: ReadableMap?):
            com.altcraft.sdk.target.data.models.TargetModels.UTM? {
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
