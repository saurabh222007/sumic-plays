package com.someone.yt.ui.widget

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.view.KeyEvent
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color as ComposeColor
import androidx.compose.ui.unit.dp
import androidx.glance.appwidget.action.actionSendBroadcast
import androidx.compose.ui.unit.sp
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.glance.ColorFilter
import androidx.glance.unit.ColorProvider
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import android.annotation.SuppressLint
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.layout.Box
import androidx.glance.appwidget.state.getAppWidgetState
import androidx.glance.state.PreferencesGlanceStateDefinition
import androidx.glance.LocalContext
import androidx.glance.action.action
import androidx.glance.action.clickable
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.action.actionStartActivity
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionSendBroadcast
import androidx.glance.appwidget.action.actionStartService
import androidx.glance.appwidget.appWidgetBackground
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.background
import androidx.glance.currentState
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.wrapContentHeight
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.palette.graphics.Palette
import com.someone.yt.R
import com.someone.yt.playback.MusicService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream
import java.net.URL

val widgetTitleKey = stringPreferencesKey("widget_title")
val widgetArtistKey = stringPreferencesKey("widget_artist")
val widgetArtPathKey = stringPreferencesKey("widget_art_path")
val widgetIsPlayingKey = booleanPreferencesKey("widget_is_playing")
val widgetBgColorKey = intPreferencesKey("widget_bg_color")
val widgetTextColorKey = intPreferencesKey("widget_text_color")


class SumicWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = SumicWidget()

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        when (intent.action) {
            "com.someone.yt.WIDGET_PREV" -> sendMediaBroadcast(context, KeyEvent.KEYCODE_MEDIA_PREVIOUS)
            "com.someone.yt.WIDGET_PLAY" -> sendMediaBroadcast(context, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE)
            "com.someone.yt.WIDGET_NEXT" -> sendMediaBroadcast(context, KeyEvent.KEYCODE_MEDIA_NEXT)
        }
    }

    private fun sendMediaBroadcast(context: Context, keyCode: Int) {
        val component = ComponentName(context, androidx.media3.session.MediaButtonReceiver::class.java)

        val downIntent = Intent(Intent.ACTION_MEDIA_BUTTON).apply {
            this.component = component
            putExtra(Intent.EXTRA_KEY_EVENT, KeyEvent(KeyEvent.ACTION_DOWN, keyCode))
        }
        context.sendBroadcast(downIntent)

        val upIntent = Intent(Intent.ACTION_MEDIA_BUTTON).apply {
            this.component = component
            putExtra(Intent.EXTRA_KEY_EVENT, KeyEvent(KeyEvent.ACTION_UP, keyCode))
        }
        context.sendBroadcast(upIntent)
    }
}


class SumicWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            WidgetUi()
        }
    }
    @SuppressLint("RestrictedApi")
    @Composable
    private fun WidgetUi() {
        val prefs = currentState<Preferences>()
        val context = LocalContext.current

        val isPlaying = prefs[widgetIsPlayingKey] ?: false
        val currentSongTitle = prefs[widgetTitleKey] ?: "Not Playing"
        val currentArtistName = prefs[widgetArtistKey] ?: "Sumic"

        val artPath = prefs[widgetArtPathKey]
        val artBitmap = artPath?.let { BitmapFactory.decodeFile(it) }
        val imageProvider = if (artBitmap != null) {
            ImageProvider(artBitmap)
        } else {
            ImageProvider(R.drawable.ic_sumic_concept)
        }

        val defaultBg = android.graphics.Color.parseColor("#1E1E1E")
        val defaultText = android.graphics.Color.WHITE

        val bgColor = ColorProvider(ComposeColor(prefs[widgetBgColorKey] ?: defaultBg))
        val textColor = ColorProvider(ComposeColor(prefs[widgetTextColorKey] ?: defaultText))



        val playPauseIcon = if (isPlaying) R.drawable.ic_pause_white else R.drawable.ic_play_white

        val launchIntentAction = actionStartActivity(
                ComponentName(context.packageName, "com.someone.yt.MainActivity")
            )


        Row(
            modifier = GlanceModifier
                .fillMaxWidth()
                .wrapContentHeight()
                .appWidgetBackground()
                .cornerRadius(24.dp)
                .background(bgColor)
                .clickable(launchIntentAction)
                .padding(12.dp),

            verticalAlignment = Alignment.CenterVertically
        ) {

            Image(
                provider = imageProvider,
                contentDescription = "Album Art",
                modifier = GlanceModifier.size(64.dp).cornerRadius(8.dp)
                    .clickable(launchIntentAction)
            )

            Column(
                modifier = GlanceModifier.defaultWeight().padding(horizontal = 12.dp)
            ) {
                Text(
                    text = currentSongTitle,
                    style = TextStyle(
                        color = textColor,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    ),
                    maxLines = 1
                )

                Text(
                    text = currentArtistName,
                    style = TextStyle(
                        color = textColor,
                        fontSize = 14.sp
                    ),
                    maxLines = 1
                )
            }


            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalAlignment = Alignment.End
            ) {
                Box(
                    modifier = GlanceModifier.size(36.dp).clickable(
                        onClick = actionStartService(
                            Intent(context, MusicService::class.java).apply { action = "com.someone.yt.ACTION_PREV" },
                            isForegroundService = true
                        )
                    ),
                    contentAlignment = Alignment.Center
                ) {
                    Image(
                        provider = ImageProvider(R.drawable.ic_skip_previous),
                        contentDescription = "Previous",
                        colorFilter = ColorFilter.tint(textColor),
                        modifier = GlanceModifier.size(24.dp)
                    )
                }

                Box(
                    modifier = GlanceModifier.size(36.dp).clickable(
                        onClick = actionStartService(
                            Intent(context, MusicService::class.java).apply { action = "com.someone.yt.ACTION_REWIND" },
                            isForegroundService = true
                        )
                    ),
                    contentAlignment = Alignment.Center
                ) {
                    Image(
                        provider = ImageProvider(R.drawable.ic_replay_10),
                        contentDescription = "Rewind 10s",
                        colorFilter = ColorFilter.tint(textColor),
                        modifier = GlanceModifier.size(24.dp)
                    )
                }

                Box(
                    modifier = GlanceModifier.size(52.dp).clickable(
                        onClick = actionStartService(
                            Intent(context, MusicService::class.java).apply { action = "com.someone.yt.ACTION_PLAY_PAUSE" },
                            isForegroundService = true
                        )
                    ),
                    contentAlignment = Alignment.Center
                ) {
                    Image(
                        provider = ImageProvider(playPauseIcon),
                        contentDescription = "Play/Pause",
                        colorFilter = ColorFilter.tint(textColor),
                        modifier = GlanceModifier.size(36.dp)
                    )
                }

                Box(
                    modifier = GlanceModifier.size(36.dp).clickable(
                        onClick = actionStartService(
                            Intent(context, MusicService::class.java).apply { action = "com.someone.yt.ACTION_FORWARD" },
                            isForegroundService = true
                        )
                    ),
                    contentAlignment = Alignment.Center
                ) {
                    Image(
                        provider = ImageProvider(R.drawable.ic_forward_10),
                        contentDescription = "Forward 10s",
                        colorFilter = ColorFilter.tint(textColor),
                        modifier = GlanceModifier.size(24.dp)
                    )
                }

                Box(
                    modifier = GlanceModifier.size(36.dp).clickable(
                        onClick = actionStartService(
                            Intent(context, MusicService::class.java).apply { action = "com.someone.yt.ACTION_NEXT" },
                            isForegroundService = true
                        )
                    ),
                    contentAlignment = Alignment.Center
                ) {
                    Image(
                        provider = ImageProvider(R.drawable.ic_skip_next),
                        contentDescription = "Next",
                        colorFilter = ColorFilter.tint(textColor),
                        modifier = GlanceModifier.size(24.dp)
                    )
                }
            }



        }
    }
}


