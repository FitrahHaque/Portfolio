---
title: Compression Engine
date: 2025-06-07
weight: 20
featured: true
description: A lossless compression engine built from scratch in Go, progressing from Huffman coding and LZSS to DEFLATE and Gzip.
summary: A lossless compression engine built from scratch in Go, with custom Huffman, LZSS, DEFLATE, and Gzip implementations exposed through file and HTTP workflows.
stack:
  - Go
  - Huffman Coding
  - LZSS
  - DEFLATE
  - Gzip
tags:
  - Compression
  - Algorithms
  - Systems
links:
  - label: Code
    href: https://github.com/FitrahHaque/Compression-Engine
---

## Overview

When applications exchange API responses, especially large JSON payloads, the data is often compressed before travelling between servers. Gzip is commonly used for this over HTTP, but most of the work happens invisibly: a client or server sets a header, a library handles the compression, and the receiving side restores the original JSON automatically.

That hidden process made me curious. I wanted to understand how ordinary data becomes a smaller binary stream, what information must travel with it, and how another server can reproduce the original content exactly. Instead of treating Gzip as another library call, I decided to build the protocol from the ground up in Go.

The project can compress and decompress data using four related formats: Huffman coding, LZSS, DEFLATE, and Gzip. Building them in that order let me understand the ideas underneath Gzip before assembling the complete format.

The easiest way to understand the project is to follow how it handles repetition.

## Start with a Repeated Sentence

Suppose a file contains:

`the cat sat on the mat, the cat sat on the mat`

Storing the same sentence twice is wasteful. A compressor can keep the first occurrence and replace the second with an instruction similar to:

> Go back 24 characters and copy the next 23.

That instruction is much smaller than writing the sentence again. This is the central idea behind LZSS.

There is another kind of repetition too. Characters such as spaces and `t` appear frequently, while others appear rarely. Huffman coding gives common characters shorter binary representations and rare characters longer ones.

DEFLATE uses both ideas together: LZSS removes repeated sequences, then Huffman coding stores the resulting instructions and remaining characters using fewer bits.

## Step One: Find Earlier Matches

The LZSS compressor reads through the input from left to right. At each position, it looks behind itself for text that matches what comes next.

If it finds a useful match, it records two values:

- **Distance:** how far back the earlier copy begins.
- **Length:** how much content should be copied from there.

When there is no useful match, the compressor keeps the current character as it is. The output therefore becomes a mixture of ordinary characters and instructions that refer to earlier content.

I used the Knuth-Morris-Pratt string-search algorithm to find these matches. Searches for different positions run in goroutines and return their results through channels. The compressor then processes the results in their original order so that the final output can be reconstructed correctly.

## Step Two: Use Shorter Codes

After repeated sequences have been replaced, some values still occur more often than others. Huffman coding takes advantage of that frequency.

Imagine encoding four symbols. A common symbol might use the code `0`, while a rare symbol might need `1101`. The common value now costs only one bit each time it appears.

The compressor counts how often values occur and builds a Huffman tree from those frequencies. It also stores enough information for the decompressor to rebuild the same codes. The decompressor reads one bit at a time, follows the rebuilt tree, and recovers the original values.

My standalone Huffman format places that necessary decoding information at the beginning of the compressed file. This header records each symbol and its frequency, followed by the number of padding bits added to complete the final byte. The compressed bitstream comes after it. Without this metadata, the decompressor would not know how to rebuild the original tree or where the meaningful final bits end.

DEFLATE uses a standardized form called canonical Huffman coding. Instead of storing the entire tree, the file stores the length of each code. From those lengths, the decompressor can recreate the same code assignment.

## Step Three: Build DEFLATE

DEFLATE combines the previous two stages:

1. Find repeated content and replace it with distance-and-length instructions.
2. Give shorter Huffman codes to the values that occur most often.

The actual format is bit-based, so values do not necessarily begin or end at byte boundaries. I wrote the code that packs these values into bits, records where a block ends, describes the Huffman codes, and marks the end of the compressed data.

DEFLATE similarly places the information needed for decoding at the beginning of each compressed block. The block header identifies the block type, and a dynamic block includes a compact description of its Huffman codes before the encoded content. Each block can therefore tell the decompressor how to interpret what follows.

The decompressor performs the same work in reverse. It rebuilds the Huffman codes, recovers ordinary characters and copy instructions, then follows each instruction to reproduce repeated content from earlier in the output.

## Step Four: Wrap It in Gzip

Gzip uses DEFLATE for compression but adds information around it. A Gzip header is prepended to identify the format and its settings. Unlike the Huffman and DEFLATE metadata, however, not everything is placed at the front.

Before the compressed content, the engine writes a Gzip header that identifies the format. After the content, it writes the original file size and a CRC-32 checksum.

The checksum acts like a fingerprint of the original data. After decompression, the engine calculates the fingerprint again. If the size or checksum does not match the values stored in the file, the engine reports an error instead of silently returning damaged content.

The standalone LZSS format is different. Its distance-and-length instructions are embedded directly among the literal content, so it does not prepend a separate metadata header. In other words, every format carries the information required to reverse the compression, but each one organizes that information differently.

## Using the Engine

The command-line application supports all four algorithms through the same interface. It can compress or decompress files and reports the original size, compressed size, and compression ratio.

I also added an HTTP demonstration. A client compresses a file and sends it in a `POST` request with a `Content-Encoding` header. Server middleware reads that header, selects the correct decompressor, and restores the request body before passing it to the handler.

The handler receives ordinary uncompressed data. It does not need to know how Huffman coding, LZSS, or DEFLATE works internally.

## What Made This Difficult

The broad ideas behind compression are approachable. The difficult part is making every detail reversible.

A match must point to exactly the right earlier data. Variable-length values must be packed across byte boundaries without losing a bit. The decompressor must rebuild the same Huffman codes as the compressor. Gzip must verify that the final output has the expected size and checksum.

Writing both compression and decompression made mistakes visible immediately: if either side interpreted one value differently, the original file could not be recovered. That process gave me a much clearer understanding of the work hidden behind the simple compression APIs we normally use.
