---
title: Distributed Lock Service
date: 2025-01-01
weight: 10
featured: true
description: A fault-tolerant distributed locking service built from scratch in Go, using Raft consensus to coordinate exclusive access across a cluster.
summary: A fault-tolerant distributed locking service built from scratch in Go, using Raft consensus to replicate lock state, recover from leader failure, and coordinate concurrent clients safely.
stack:
  - Go
  - Raft
  - RPC
  - WebSockets
  - HTTP
tags:
  - Distributed Systems
  - Consensus
  - Fault Tolerance
links:
  - label: Code
    href: https://github.com/FitrahHaque/Distributed-Lock
---

## Overview

Imagine several services trying to update the same file, database row, or job at the same time. A distributed lock acts like a network-wide key: one client holds it and may use the shared resource, while every other client waits.

I built this distributed locking service from scratch in Go as a course project. What began as an implementation of Raft grew into a complete coordination system: a cluster agrees on who owns each lock, waiting clients are served fairly, abandoned locks expire, stale writes are rejected, and the service continues operating when its leader fails.

[![Multiple clients coordinate access to a shared resource through the locking service.](/Portfolio/projects/distributed-lock/intended-solution.png)](/Portfolio/projects/distributed-lock/intended-solution.png)

## Why Raft?

The difficult part of a distributed lock is not deciding whether a resource is free. It is making several servers agree on that decision when messages may be delayed and machines may fail.

Raft provides that agreement. Every server begins as a follower, and the cluster elects one leader to order lock operations. The leader records each operation in a replicated log and sends it to the followers. An operation is committed only after a quorum, meaning a majority of the cluster, acknowledges it. In a five-server cluster, that means at least three servers agree.

This gives every healthy node the same ordered history of lock acquisitions and releases. If the leader disappears, a server with an up-to-date log can be elected and continue from the committed state.

## How the System Fits Together

The project has three main parts:

- **Clients** acquire a lock, use the protected resource while they own it, and release the lock when they are finished.
- **Raft servers** elect a leader and replicate lock operations across the cluster.
- **The data store** accepts HTTP writes only when they come from the current lock holder.

Clients keep a WebSocket connection open with the current leader. This lets them wait for a lock grant without repeatedly polling the service. The servers communicate through Go RPC for elections, heartbeats, log replication, and cluster membership. Once a client owns a lock, it writes to the separate data store over HTTP.

Keeping the data store separate was deliberate. The lock service coordinates access to a resource, but it does not need to own that resource. This also made it possible to demonstrate why fencing tokens matter at the point where a write is actually accepted.

[![System architecture showing clients, the Raft server cluster, and the protected data store.](/Portfolio/projects/distributed-lock/system-architecture.png)](/Portfolio/projects/distributed-lock/system-architecture.png)

## From Request to Lock Grant

A client first discovers the current leader and opens a persistent WebSocket connection. When it asks for a lock, the leader places the request in a FIFO queue dedicated to that key. A busy lock therefore does not block requests for unrelated resources, and clients waiting for the same resource are served in arrival order.

When the lock becomes available, the leader creates a log entry containing the client, key, expiry time, and a new fencing token. It then replicates the entry through Raft. Only after a majority acknowledges the operation is the lock committed and the client notified.

The fencing token is a monotonically increasing number attached to every successful acquisition. The client includes it when writing to the data store. If an old client wakes up late and tries to write after its lock has expired, its lower token reveals that the request is stale and the data store rejects it.

## Release and Expiry

A client can release its lock explicitly, but it may also crash or lose its connection. For that reason, every lock has a TTL, or time to live. The leader starts a lightweight goroutine that waits for either an explicit release or the expiry timer.

The goroutine does not continuously poll the lock. It remains idle until one of those events occurs, then appends a release command to the replicated log. Once the release is processed, the leader signals the queue for that key and begins granting the lock to the next client.

## Surviving Leader Failure

Raft elects a replacement when heartbeats from the leader stop, but electing a new leader is only part of the recovery problem. Some application-level work, such as expiry monitors and pending request queues, existed only in the previous leader's memory.

I handled that gap explicitly. Committed lock metadata is stored in the replicated key-value state, so a new leader can determine which locks are still active and recreate their expiry monitors. Meanwhile, clients detect the lost WebSocket connection, discover the new leader, and resend requests that were still pending. Those retries rebuild the per-key queues.

This was one of the most interesting parts of the project. Consensus preserves the authoritative state, but a working service still needs additional logic to restore the processes surrounding that state and continue making progress.

## Building Raft

Every server can be a follower, candidate, or leader. Followers monitor randomized election timers; candidates request votes; and the elected leader sends heartbeats and replicated log entries.

I implemented vote handling, term changes, log freshness checks, majority commitment, follower conflict recovery, and dynamic server addition and removal. When a follower's log diverges, it returns recovery information that lets the leader jump back to a useful term or index instead of repairing the log one entry at a time.

The leader uses Go channels to trigger replication as soon as a command arrives while still sending periodic heartbeats. Election monitoring and lock expiry use tickers, timers, contexts, and goroutines so the system can react promptly without relying on expensive busy loops.

## Decisions That Shaped the Service

**FIFO queues per key** keep assignment fair while allowing different resources to progress independently.

**Persistent WebSockets** let clients wait for asynchronous grants and reconnect after a leader failure without polling.

**Fencing tokens** protect the downstream data store from delayed clients whose ownership has already expired or moved elsewhere.

**Replicated expiry timestamps** allow a newly elected leader to continue monitoring existing locks. This implementation assumes the leader's clock is trustworthy enough for the project scope.

**Consensus-backed membership changes** prevent an outdated or partitioned node from changing the active cluster on its own.

## What I Would Improve Next

The data store is intentionally a demonstration service rather than a distributed database. A production version would also need stronger persistence, explicit clock-drift handling, authenticated fencing tokens, and more reconciliation for rare cases where uncommitted operations temporarily affect local state.

Those limitations became useful design lessons. Implementing Raft solved the consensus problem, but building the lock service around it made the boundary much clearer: consensus provides an agreed history, while the application is still responsible for client behavior, expiry, stale-write protection, recovery, and forward progress.
