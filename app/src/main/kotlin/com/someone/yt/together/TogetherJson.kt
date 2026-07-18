/*
 * Sumic - by SOMEONE!
 * SOMEONE!
 * Licensed Under GPL-3.0
 */

package com.someone.yt.together

import kotlinx.serialization.json.Json

object TogetherJson {
    val json: Json =
        Json {
            ignoreUnknownKeys = true
            explicitNulls = false
            encodeDefaults = true
            classDiscriminator = "type"
        }
}
