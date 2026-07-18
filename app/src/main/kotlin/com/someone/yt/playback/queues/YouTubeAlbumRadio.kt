/*
 * Sumic - by SOMEONE!
 * SOMEONE!
 * Licensed Under GPL-3.0
 */



package com.someone.yt.playback.queues

import androidx.media3.common.MediaItem
import com.someone.yt.innertube.YouTube
import com.someone.yt.innertube.models.WatchEndpoint
import com.someone.yt.extensions.toMediaItem
import com.someone.yt.models.MediaMetadata
import kotlinx.coroutines.Dispatchers.IO
import kotlinx.coroutines.withContext

class YouTubeAlbumRadio(
    private var playlistId: String,
) : Queue {
    override val preloadItem: MediaMetadata? = null

    private val endpoint: WatchEndpoint
        get() = WatchEndpoint(
            playlistId = playlistId,
            params = "wAEB"
        )

    private var albumSongCount = 0
    private var continuation: String? = null
    private var firstTimeLoaded: Boolean = false

    override suspend fun getInitialStatus(): Queue.Status = withContext(IO) {
        val albumSongs = YouTube.albumSongs(playlistId).getOrThrow()
        albumSongCount = albumSongs.size
        Queue.Status(
            title = albumSongs.first().album?.name.orEmpty(),
            items = albumSongs.map { it.toMediaItem() },
            mediaItemIndex = 0
        )
    }

    override fun hasNextPage(): Boolean = !firstTimeLoaded || continuation != null

    override suspend fun nextPage(): List<MediaItem> = withContext(IO) {
        val nextResult = YouTube.next(endpoint, continuation).getOrThrow()
        continuation = nextResult.continuation
        if (!firstTimeLoaded) {
            firstTimeLoaded = true
            nextResult.items.subList(albumSongCount, nextResult.items.size).map { it.toMediaItem() }
        } else {
            nextResult.items.map { it.toMediaItem() }
        }
    }
}
