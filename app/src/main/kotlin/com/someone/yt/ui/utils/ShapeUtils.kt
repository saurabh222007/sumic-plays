/*
 * Sumic - by SOMEONE!
 * SOMEONE!
 * Licensed Under GPL-3.0
 */



package com.someone.yt.ui.utils

import androidx.compose.foundation.shape.CornerBasedShape
import androidx.compose.foundation.shape.CornerSize
import androidx.compose.ui.unit.dp

fun CornerBasedShape.top(): CornerBasedShape =
    copy(bottomStart = CornerSize(0.dp), bottomEnd = CornerSize(0.dp))
