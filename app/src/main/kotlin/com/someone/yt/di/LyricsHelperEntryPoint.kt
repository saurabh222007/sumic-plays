/*
 * Sumic - by SOMEONE!
 * SOMEONE!
 * Licensed Under GPL-3.0
 */



package com.someone.yt.di

import com.someone.yt.lyrics.LyricsHelper
import com.someone.yt.lyrics.LyricsPreloadManager
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@EntryPoint
@InstallIn(SingletonComponent::class)
interface LyricsHelperEntryPoint {
    fun lyricsHelper(): LyricsHelper
    fun lyricsPreloadManager(): LyricsPreloadManager
}