/*
 * Sumic - by SOMEONE!
 * SOMEONE!
 * Licensed Under GPL-3.0
 */

package com.someone.yt.playback

import android.content.Context
import android.media.MediaCodecList
import android.net.ConnectivityManager
import androidx.core.content.getSystemService
import androidx.core.net.toUri
import javax.inject.Inject
import javax.inject.Singleton
import androidx.media3.common.C
import androidx.media3.database.DatabaseProvider
import androidx.media3.datasource.ResolvingDataSource
import androidx.media3.datasource.cache.Cache
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.offline.Download
import androidx.media3.exoplayer.offline.DownloadManager
import androidx.media3.exoplayer.offline.DownloadNotificationHelper
import com.someone.yt.innertube.YouTube
import com.someone.yt.constants.AudioQuality
import com.someone.yt.constants.AudioQualityKey
import com.someone.yt.constants.PlayerStreamClient
import com.someone.yt.constants.PlayerStreamClientKey
import com.someone.yt.db.MusicDatabase
import com.someone.yt.db.entities.FormatEntity
import com.someone.yt.db.entities.SongEntity
import com.someone.yt.di.DownloadCache
import com.someone.yt.di.PlayerCache
import com.someone.yt.utils.YTPlayerUtils
import com.someone.yt.utils.StreamClientUtils
import com.someone.yt.utils.enumPreference
import com.someone.yt.constants.NetworkMeteredKey
import com.someone.yt.utils.dataStore
import com.someone.yt.utils.get
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import okhttp3.OkHttpClient
import java.time.LocalDateTime
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

