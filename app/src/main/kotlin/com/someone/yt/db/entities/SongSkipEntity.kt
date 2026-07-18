/*
 * Sumic - by SOMEONE!
 * Licensed Under GPL-3.0
 */

package com.someone.yt.db.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "song_skip")
data class SongSkipEntity(
    @PrimaryKey val songId: String,
    val skipCount: Int = 0,
    val lastSkippedAt: Long = System.currentTimeMillis()
)
