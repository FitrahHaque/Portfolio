---
title: Notes on environmental embeddings
date: 2026-05-30
summary: A short research note on representing future climate, soil, and seasonal signals for crop performance models.
tags:
  - Research
  - Machine Learning
  - Agriculture
---

This is a starter post. Replace it with your own writing, or delete it when you add real notes.

## Overview

The goal of this space is to keep short research logs close to the portfolio: assumptions, experiment changes, dataset notes, and model observations that are useful to revisit later.

## Representation Learning

Representing environmental context (climate, weather, soil) as robust low-dimensional embeddings to improve model generalization across unseen regions and seasons.

## Data Preprocessing and Alignment

To construct reliable environmental embeddings, we must first ingest and align multi-source spatial-temporal datasets. This involves gathering daily temperature, precipitation, solar radiation, and soil characteristics (like pH, clay content, and organic matter) across multiple growing seasons.

### Spatial Resolution Challenges

Weather data is often grid-based (e.g., ERA5 reanalysis at 9km resolution), whereas soil data might be point-based or at different grid scales (e.g., SoilGrids at 250m resolution). We apply bilinear interpolation to align these sources onto a unified spatial grid matching the crop yield observations.

### Temporal Aggregation and Smoothing

Daily weather signals are highly noisy. Simply feeding raw daily sequences into a network can lead to overfitting on short-term meteorological fluctuations. We compute running averages and cumulative metrics (such as growing degree days) over specific crop phenological phases to smooth out daily noise.

## Model Architecture Design

Once the input features are aligned, we employ a hybrid neural network architecture to learn the latent representations. The model consists of a convolutional feature extractor for spatial soil characteristics and a recurrent layer for temporal climate sequences.

### Self-Supervised Pretraining

To make the learned embeddings robust to unseen target locations, we pretrain the embedding network using a contrastive learning objective. We define positive pairs as the same geographical location in seasons with similar climate patterns, and negative pairs as distant locations with distinct weather signatures.

### Fine-Tuning on Yield Prediction

After pretraining, the embedding encoder is frozen or fine-tuned end-to-end alongside a downstream regression head that predicts crop yield. This ensures the environmental embeddings capture features directly relevant to agricultural performance.

## Experimental Results

We evaluate our model across several dryland and irrigated crop sites. Preliminary experiments indicate that self-supervised pretraining significantly improves yield prediction accuracy in regions that experienced extreme, historically unprecedented weather events.

### Out-of-Distribution Generalization

Our model reduces mean squared error by 14% compared to baseline models that use raw environmental features directly. The embedding space exhibits clear clustering based on agro-ecological zones, demonstrating that the network has learned to represent physical soil and climate characteristics rather than simple spatial coordinates.

### Computational Efficiency

By compressing high-dimensional climate sequences into compact 64-dimensional embeddings, the downstream crop yield prediction model trains 5x faster and requires significantly less memory. This allows for rapid architecture searches and hyperspatial parameter tuning.

## Future Research Directions

Our next steps include integrating satellite remote sensing imagery (like Sentinel-2 NDVIs) directly into the embedding framework, and investigating Transformer-based self-attention mechanisms to better model long-range temporal dependencies in seasonal forecasts.