fun updateSumicWidgetState(context: Context, title: String, artist: String, isPlaying: Boolean, thumbnailUrl: String?) {
    CoroutineScope(Dispatchers.IO).launch {
        val manager = GlanceAppWidgetManager(context)
        val glanceIds = manager.getGlanceIds(SumicWidget::class.java)
        if (glanceIds.isEmpty()) return@launch

        val state: Preferences = androidx.glance.appwidget.state.getAppWidgetState(
            context = context,
            glanceId = glanceIds.first(),
            definition = PreferencesGlanceStateDefinition
        )


        val oldTitle = state[widgetTitleKey] ?: ""
        val existingPath = state[widgetArtPathKey]

        var downloadedArtPath: String? = existingPath
        var extractedBgColor = state[widgetBgColorKey] ?: android.graphics.Color.parseColor("#1E1E1E")
        var extractedTextColor = state[widgetTextColorKey] ?: android.graphics.Color.WHITE

        if (title != oldTitle && !thumbnailUrl.isNullOrBlank()) {
            try {
                val connection = URL(thumbnailUrl).openConnection()
                connection.connect()
                val bitmap = BitmapFactory.decodeStream(connection.getInputStream())
                val scaledBitmap = Bitmap.createScaledBitmap(bitmap, 256, 256, true)

                val file = File(context.cacheDir, "widget_art.png")
                FileOutputStream(file).use { out ->
                    scaledBitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
                }
                downloadedArtPath = file.absolutePath

                val palette = Palette.from(scaledBitmap).generate()
                val swatch = palette.dominantSwatch ?: palette.mutedSwatch ?: palette.darkMutedSwatch
                if (swatch != null) {
                    extractedBgColor = swatch.rgb
                    extractedTextColor = swatch.titleTextColor
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        glanceIds.forEach { glanceId ->
            updateAppWidgetState(context, glanceId) { prefs ->
                prefs[widgetTitleKey] = title
                prefs[widgetArtistKey] = artist
                prefs[widgetIsPlayingKey] = isPlaying
                prefs[widgetBgColorKey] = extractedBgColor
                prefs[widgetTextColorKey] = extractedTextColor
                if (downloadedArtPath != null) {
                    prefs[widgetArtPathKey] = downloadedArtPath
                }
            }
            SumicWidget().update(context, glanceId)
        }
    }
}

val mediaKey = ActionParameters.Key<Int>("media_key")

class MediaControlCallback : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val keyCode = parameters[mediaKey] ?: return
        val component = ComponentName(context, androidx.media3.session.MediaButtonReceiver::class.java)

        context.sendBroadcast(Intent(Intent.ACTION_MEDIA_BUTTON).apply {
            this.component = component
            putExtra(Intent.EXTRA_KEY_EVENT, KeyEvent(KeyEvent.ACTION_DOWN, keyCode))
        })
        context.sendBroadcast(Intent(Intent.ACTION_MEDIA_BUTTON).apply {
            this.component = component
            putExtra(Intent.EXTRA_KEY_EVENT, KeyEvent(KeyEvent.ACTION_UP, keyCode))
        })
    }
}

