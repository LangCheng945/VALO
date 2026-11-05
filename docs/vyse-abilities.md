# Vyse: complete trainer kit

Reference checked against Riot's [Vyse agent page](https://playvalorant.com/en-us/agents/vyse/) and the ability descriptions returned by [valorant-api](https://valorant-api.com/v1/agents?isPlayableCharacter=true&language=en-US). The API is a community mirror; Riot's description is the behavioural reference. Tuning below is for this browser trainer, not a promise of exact current-patch numeric parity.

| Key | Skill | Implemented behaviour |
| --- | --- | --- |
| C | Razorvine | Equip then left-click to throw a ballistic metallic seed; collision with walls bounces, floor contact plants it; aim and press F to activate after arming. Active field slows players and damages moving players; standing still does not take damage. Two charges. Unactivated enemy seeds can be shot. |
| Q | Shear | Equip then left-click on ground to place a hidden line. Armed trap detects enemy crossing, warns briefly, then raises an indestructible metal wall. The wall blocks movement and bullets on both client and Worker; it disappears after eight seconds. One charge. |
| E | Arc Rose | Existing source flower model/effects; left-click surface deployment, right-click thin-wall deployment, E activation, F recall while aiming. Arming/flash/cooldown and shot destruction remain supported. |
| X | Steel Garden | Equip then left-click to confirm a circular warning zone. After three seconds, enemy primary weapons are jammed for eight seconds, including through cover. Sidearms and melee remain available. Local player automatically switches to their secondary if holding a primary; jammed bots use weaker/slower sidearm attacks. |

## Shared rules and server authority

`multiplayer/vyse-rules.mjs` defines finite wall/radius/height checks, ballistic motion, jam gating and trainer tuning. Representative values: vines radius 4.6 world units, duration nine seconds, movement speed multiplier 0.5, moving damage 12 HP/second before armor/team modifiers; Shear width seven and height four world units; Steel Garden radius 18 and vertical reach seven world units.

The Worker owns charge consumption, landing validation, arming, enemy crossing, moving-only damage, jam timing and valid-shot destruction. Client observations supply map collision contacts, consistent with the existing projectile architecture. Worker state updates cannot cross an active wall; accepted shots stop at its earliest intersection, and both shot and hit packets are rejected for jammed primary weapons. Changing agent identity does not clear an existing jam.

Snapshots include live flights, devices, ultimate warnings, charges and target status, including for late joiners. Per-target trap history is omitted from public snapshots. Round/spawn resets clear effects and debuffs. Damage uses existing armor, immunity, kill attribution, Spike-drop and round-elimination logic.

## Visuals and scope

Arc Rose retains the imported open-aim flower/flash assets. No additional original Razorvine/Shear/Steel Garden models were found in that asset set: these three use new trainer visuals, including a metallic seed, terrain-supported thorn field, patterned metal plate, and batched steel shards. They are not presented as original game assets. Shear and thorn fields use a bounded number of draw calls; visual effects do not add per-frame point lights.

The current trainer does not have a separate playable buy-phase placement system; buy-phase-specific trap refunds are outside this implementation. Steel Garden's casting animation/audio and exact original effects remain future visual work.

## Verification

- `node tests/test_vyse_kit.mjs`: range/class/charge checks, collision/height/realm bounds, landing validation, arming, stationary versus moving damage, enemy-only jam, sidearms, identity-change debuffs, snapshots and round cleanup.
- `tests/test_vyse_kit_browser.cjs`: real rendered C projectile/floor contact, thin-wall E, field damage, Q trigger/bullets/movement/expiry, X jam/sidearm/recovery and disposal.
- `multiplayer/tests/vyse-kit-live.test.mjs`: actual Worker peers exercise crossing rejection, blocked through-wall hits, C activation/damage, X primary rejection/sidearm fire, and late joins.
- Existing flower tests and actual-map source integration regression remain included.

The full concurrent backend run initially hit the existing 20-room/hour creation limit because several older tests shared the same local test IP (185/194 passed; nine HTTP 429 setup failures). Their local-only request headers now use separate documented test IPs, matching the existing live-test convention; no production rate limits changed. The affected suites are rerun independently.
