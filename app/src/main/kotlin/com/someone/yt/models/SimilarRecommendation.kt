/*
 * Sumic - by SOMEONE!
 * SOMEONE!
 * Licensed Under GPL-3.0
 */



package com.someone.yt.models

import com.someone.yt.innertube.models.YTItem
import com.someone.yt.db.entities.LocalItem

data class SimilarRecommendation(
    val title: LocalItem,
    val items: List<YTItem>,
)
