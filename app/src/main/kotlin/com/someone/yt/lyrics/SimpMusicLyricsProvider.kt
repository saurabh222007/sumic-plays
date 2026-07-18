/*
 * Sumic - by SOMEONE!
 * SOMEONE!
 * Licensed Under GPL-3.0
 */



package com.someone.yt.lyrics

import android.content.Context
import com.someone.yt.constants.EnableSimpMusicLyricsKey
import com.someone.yt.simpmusic.SimpMusicLyrics
import com.someone.yt.utils.dataStore
import com.someone.yt.utils.get

object SimpMusicLyricsProvider : LyricsProvider {
    override val name: String = "SimpMusic"

    override fun isEnabled(context: Context): Boolean =
        context.dataStore[EnableSimpMusicLyricsKey] ?: true

    override suspend fun getLyrics(
        id: String,
        title: String,
        artist: String,
        album: String?,
        duration: Int,
    ): Result<String> = SimpMusicLyrics.getLyrics(videoId = id, duration = duration)

    override suspend fun getAllLyrics(
        id: String,
        title: String,
        artist: String,
        album: String?,
        duration: Int,
        callback: (String) -> Unit,
    ) {
        SimpMusicLyrics.getAllLyrics(videoId = id, duration = duration, callback = callback)
    }
}

