# Cloudflare storage-write reduction

Implemented 2026-11-06. The game protocol, player authority and LAN mode remain
compatible. This optimizes server persistence; it does not compress the ZIP or
change the client's position update frequency.

## Findings

The original room alarm ran around four times each second during a round. Eleven
skill tick handlers unconditionally saved their empty worlds on every alarm.
Active moving skills added more writes. Spike heartbeats and mechanism updates
also rewrote room metadata. Resume-ticket cleanup scanned storage every tick.

Cloudflare explicitly bills **each `setAlarm()` as one SQLite row written**;
`put()`, `delete()` and `list()` use a hidden SQLite table. See
https://developers.cloudflare.com/durable-objects/platform/pricing/.
Storage API key/call counts below are reproducible local measurements, not a
reading of the account's billed row counter. Large values, deletes and metadata
can affect actual billed rows.

## Change

`multiplayer/room-storage.mjs` provides two server-side adapters:

- `RoomStorage` keeps immutable copies, suppresses empty/unchanged writes, and
  checkpoints changed skill worlds together every 10 seconds. Effects that start
  and expire before that checkpoint do not need a stored row. All modules use the
  adapter through the room context; their authoritative gameplay logic is intact.
- Room map/round/score/Spike phase changes and reconnect tickets still await an
  immediate write. Spike heartbeat-only and mechanism-only metadata changes use
  the checkpoint interval. Deletes cannot resurrect an earlier in-flight write.
- Skill checkpoint records include map/round epochs. A new object reads legacy
  records and current checkpoints, but ignores records from previous rounds.
- `RoomGameLoop` runs active simulation with ordinary memory timers and maintains
  a durable recovery alarm at about 30-second intervals. Idle and empty rooms
  retain durable scheduling. A native watchdog event does not run a second tick
  when the memory timer is already scheduled.
- Resume-ticket cleanup runs at most once a minute per live instance.
- LAN explicitly uses its existing memory storage/serialized runtime queue. It
  still calls no Cloudflare APIs and requires no new executable to keep working.

## Measurements

Run `node multiplayer/benchmarks/storage.mjs 2274ba4`. This replays five players,
48,000 position messages and 2,400 simulation ticks over ten simulated minutes,
against the pre-change Worker and the new Worker with the same rules and actors.

| Scenario / operation | Before | After |
| --- | ---: | ---: |
| Five moving players: storage keys written | 26,400 | 0 |
| Five moving players: durable alarm writes | 2,400 | 20 |
| Five moving players plus moving skill: storage keys written | 28,800 | 60 |
| Five moving players plus moving skill: durable alarm writes | 2,400 | 20 |
| Resume storage scans | 2,400 | 10 |

Room creation/setup writes are excluded from that replay's measured interval.
The moving-skill case reduces key writes by 99.79% and alarm writes by 99.17%.
Real-world savings vary with rooms, skill use, disconnects and map changes.

## Checks and monitoring

- `node --test multiplayer/tests/room-storage.test.mjs`: deduplication, checkpoints,
  critical metadata, epoch recovery, concurrent updates/deletes, error retry,
  cold reconstruction and native-alarm recovery.
- Existing Spike/match/agent rules and real Worker room/reconnect/round tests.
- `VALO_TEST_SERVER=http://127.0.0.1:8796 node --test multiplayer/tests/storage-live.test.mjs`:
  five WebSocket clients at approximately 15 Hz, a real 10-second checkpoint,
  a native 30-second watchdog, late join and reconnect.
- `node --test lan/tests/*.test.mjs`: original memory-only LAN behavior.

Public `/health` advertises `storage-checkpoints-1` and the checkpoint/recovery
intervals. Once per minute a live room logs a `valo-storage` counter summary,
without player names, tokens or positions. A room host can request
`{type:'storage_stats'}` over its existing WebSocket; other members cannot obtain
that response. `backendPutKeys` counts API keys, not exact billed SQL rows.

## Recovery limits

An unexpected process loss may roll back the latest approximately ten seconds of
skill-world/mechanism state. Scores, map changes, Spike phases and reconnect tickets
continue to be saved immediately. An interrupted plant/defuse heartbeat may require
the player to hold the action again after recovery. A failed skill checkpoint retains dirty memory
and retries after a minute; this does not guarantee survival of process eviction
or an account-wide quota/service outage. LAN remains the independent fallback.

This reduces storage writes, not the account's request/CPU/duration limits.
Ordinary timers keep an active object resident; active rooms already receive
continuous player messages. Quiet rooms continue to use durable scheduling.
Cloudflare's production metrics remain the authority for actual quota use.

Older server versions do not understand the new internal checkpoint envelope.
Rollback therefore requires draining/resetting active rooms, or a compatible
reader, rather than blindly restoring the old Worker over live checkpoint data.

### Recorded validation

- 108 selected rule/storage tests passed, including 12 persistence/recovery tests.
- 11 real Worker room/round/Spike/44-skill checks passed.
- Five real Worker clients stayed connected across the native watchdog: 1,490
  logical storage requests became 5 backend key writes, with 3 alarm writes over
  approximately 35 seconds. One checkpoint completed; both error counters were 0.
  A late join saw the skill; reconnect retained identity and skill consumption.
- All five LAN regression tests passed, including five players, skill casts,
  Wingman plant/defuse, reconnect, admission and trusted HTTPS/WSS.
