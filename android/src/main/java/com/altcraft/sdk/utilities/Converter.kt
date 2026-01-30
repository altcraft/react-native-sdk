package com.altcraft.sdk.utilities

import com.altcraft.sdk.data.DataClasses
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType

object Converter {

    /** ReadableMap? -> Map<String, Any?>?  (RN object -> Kotlin map) */
    fun toKotlinMap(map: ReadableMap?): Map<String, Any?>? {
        if (map == null) return null
        val result = LinkedHashMap<String, Any?>()
        val it = map.keySetIterator()
        while (it.hasNextKey()) {
            val key = it.nextKey()
            result[key] = readMapValue(map, key) // RN value -> Kotlin Any?
        }
        return result
    }

    /** ReadableArray? -> List<Any?>?  (RN array -> Kotlin list) */
    fun toKotlinList(array: ReadableArray?): List<Any?>? {
        if (array == null) return null
        val result = ArrayList<Any?>(array.size())
        for (i in 0 until array.size()) {
            result.add(readArrayValue(array, i)) // RN value -> Kotlin Any?
        }
        return result
    }

    /** ReadableArray? -> List<String>  (берёт только строки, остальное игнорит) */
    fun toStringList(array: ReadableArray?): List<String> {
        val anyList = toKotlinList(array) ?: return emptyList()
        val result = ArrayList<String>(anyList.size)
        for (v in anyList) {
            if (v is String) result.add(v)
        }
        return result
    }

    /** ReadableMap? -> Map<String, String>?  (берёт только string values; если пусто -> null) */
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
     * - String -> CategoryData(name=string, active=true)
     * - Map    -> CategoryData(name/title/steady/active) (добавляется только если есть name)
     */
    fun toCategoryListOrNull(array: ReadableArray?): List<DataClasses.CategoryData>? {
        if (array == null) return null

        val anyList = toKotlinList(array) ?: return emptyList()
        val result = ArrayList<DataClasses.CategoryData>(anyList.size)

        for (item in anyList) {
            when (item) {
                is String -> {
                    result.add(
                        DataClasses.CategoryData(
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
                            DataClasses.CategoryData(
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
     * Any? -> Any?
     * - ReadableMap   -> Map<String, Any?>?
     * - ReadableArray -> List<Any?>?
     * - Number(Double/Float) -> Int/Long/Double (нормализация)
     * - Boolean/String/Int/Long -> как есть
     */
    fun toKotlinAny(value: Any?): Any? = when (value) {
        null -> null
        is ReadableMap -> toKotlinMap(value)
        is ReadableArray -> toKotlinList(value)
        is Boolean -> value
        is String -> value
        is Double -> normalizeNumber(value)
        is Float -> normalizeNumber(value.toDouble())
        is Int, is Long -> value
        else -> value
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
     * - целое -> Int если влезает, иначе Long
     * - дробное -> Double
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
}
