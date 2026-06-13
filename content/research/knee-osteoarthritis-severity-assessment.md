---
title: Leveraging Quantitative Analysis for Severity Assessment of Knee Osteoarthritis
date: 2025-12-17
weight: 10
year: "2025"
venue: ACM NSysS '25
authors: Asif Ihtemadul Haque, Shamim-Al Mamun, Sanjana Binte Siraj, Tanvir R. Faisal, and Mahmuda Naznin
summary: An interpretable image-processing pipeline that segments knee radiographs, measures joint-space width, and detects osteoarthritis with 82.96% overall accuracy.
tags:
  - Medical Imaging
  - Computer Vision
  - Quantitative Analysis
  - Knee Osteoarthritis
links:
  - label: Paper
    href: research/knee-osteoarthritis-severity-assessment/paper.pdf
  - label: Conference Proceedings
    href: https://dl.acm.org/doi/full/10.1145/3777555.3777566
  - label: Google Scholar
    href: https://scholar.google.ca/citations?view_op=view_citation&hl=en&user=8RmP7v4AAAAJ&citation_for_view=8RmP7v4AAAAJ:Tiz5es2fbqcC
---

## Overview

Clinical severity assessment of knee osteoarthritis (KOA) typically relies on Kellgren-Lawrence (KL) grading. Although standard, this visual assessment method is qualitative, subjective, and prone to high inter-observer variability. Furthermore, visual grading does not directly measure joint-space narrowing—the clinical hallmark of cartilage loss. 

This paper proposes an objective, quantitative methodology that measures joint-space width (JSW) from standard radiographs. By converting joint-space narrowing into a clear numerical metric, this approach provides a reproducible, data-driven biomarker to support clinical decision-making.

## Methodology

Instead of training complex, resource-intensive deep learning classifiers, the proposed framework uses an explainable image-processing and optimization pipeline:

1. **Joint Segmentation**: A pre-trained FastSAM model isolates the knee joint area and localizes the boundaries of the tibia and femur, eliminating the need for labeled training data.
2. **Edge Optimization**: Initial bone boundaries are extracted using Sobel operators and globally aligned using **Simulated Annealing**. A local moving-average filter is then applied to smooth out high-frequency noise and irregularities.
3. **JSW Calculation**: The system calculates bone-to-bone distances across 56 points (at 4-pixel intervals) and extracts the mode joint-space width within the medial and lateral regions of interest (ROIs).

## Key Findings

Analyzing joint-space width across varying stages of osteoarthritis revealed a strong correlation with disease progression:

* **Diagnostic Threshold**: A joint-space width of less than **7% of the total image height** serves as a robust indicator of osteoarthritis, corresponding to advanced KL grades (Grades 2, 3, and 4).
* **Performance**: Classifying osteoarthritis based on this single quantitative threshold achieved **82.96% overall accuracy**, with **74% specificity** and **73% sensitivity**.

## Takeaway

This framework offers an explainable pre-diagnostic tool that produces traceable, objective measurements. Because it operates with minimal computational overhead and requires no manual labeling or deep learning model training, it is highly suitable for deployment in low-resource clinical settings.
