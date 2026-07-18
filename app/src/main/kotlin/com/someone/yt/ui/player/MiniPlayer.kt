/*
 * Sumic - by SOMEONE!
 * SOMEONE!
 * Licensed Under GPL-3.0
 */



package com.someone.yt.ui.player

import com.someone.yt.ui.component.SumicLoader
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.Spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.basicMarquee
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.BlurEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.Player.STATE_BUFFERING
import coil3.compose.AsyncImage
import com.someone.yt.LocalDatabase
import com.someone.yt.LocalPlayerConnection
import com.someone.yt.R
import com.someone.yt.constants.MiniPlayerHeight
import com.someone.yt.constants.SwipeSensitivityKey
import com.someone.yt.constants.ThumbnailCornerRadius
import com.someone.yt.constants.UseNewMiniPlayerDesignKey

import com.someone.yt.constants.CropThumbnailToSquareKey
import com.someone.yt.db.entities.ArtistEntity
import com.someone.yt.extensions.togglePlayPause
import com.someone.yt.models.MediaMetadata
import com.someone.yt.utils.rememberPreference
import kotlinx.coroutines.launch
import kotlin.math.absoluteValue
import kotlin.math.roundToInt
import androidx.compose.foundation.clickable
import com.someone.yt.playback.PlayerConnection

@Composable
fun MiniPlayer(
    position: Long,
    duration: Long,
    modifier: Modifier = Modifier,
    pureBlack: Boolean,
) {
    val useNewMiniPlayerDesign by rememberPreference(UseNewMiniPlayerDesignKey, true)

    if (useNewMiniPlayerDesign) {
        NewMiniPlayer(
            position = position,
            duration = duration,
            modifier = modifier,
            pureBlack = pureBlack
        )
    } else {
        LegacyMiniPlayer(
            position = position,
            duration = duration,
            modifier = modifier,
            pureBlack = pureBlack
        )
    }
}

@Composable
private fun NewMiniPlayer(
    position: Long,
    duration: Long,
    modifier: Modifier = Modifier,
    pureBlack: Boolean,
) {
    val playerConnection = LocalPlayerConnection.current ?: return
    val layoutDirection = LocalLayoutDirection.current
    val coroutineScope = rememberCoroutineScope()
    val swipeSensitivity by rememberPreference(SwipeSensitivityKey, 0.73f)
    val swipeThumbnail by rememberPreference(com.someone.yt.constants.SwipeThumbnailKey, true)


    SwipeableMiniPlayerBox(
        modifier = modifier,
        swipeSensitivity = swipeSensitivity,
        swipeThumbnail = swipeThumbnail,
        playerConnection = playerConnection,
        layoutDirection = layoutDirection,
        coroutineScope = coroutineScope,
        pureBlack = pureBlack,
        useLegacyBackground = false
    ) { offsetX ->
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(64.dp)
                .offset { IntOffset(offsetX.roundToInt(), 0) }
                .clip(RoundedCornerShape(32.dp))
                .background(
                    color = MaterialTheme.colorScheme.surfaceContainer
                )
                .border(
                    width = 1.dp,
                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f),
                    shape = RoundedCornerShape(32.dp)
                )
        ) {
            FloatingMiniPlayerContent(
                pureBlack = pureBlack,
                position = position,
                duration = duration,
                playerConnection = playerConnection
            )
        }
    }
}

