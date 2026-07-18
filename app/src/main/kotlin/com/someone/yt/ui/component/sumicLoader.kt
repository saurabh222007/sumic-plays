/*
 * Sumic - by SOMEONE!
 * Licensed Under GPL-3.0
 */

package com.someone.yt.ui.component

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Sumic custom loading animation - animated equalizer bars that pulse
 */
@Composable
fun SumicLoader(
    modifier: Modifier = Modifier,
    size: Dp = 40.dp,
    color: Color? = null,
) {
    val accentColor = color ?: MaterialTheme.colorScheme.primary

    val infiniteTransition = rememberInfiniteTransition(label = "sumic_loader")

    // Bar 1 - left bar
    val bar1Height by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 0.9f,
        animationSpec = infiniteRepeatable(
            animation = tween(400, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "bar1"
    )

    // Bar 2 - center bar (offset timing via different duration)
    val bar2Height by infiniteTransition.animateFloat(
        initialValue = 0.9f,
        targetValue = 0.25f,
        animationSpec = infiniteRepeatable(
            animation = tween(500, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "bar2"
    )

    // Bar 3 - right bar
    val bar3Height by infiniteTransition.animateFloat(
        initialValue = 0.5f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(350, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "bar3"
    )

    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier.size(size)
    ) {
        Canvas(modifier = Modifier.size(size)) {
            val w = this.size.width
            val h = this.size.height
            val barWidth = w * 0.2f
            val gap = w * 0.08f
            val totalWidth = barWidth * 3 + gap * 2
            val startX = (w - totalWidth) / 2f
            val cornerRadius = CornerRadius(barWidth / 2f, barWidth / 2f)

            val bars = listOf(bar1Height, bar2Height, bar3Height)

            bars.forEachIndexed { index, heightFraction ->
                val barH = h * heightFraction
                val x = startX + index * (barWidth + gap)
                val y = h - barH  // grow from bottom

                drawRoundRect(
                    color = accentColor.copy(alpha = 0.5f + heightFraction * 0.5f),
                    topLeft = Offset(x, y),
                    size = Size(barWidth, barH),
                    cornerRadius = cornerRadius,
                )
            }
        }
    }
}
