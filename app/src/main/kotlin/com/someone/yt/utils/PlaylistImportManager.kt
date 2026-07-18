package com.someone.yt.utils

import com.someone.yt.db.MusicDatabase
import com.someone.yt.db.entities.PlaylistEntity
import com.someone.yt.db.entities.PlaylistSongMap
import com.someone.yt.innertube.YouTube
import com.someone.yt.innertube.models.SongItem
import com.someone.yt.models.toMediaMetadata
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.json.JSONObject
import org.jsoup.Jsoup
import java.time.LocalDateTime
import java.util.UUID

data class ImportJob(
    val id: String,
    val playlistName: String,
    val totalTracks: Int,
    val processedTracks: Int,
    val status: ImportStatus
)

enum class ImportStatus {
    PARSING,
    SEARCHING,
    COMPLETED,
    FAILED
}

object PlaylistImportManager {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    private val _jobs = MutableStateFlow<List<ImportJob>>(emptyList())
    val jobs: StateFlow<List<ImportJob>> = _jobs.asStateFlow()

    fun importPlaylist(url: String, database: MusicDatabase) {
        val playlistId = extractPlaylistId(url) ?: run {
            val jobId = UUID.randomUUID().toString()
            _jobs.update { it + ImportJob(jobId, "Invalid Playlist Link", 0, 0, ImportStatus.FAILED) }
            return
        }

        // Check if there is already an active job for this playlistId
        if (_jobs.value.any { it.id == playlistId && (it.status == ImportStatus.PARSING || it.status == ImportStatus.SEARCHING) }) {
            return
        }

        val job = ImportJob(
            id = playlistId,
            playlistName = "Fetching Spotify Playlist...",
            totalTracks = 0,
            processedTracks = 0,
            status = ImportStatus.PARSING
        )
        _jobs.update { it + job }

        scope.launch {
            try {
                val embedUrl = "https://open.spotify.com/embed/playlist/$playlistId"
                val doc = Jsoup.connect(embedUrl)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36")
                    .timeout(10000)
                    .get()

                val scriptElement = doc.select("script[type=application/json]").firstOrNull() ?: throw Exception("JSON script not found")
                val jsonText = scriptElement.data()
                val json = JSONObject(jsonText)
                
                val entity = json.getJSONObject("props")
                    .getJSONObject("pageProps")
                    .getJSONObject("state")
                    .getJSONObject("data")
                    .getJSONObject("entity")

                val playlistName = entity.optString("name", "Imported Playlist")
                val trackListArray = entity.getJSONArray("trackList")
                val total = trackListArray.length()

                if (total == 0) {
                    throw Exception("No tracks found in the playlist")
                }

                // Update job
                _jobs.update { list ->
                    list.map { j ->
                        if (j.id == playlistId) {
                            j.copy(playlistName = playlistName, totalTracks = total, status = ImportStatus.SEARCHING)
                        } else j
                    }
                }

                // Create local playlist
                val localPlaylistId = PlaylistEntity.generatePlaylistId()
                val playlistEntity = PlaylistEntity(
                    id = localPlaylistId,
                    name = playlistName,
                    bookmarkedAt = LocalDateTime.now(),
                    isEditable = true,
                )
                database.withTransaction {
                    insert(playlistEntity)
                }

                var insertedPosition = 0
                for (i in 0 until total) {
                    val trackObj = trackListArray.getJSONObject(i)
                    val title = trackObj.optString("title")
                    val subtitle = trackObj.optString("subtitle").replace('\u00a0', ' ')
                    
                    val query = "$title $subtitle"
                    val searchResult = YouTube.search(query, YouTube.SearchFilter.FILTER_SONG).getOrNull()
                    val bestMatch = searchResult?.items?.filterIsInstance<SongItem>()?.firstOrNull()

                    if (bestMatch != null) {
                        val metadata = bestMatch.toMediaMetadata()
                        database.withTransaction {
                            insert(metadata)
                            insert(
                                PlaylistSongMap(
                                    playlistId = localPlaylistId,
                                    songId = bestMatch.id,
                                    position = insertedPosition++
                                )
                            )
                        }
                    }

                    // Update progress
                    _jobs.update { list ->
                        list.map { j ->
                            if (j.id == playlistId) {
                                j.copy(processedTracks = i + 1)
                            } else j
                        }
                    }

                    // Add delay to prevent rate limits
                    delay(500)
                }

                // Completed
                _jobs.update { list ->
                    list.map { j ->
                        if (j.id == playlistId) {
                            j.copy(status = ImportStatus.COMPLETED)
                        } else j
                    }
                }

            } catch (e: Exception) {
                e.printStackTrace()
                _jobs.update { list ->
                    list.map { j ->
                        if (j.id == playlistId) {
                            j.copy(playlistName = "Failed: ${e.message ?: "Unknown error"}", status = ImportStatus.FAILED)
                        } else j
                    }
                }
            }
        }
    }

    private fun extractPlaylistId(url: String): String? {
        val pattern = Regex("playlist/([a-zA-Z0-9]+)")
        val match = pattern.find(url)
        return match?.groupValues?.get(1)
    }
}