@Singleton
class DownloadUtil
@Inject
constructor(
    @ApplicationContext context: Context,
    val database: MusicDatabase,
    val databaseProvider: DatabaseProvider,
    @DownloadCache val downloadCache: Cache,
    @PlayerCache val playerCache: Cache,
) {
    private val connectivityManager = context.getSystemService<ConnectivityManager>()!!
    private val audioQuality by enumPreference(context, AudioQualityKey, AudioQuality.AUTO)
    private val preferredStreamClient by enumPreference(context, PlayerStreamClientKey, PlayerStreamClient.ANDROID_VR)
    private val songUrlCache = HashMap<String, Pair<String, Long>>()

    // Anti-Bot & Throttling Fields
    private val downloadExecutor = Executors.newFixedThreadPool(3)
    @Volatile private var currentMaxParallelDownloads = 3
    @Volatile private var cooldownUntilMs = 0L
    private val consecutiveThrottleSignals = AtomicInteger(0)

    private val avoidStreamCodecs: Set<String> by lazy {
        if (deviceSupportsMimeType("audio/opus")) emptySet() else setOf("opus")
    }

    private val mediaOkHttpClient: OkHttpClient by lazy {
        OkHttpClient
            .Builder()
            .proxy(YouTube.streamProxy)
            .followRedirects(true)
            .followSslRedirects(true)
            .addInterceptor { chain ->
                val request = chain.request()
                val host = request.url.host
                val isYouTubeMediaHost =
                    host.endsWith("googlevideo.com") ||
                            host.endsWith("googleusercontent.com") ||
                            host.endsWith("youtube.com") ||
                            host.endsWith("youtube-nocookie.com") ||
                            host.endsWith("ytimg.com")

                if (!isYouTubeMediaHost) return@addInterceptor chain.proceed(request)

                // Force ANDROID_VR User-Agent to match download stream creation
                val exactClientName = "ANDROID_VR"
                val userAgent = StreamClientUtils.resolveUserAgent(exactClientName)
                val originReferer = StreamClientUtils.resolveOriginReferer(exactClientName)

                val builder = request.newBuilder().header("User-Agent", userAgent)
                originReferer.origin?.let { builder.header("Origin", it) }
                originReferer.referer?.let { builder.header("Referer", it) }

                chain.proceed(builder.build())
            }.build()
    }

    val downloads = MutableStateFlow<Map<String, Download>>(emptyMap())

    private val dataSourceFactory =
        ResolvingDataSource.Factory(
            CacheDataSource
                .Factory()
                .setCache(downloadCache)
                .setUpstreamDataSourceFactory(
                    CacheDataSource
                        .Factory()
                        .setCache(playerCache)
                        .setUpstreamDataSourceFactory(
                            OkHttpDataSource.Factory(mediaOkHttpClient),
                        )
                        .setCacheWriteDataSinkFactory(null)
                        .setFlags(FLAG_IGNORE_CACHE_ON_ERROR),
                )
                .setFlags(FLAG_IGNORE_CACHE_ON_ERROR),
        ) { dataSpec ->
            val mediaId = dataSpec.key ?: error("No media id")

            if (dataSpec.length >= 0 && downloadCache.isCached(mediaId, dataSpec.position, dataSpec.length)) {
                return@Factory dataSpec
            }

            val cachedUrl = songUrlCache[mediaId]
            if (cachedUrl != null && cachedUrl.second > System.currentTimeMillis()) {
                return@Factory dataSpec.withUri(cachedUrl.first.toUri())
            }

            val playbackData = runBlocking(Dispatchers.IO) {
                val remainingMs = cooldownUntilMs - System.currentTimeMillis()
                if (remainingMs > 0) delay(remainingMs)

                val networkMeteredPref = context.dataStore.get(NetworkMeteredKey, true)
                YTPlayerUtils.playerResponseForPlayback(
                    mediaId,
                    audioQuality = audioQuality,
                    preferredStreamClient = PlayerStreamClient.ANDROID_VR,
                    connectivityManager = connectivityManager,
                    networkMetered = networkMeteredPref,
                    avoidCodecs = avoidStreamCodecs,
                )
            }.getOrThrow()

            val format = playbackData.format

            database.query {
                upsert(
                    FormatEntity(
                        id = mediaId,
                        itag = format.itag,
                        mimeType = format.mimeType.split(";")[0],
                        codecs = format.mimeType.split("codecs=")[1].removeSurrounding("\""),
                        bitrate = format.bitrate,
                        sampleRate = format.audioSampleRate,
                        contentLength = format.contentLength ?: C.LENGTH_UNSET.toLong(),
                        loudnessDb = playbackData.audioConfig?.loudnessDb,
                        perceptualLoudnessDb = playbackData.audioConfig?.perceptualLoudnessDb,
                        playbackUrl = playbackData.playbackTracking?.videostatsPlaybackUrl?.baseUrl
                    ),
                )

                val now = LocalDateTime.now()
                val existing = getSongByIdBlocking(mediaId)?.song

                val updatedSong = if (existing != null) {
                    if (existing.dateDownload == null) existing.copy(dateDownload = now) else existing
                } else {
                    SongEntity(
                        id = mediaId,
                        title = playbackData.videoDetails?.title ?: "Unknown",
                        duration = playbackData.videoDetails?.lengthSeconds?.toIntOrNull() ?: 0,
                        thumbnailUrl = playbackData.videoDetails?.thumbnail?.thumbnails?.lastOrNull()?.url,
                        dateDownload = now
                    )
                }

                upsert(updatedSong)
            }

            val totalLength = format.contentLength ?: C.LENGTH_UNSET.toLong()
            val streamUrlWithRange = if (totalLength > 0) {
                "${playbackData.streamUrl}&range=0-$totalLength"
            } else {
                playbackData.streamUrl
            }

            songUrlCache[mediaId] = streamUrlWithRange to (System.currentTimeMillis() + (60 * 60 * 1000L))
            dataSpec.withUri(streamUrlWithRange.toUri())
        }

    val downloadNotificationHelper =
        DownloadNotificationHelper(context, ExoDownloadService.CHANNEL_ID)

    val downloadManager: DownloadManager =
        DownloadManager(
            context,
            databaseProvider,
            downloadCache,
            dataSourceFactory,
            downloadExecutor
        ).apply {
            maxParallelDownloads = currentMaxParallelDownloads
            addListener(
                object : DownloadManager.Listener {
                    override fun onDownloadChanged(
                        downloadManager: DownloadManager,
                        download: Download,
                        finalException: Exception?,
                    ) {
                        if (download.state == Download.STATE_FAILED) {
                            registerThrottleSignal(finalException)
                        } else if (download.state == Download.STATE_COMPLETED) {
                            clearThrottleSignal()
                        }

                        downloads.update { map ->
                            map.toMutableMap().apply {
                                set(download.request.id, download)
                            }
                        }
                    }
                }
            )
        }

    init {
        CoroutineScope(Dispatchers.IO).launch {
            val result = mutableMapOf<String, Download>()
            val cursor = downloadManager.downloadIndex.getDownloads()
            while (cursor.moveToNext()) {
                result[cursor.download.request.id] = cursor.download
            }
            downloads.value = result
        }
    }

    fun getDownload(songId: String): Flow<Download?> = downloads.map { it[songId] }

    private fun deviceSupportsMimeType(mimeType: String): Boolean {
        return runCatching {
            val codecList = MediaCodecList(MediaCodecList.ALL_CODECS)
            codecList.codecInfos.any { info ->
                !info.isEncoder && info.supportedTypes.any { it.equals(mimeType, ignoreCase = true) }
            }
        }.getOrDefault(false)
    }

    private fun registerThrottleSignal(exception: Throwable?) {
        val nextStrikeCount =
            if (exception == null || isProbablyThrottleSignal(exception)) {
                consecutiveThrottleSignals.incrementAndGet()
            } else {
                consecutiveThrottleSignals.updateAndGet { strikes -> maxOf(1, strikes) }
            }

        val reducedParallelDownloads =
            when {
                nextStrikeCount >= 4 -> MIN_PARALLEL_DOWNLOADS
                nextStrikeCount >= 2 -> DEFAULT_MAX_PARALLEL_DOWNLOADS - 1
                else -> currentMaxParallelDownloads
            }.coerceIn(MIN_PARALLEL_DOWNLOADS, DEFAULT_MAX_PARALLEL_DOWNLOADS)

        val cooldownMs =
            when {
                nextStrikeCount >= 4 -> LONG_COOLDOWN_MS
                nextStrikeCount >= 2 -> SHORT_COOLDOWN_MS
                else -> 0L
            }

        if (reducedParallelDownloads != currentMaxParallelDownloads) {
            currentMaxParallelDownloads = reducedParallelDownloads
            downloadManager.maxParallelDownloads = reducedParallelDownloads
        }

        if (cooldownMs > 0) {
            cooldownUntilMs = maxOf(cooldownUntilMs, System.currentTimeMillis() + cooldownMs)
        }
    }

    private fun clearThrottleSignal() {
        val remainingStrikes = consecutiveThrottleSignals.updateAndGet { strikes ->
            if (strikes > 0) strikes - 1 else 0
        }

        if (remainingStrikes == 0 && currentMaxParallelDownloads != DEFAULT_MAX_PARALLEL_DOWNLOADS) {
            currentMaxParallelDownloads = DEFAULT_MAX_PARALLEL_DOWNLOADS
            downloadManager.maxParallelDownloads = DEFAULT_MAX_PARALLEL_DOWNLOADS
        }
    }

    private fun isProbablyThrottleSignal(exception: Throwable): Boolean {
        val message = buildString {
            append(exception.message.orEmpty())
            exception.cause?.message?.let {
                if (isNotBlank()) append(' ')
                append(it)
            }
        }.lowercase()

        return listOf(
            "429", "403", "quota", "rate", "too many",
            "temporarily unavailable", "timed out", "timeout",
            "unavailable", "reset by peer"
        ).any(message::contains)
    }

    companion object {
        private const val DEFAULT_MAX_PARALLEL_DOWNLOADS = 3
        private const val MIN_PARALLEL_DOWNLOADS = 1
        private const val SHORT_COOLDOWN_MS = 2_500L
        private const val LONG_COOLDOWN_MS = 8_000L
    }
}