@Composable
private fun LegacyMiniPlayer(
    position: Long,
    duration: Long,
    modifier: Modifier = Modifier,
    pureBlack: Boolean,
) {
    val playerConnection = LocalPlayerConnection.current ?: return
    val isPlaying by playerConnection.isPlaying.collectAsState()
    val playbackState by playerConnection.playbackState.collectAsState()
    val error by playerConnection.error.collectAsState()
    val mediaMetadata by playerConnection.mediaMetadata.collectAsState()
    val canSkipNext by playerConnection.canSkipNext.collectAsState()
    val canSkipPrevious by playerConnection.canSkipPrevious.collectAsState()
    val isLoading = playbackState == STATE_BUFFERING
    val layoutDirection = LocalLayoutDirection.current
    val coroutineScope = rememberCoroutineScope()
    val swipeSensitivity by rememberPreference(SwipeSensitivityKey, 0.73f)
    val swipeThumbnail by rememberPreference(com.someone.yt.constants.SwipeThumbnailKey, true)

    val offsetXAnimatable = remember { Animatable(0f) }
    var dragStartTime by remember { mutableStateOf(0L) }
    var totalDragDistance by remember { mutableFloatStateOf(0f) }

    val animationSpec = spring<Float>(
        dampingRatio = Spring.DampingRatioNoBouncy,
        stiffness = Spring.StiffnessLow
    )

    fun calculateAutoSwipeThreshold(swipeSensitivity: Float): Int {
        return (600 / (1f + kotlin.math.exp(-(-11.44748 * swipeSensitivity + 9.04945)))).roundToInt()
    }
    val autoSwipeThreshold = calculateAutoSwipeThreshold(swipeSensitivity)

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(MiniPlayerHeight)
            .windowInsetsPadding(WindowInsets.systemBars.only(WindowInsetsSides.Horizontal))
            .background(
                if (pureBlack)
                    Color.Black
                else
                    MaterialTheme.colorScheme.surfaceContainer
            )
            .let { baseModifier ->
                if (swipeThumbnail) {
                    baseModifier.pointerInput(Unit) {
                        detectHorizontalDragGestures(
                            onDragStart = {
                                dragStartTime = System.currentTimeMillis()
                                totalDragDistance = 0f
                            },
                            onDragCancel = {
                                coroutineScope.launch {
                                    offsetXAnimatable.animateTo(
                                        targetValue = 0f,
                                        animationSpec = animationSpec
                                    )
                                }
                            },
                            onHorizontalDrag = { _, dragAmount ->
                                val adjustedDragAmount =
                                    if (layoutDirection == LayoutDirection.Rtl) -dragAmount else dragAmount
                                val canSkipPrevious = playerConnection.player.previousMediaItemIndex != -1
                                val canSkipNext = playerConnection.player.nextMediaItemIndex != -1
                                val allowLeft = adjustedDragAmount < 0 && canSkipNext
                                val allowRight = adjustedDragAmount > 0 && canSkipPrevious
                                if (allowLeft || allowRight) {
                                    totalDragDistance += kotlin.math.abs(adjustedDragAmount)
                                    coroutineScope.launch {
                                        offsetXAnimatable.snapTo(offsetXAnimatable.value + adjustedDragAmount)
                                    }
                                }
                            },
                            onDragEnd = {
                                val dragDuration = System.currentTimeMillis() - dragStartTime
                                val velocity = if (dragDuration > 0) totalDragDistance / dragDuration else 0f
                                val currentOffset = offsetXAnimatable.value

                                val minDistanceThreshold = 50f
                                val velocityThreshold = (swipeSensitivity * -8.25f) + 8.5f

                                val shouldChangeSong = (
                                        kotlin.math.abs(currentOffset) > minDistanceThreshold &&
                                                velocity > velocityThreshold
                                        ) || (kotlin.math.abs(currentOffset) > autoSwipeThreshold)

                                if (shouldChangeSong) {
                                    val isRightSwipe = currentOffset > 0

                                    if (isRightSwipe && canSkipPrevious) {
                                        playerConnection.player.seekToPreviousMediaItem()
                                        if (com.someone.yt.ui.screens.settings.DiscordPresenceManager.isRunning()) {
                                            try { com.someone.yt.ui.screens.settings.DiscordPresenceManager.restart() } catch (_: Exception) {}
                                        }
                                    } else if (!isRightSwipe && canSkipNext) {
                                        playerConnection.player.seekToNext()
                                        if (com.someone.yt.ui.screens.settings.DiscordPresenceManager.isRunning()) {
                                            try { com.someone.yt.ui.screens.settings.DiscordPresenceManager.restart() } catch (_: Exception) {}
                                        }
                                    }
                                }

                                coroutineScope.launch {
                                    offsetXAnimatable.animateTo(
                                        targetValue = 0f,
                                        animationSpec = animationSpec
                                    )
                                }
                            }
                        )
                    }
                } else {
                    baseModifier
                }
            }
    ) {
        LinearProgressIndicator(
            progress = { (position.toFloat() / duration).coerceIn(0f, 1f) },
            modifier = Modifier
                .fillMaxWidth()
                .height(2.dp)
                .align(Alignment.BottomCenter),
        )

        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxSize()
                .offset { IntOffset(offsetXAnimatable.value.roundToInt(), 0) }
                .padding(end = 12.dp),
        ) {
            Box(Modifier.weight(1f)) {
                mediaMetadata?.let {
                    LegacyMiniMediaInfo(
                        mediaMetadata = it,
                        error = error,
                        pureBlack = pureBlack,
                        modifier = Modifier.padding(horizontal = 6.dp),
                    )
                }
            }

            IconButton(
                onClick = {
                    if (playbackState == Player.STATE_ENDED) {
                        playerConnection.player.seekTo(0, 0)
                        playerConnection.player.playWhenReady = true
                    } else {
                        playerConnection.player.togglePlayPause()
                    }
                },
            ) {
                if (isLoading) {
                    SumicLoader(size = 24.dp)
                } else {
                    Icon(
                        painter = painterResource(
                            if (playbackState == Player.STATE_ENDED) {
                                R.drawable.replay
                            } else if (isPlaying) {
                                R.drawable.pause
                            } else {
                                R.drawable.play
                            },
                        ),
                        contentDescription = when {
                            playbackState == Player.STATE_ENDED -> "Replay"
                            isPlaying -> "Pause"
                            else -> "Play"
                        },
                    )
                }
            }

            IconButton(
                enabled = canSkipNext,
                onClick = playerConnection::seekToNext,
            ) {
                Icon(
                    painter = painterResource(R.drawable.skip_next),
                    contentDescription = "Next",
                )
            }
        }

        if (offsetXAnimatable.value.absoluteValue > 50f) {
            Box(
                modifier = Modifier
                    .align(if (offsetXAnimatable.value > 0) Alignment.CenterStart else Alignment.CenterEnd)
                    .padding(horizontal = 16.dp)
            ) {
                Icon(
                    painter = painterResource(
                        if (offsetXAnimatable.value > 0) R.drawable.skip_previous else R.drawable.skip_next
                    ),
                    contentDescription = if (offsetXAnimatable.value > 0) "Previous" else "Next",
                    tint = MaterialTheme.colorScheme.primary.copy(
                        alpha = (offsetXAnimatable.value.absoluteValue / autoSwipeThreshold).coerceIn(0f, 1f)
                    ),
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}

@Composable
private fun LegacyMiniMediaInfo(
    mediaMetadata: MediaMetadata,
    error: PlaybackException?,
    pureBlack: Boolean,
    modifier: Modifier = Modifier,
) {
    val cropThumbnailToSquare by rememberPreference(CropThumbnailToSquareKey, false)
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier,
    ) {
        Box(
            modifier = Modifier
                .padding(6.dp)
                .size(48.dp)
                .clip(RoundedCornerShape(ThumbnailCornerRadius))
        ) {
            AsyncImage(
                model = mediaMetadata.thumbnailUrl,
                contentDescription = null,
                contentScale = ContentScale.FillBounds,
                modifier = Modifier
                    .fillMaxSize()
                    .let { if (cropThumbnailToSquare) it.aspectRatio(1f) else it }
                    .graphicsLayer(
                        renderEffect = BlurEffect(
                            radiusX = 75f,
                            radiusY = 75f
                        ),
                        alpha = 0.5f
                    )
            )

            AsyncImage(
                model = mediaMetadata.thumbnailUrl,
                contentDescription = null,
                contentScale = if (cropThumbnailToSquare) ContentScale.Crop else ContentScale.Fit,
                modifier = Modifier
                    .fillMaxSize()
                    .let { if (cropThumbnailToSquare) it.aspectRatio(1f) else it }
                    .clip(RoundedCornerShape(ThumbnailCornerRadius)),
            )

            androidx.compose.animation.AnimatedVisibility(
                visible = error != null,
                enter = fadeIn(),
                exit = fadeOut(),
            ) {
                Box(
                    Modifier
                        .fillMaxSize()
                        .background(
                            color = if (pureBlack) Color.Black else Color.Black.copy(alpha = 0.6f),
                            shape = RoundedCornerShape(ThumbnailCornerRadius),
                        ),
                ) {
                    Icon(
                        painter = painterResource(R.drawable.info),
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.error,
                        modifier = Modifier.align(Alignment.Center),
                    )
                }
            }
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 6.dp),
        ) {
            AnimatedContent(
                targetState = mediaMetadata.title,
                transitionSpec = { fadeIn() togetherWith fadeOut() },
                label = "",
            ) { title ->
                Text(
                    text = title,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.basicMarquee(),
                )
            }

            AnimatedContent(
                targetState = mediaMetadata.artists.joinToString { it.name },
                transitionSpec = { fadeIn() togetherWith fadeOut() },
                label = "",
            ) { artists ->
                Text(
                    text = artists,
                    color = MaterialTheme.colorScheme.secondary,
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
private fun FloatingMiniPlayerContent(
    pureBlack: Boolean,
    position: Long,
    duration: Long,
    playerConnection: PlayerConnection
) {
    val isPlaying by playerConnection.isPlaying.collectAsState()
    val playbackState by playerConnection.playbackState.collectAsState()
    val mediaMetadata by playerConnection.mediaMetadata.collectAsState()
    val isLoading = playbackState == androidx.media3.common.Player.STATE_BUFFERING
    val currentSong by playerConnection.currentSong.collectAsState(initial = null)
    val isLiked = currentSong?.song?.liked == true
    val database = LocalDatabase.current
    val firstArtist = mediaMetadata?.artists?.firstOrNull()
    val libraryArtist by remember(firstArtist?.id) {
        firstArtist?.id?.let { database.artist(it) } ?: kotlinx.coroutines.flow.flowOf(null)
    }.collectAsState(initial = null)
    val isSubscribed = libraryArtist?.artist?.bookmarkedAt != null

    Row(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier.size(52.dp),
            contentAlignment = Alignment.Center
        ) {
            androidx.compose.material3.CircularProgressIndicator(
                progress = { (position.toFloat() / duration.coerceAtLeast(1L)).coerceIn(0f, 1f) },
                modifier = Modifier.fillMaxSize(),
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f),
                strokeWidth = 2.dp
            )

            coil3.compose.AsyncImage(
                model = mediaMetadata?.thumbnailUrl,
                contentDescription = null,
                contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .clickable { playerConnection.player.togglePlayPause() }
            )

            if (!isPlaying || isLoading) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                        .clickable { playerConnection.player.togglePlayPause() },
                    contentAlignment = Alignment.Center
                ) {
                    if (isLoading) {
                        com.someone.yt.ui.component.SumicLoader(size = 20.dp)
                    } else {
                        Icon(
                            painter = painterResource(R.drawable.play),
                            contentDescription = "Play",
                            tint = Color.White,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                }
            }
        }
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 12.dp),
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = mediaMetadata?.title ?: "Unknown Song",
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                modifier = Modifier.basicMarquee()
            )
            Text(
                text = mediaMetadata?.artists?.joinToString { it.name } ?: "Unknown Artist",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                modifier = Modifier.basicMarquee()
            )
        }
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(end = 4.dp)
        ) {
            val buttonModifier = Modifier
                .size(36.dp)
                .border(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f), CircleShape)
                .clip(CircleShape)

            Box(
                modifier = buttonModifier.clickable {
                    if (playbackState == androidx.media3.common.Player.STATE_ENDED) {
                        playerConnection.player.seekTo(0, 0)
                        playerConnection.player.playWhenReady = true
                    } else {
                        playerConnection.player.togglePlayPause()
                    }
                },
                contentAlignment = Alignment.Center
            ) {
                if (isLoading) {
                    com.someone.yt.ui.component.SumicLoader(size = 18.dp)
                } else {
                    Icon(
                        painter = painterResource(
                            if (playbackState == androidx.media3.common.Player.STATE_ENDED) R.drawable.replay
                            else if (isPlaying) R.drawable.pause
                            else R.drawable.play
                        ),
                        contentDescription = "Play/Pause",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Box(
                modifier = buttonModifier.clickable {
                    firstArtist?.let { artistInfo ->
                        artistInfo.id?.let { artistId ->
                            database.transaction {
                                val artist = libraryArtist?.artist
                                if (artist != null) {
                                    update(artist.toggleLike())
                                } else {
                                    insert(
                                        ArtistEntity(
                                            id = artistId,
                                            name = artistInfo.name,
                                            channelId = null,
                                            thumbnailUrl = null,
                                        ).toggleLike()
                                    )
                                }
                            }
                        }
                    }
                },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    painter = painterResource(if (isSubscribed) R.drawable.subscribed else R.drawable.person),
                    contentDescription = "Artist",
                    tint = if (isSubscribed) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(18.dp)
                )
            }
            Box(
                modifier = buttonModifier.clickable { playerConnection.toggleLike() },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    painter = painterResource(if (isLiked) R.drawable.favorite else R.drawable.favorite_border),
                    contentDescription = "Like",
                    tint = if (isLiked) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}


