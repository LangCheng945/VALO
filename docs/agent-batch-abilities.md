# Remaining agent kits

This update implements the 11 previously unavailable kits (44 C/Q/E/X actions):
Phoenix (`phoenix-original`), Chamber, Deadlock, Gekko, Harbor, KAY/O, Miks, Tejo,
Veto, Waylay and Yoru. The historical `phoenix` network identity still means Sage.
All 29 selectable identities now expose skills. Existing kits remain separate.

## Sources and mapping

`assets/ui/abilities/batch-reference.json` pins the community API response from
https://valorant-api.com/v1/agents?isPlayableCharacter=true&language=en-US.
Icons are downloaded PNGs, never fetched during a match. Slot mapping is Grenade=C,
Ability1=Q, Ability2=E, Ultimate=X. In this response Phoenix has Hot Hands on Q and
Curveball on E; Harbor has Storm Surge, High Tide, Cove and Reckoning.
This is a dated implementation reference, not a guarantee of competitive patch parity.

## Runtime

- `multiplayer/agent-batch-rules.mjs`: shared kit catalog, charges, cooldowns,
  collision/visibility, status immunity, fatal-hit interception and UI instructions.
- `agent-batch-engine.mjs`: common deterministic world simulation, projectiles,
  devices, buffs, possession, teleports, temporary guns and event commands.
- `agent-batch-events.mjs`: authoritative Worker/LAN adapter. Validates ownership,
  ranges, directions, charges, accepted shots and finite special ammunition.
- `agent-batch-view.js`: controls, tactical planner, local simulation, visuals,
  projectile/ground contacts, line-of-sight reports, smoke interiors and camera.
- Worker/round/Spike integration preserves existing clients and adds feature
  `agent-batch-1`. Old LAN servers show an update prompt for new kits.

Movement, HP and fire events continue to use the original room protocol. Skill
objects live in the LAN memory store, requiring zero Cloudflare SQL calls.
Cloudflare online rooms persist their skill world through the existing DO storage.
Server attachments own HP, kill credit, cooldowns and bullet counts; clients do not
supply damage or status durations. As with older kits, static-map contacts and LOS
are reported by clients and sanity checked; this is not a competitive anti-cheat.

Gekko Wingman has its own server plant/defuse actor and heartbeat. It never saves
its coordinates into the owner's attachment. Destruction cancels an action and
releases a carried Spike. Planting takes 4 seconds and defusing 7 seconds, retaining
the existing checkpoint. Phoenix fatal damage returns to its mark without a kill;
KAY/O can instead enter a timed downed state and be restarted by a nearby teammate.
Deadlock cocoons release their target when shot apart. Chamber's two guns retain
independent ammunition across weapon changes and reconnects.

## Controls

Select an agent before playing. C/Q/E/X equip or reactivate. Left click casts;
right click selects documented alternate behavior. Tactical skills use a map:
left click marks points, right click confirms. F removes GravNet, restarts downed
KAY/O, retrieves Gekko globules, activates Fakeout, fakes Gatecrash or uses Crosscut.
Controlled creatures use WASD and left click. Selection cards describe each skill.

## Validation and limits

Run `node tests/test_agent_batch.mjs`,
`node --test lan/tests/*.test.mjs` and, with a local HTTP server on port 8000,
`NODE_PATH=... node tests/test_agent_batch_browser.cjs` (Playwright + Chromium).
The LAN suite exercises 44 real WebSocket casts with five peers and authoritative
Wingman planting/defusing, including owner movement during planting.

Effect geometry, hands/cast gestures, sound, creature navigation, dimensions and
balance are trainer approximations. New devices use lightweight custom geometry;
this update does not claim original Riot ability models or animation parity.
Projectile/creature grounding depends on the loaded map and owner connection.
Veto's automatic interception currently covers devices in this shared skill world;
it does not retroactively intercept every older kit's separate object system.
School cross-machine testing and native Windows execution require actual machines;
local tests cover multiple clients on the same host, HTTP/WS and trusted HTTPS/WSS.

### Recorded checks (2026-11-05)

- Shared rule/event tests: 44 casts plus charge/range rejection, kill recharge,
  rewind, down/revive, immunity/tether, mesh destruction, cocoon rescue, finite guns.
- Real LAN: 5 tests passed, including five peers, all 44 casts, Wingman plant/defuse,
  original movement/shots/reconnect/deltas/shutdown, HTTP admission and trusted TLS.
- Real local Worker: all 44 casts accepted using the unchanged protocol.
- Browser: 44 casts rendered without WebGL shader errors, tactical selection,
  smoke interiors, possession camera/input, ammo persistence/cleanup; actual app
  initialized and exercised C plus weapon switching for all 11 new agents.
- Existing Clove, rounds and Spike: 21 checks passed; agent identities and Vyse
  event/kit checks also passed.
- Windows PE + Node SEA package built successfully; assets include the shared engine.
- Existing `tests/test_controls.cjs` sniper spread assertion still fails. Its
  extracted control helpers are byte-for-byte identical to HEAD before this update;
  this unrelated pre-existing assertion was not changed to make the run green.
