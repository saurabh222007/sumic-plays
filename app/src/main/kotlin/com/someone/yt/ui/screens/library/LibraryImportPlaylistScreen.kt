package com.someone.yt.ui.screens.library

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.someone.yt.LocalDatabase
import com.someone.yt.LocalPlayerAwareWindowInsets
import com.someone.yt.R
import com.someone.yt.utils.ImportJob
import com.someone.yt.utils.ImportStatus
import com.someone.yt.utils.PlaylistImportManager

@Composable
fun LibraryImportPlaylistScreen(
    navController: NavController,
    filterContent: @Composable () -> Unit,
) {
    val database = LocalDatabase.current
    val jobs by PlaylistImportManager.jobs.collectAsState()
    var urlInput by rememberSaveable { mutableStateOf("") }

    BoxWithConstraints(
        modifier = Modifier.fillMaxSize()
    ) {
        LazyColumn(
            contentPadding = LocalPlayerAwareWindowInsets.current.asPaddingValues(),
            modifier = Modifier.fillMaxSize()
        ) {
            item {
                filterContent()
            }

            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 24.dp)
                ) {
                    Text(
                        text = "Import Spotify Playlist",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "Paste a public Spotify playlist share link below. Songs will be searched on YouTube Music and imported into a new local playlist in the background.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = urlInput,
                        onValueChange = { urlInput = it },
                        label = { Text("Spotify playlist link") },
                        placeholder = { Text("https://open.spotify.com/playlist/...") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = {
                            if (urlInput.isNotBlank()) {
                                PlaylistImportManager.importPlaylist(urlInput.trim(), database)
                                urlInput = ""
                            }
                        },
                        enabled = urlInput.isNotBlank(),
                        modifier = Modifier.align(Alignment.End),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(
                            painter = painterResource(id = R.drawable.add),
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(text = "Start Import")
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    
                    Text(
                        text = "* Note: Imports up to 100 tracks from public playlists.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.secondary
                    )
                }
            }

            if (jobs.isNotEmpty()) {
                item {
                    Text(
                        text = "Import Tasks",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                    )
                }

                items(jobs.reversed()) { job ->
                    ImportJobItem(job = job)
                }
            }
        }
    }
}

@Composable
fun ImportJobItem(job: ImportJob) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = job.playlistName,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1
                    )
                    
                    Spacer(modifier = Modifier.height(2.dp))
                    
                    val statusText = when (job.status) {
                        ImportStatus.PARSING -> "Extracting tracks..."
                        ImportStatus.SEARCHING -> "Searching: ${job.processedTracks} / ${job.totalTracks} songs imported"
                        ImportStatus.COMPLETED -> "Import completed successfully"
                        ImportStatus.FAILED -> "Import failed"
                    }
                    
                    Text(
                        text = statusText,
                        style = MaterialTheme.typography.bodyMedium,
                        color = when (job.status) {
                            ImportStatus.COMPLETED -> MaterialTheme.colorScheme.primary
                            ImportStatus.FAILED -> MaterialTheme.colorScheme.error
                            else -> MaterialTheme.colorScheme.onSurfaceVariant
                        }
                    )
                }

                Spacer(modifier = Modifier.width(8.dp))

                // Icon indicating status
                when (job.status) {
                    ImportStatus.PARSING, ImportStatus.SEARCHING -> {
                        Icon(
                            painter = painterResource(id = R.drawable.sync),
                            contentDescription = "Importing",
                            modifier = Modifier.size(24.dp),
                            tint = MaterialTheme.colorScheme.secondary
                        )
                    }
                    ImportStatus.COMPLETED -> {
                        Icon(
                            painter = painterResource(id = R.drawable.check),
                            contentDescription = "Completed",
                            modifier = Modifier.size(24.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                    ImportStatus.FAILED -> {
                        Icon(
                            painter = painterResource(id = R.drawable.error),
                            contentDescription = "Failed",
                            modifier = Modifier.size(24.dp),
                            tint = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }

            // Progress bar
            if (job.status == ImportStatus.SEARCHING && job.totalTracks > 0) {
                Spacer(modifier = Modifier.height(12.dp))
                val progress = job.processedTracks.toFloat() / job.totalTracks
                LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier.fillMaxWidth()
                )
            } else if (job.status == ImportStatus.PARSING) {
                Spacer(modifier = Modifier.height(12.dp))
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}
