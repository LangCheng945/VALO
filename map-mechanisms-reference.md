# Bind portals and Lotus rotating doors

Scene source: `unkwsr/open-aim` commit `807f55721e64ca457d763c64a4a1de7b11e5f3eb`, the already installed Duality/Bind and Jam/Lotus GLBs. This implements interactions around those static scene assets; it does not import Riot gameplay code.

## Scene alignment

Source coordinates are metres before the existing 4/3 world scale.

- Bind A Short entrance: teleporter frame `#5769`, near `(4.62, -94.52)`, floor 2. It leads to the B Short receiving room, frame `#6267`, floor 5.
- Bind B Long entrance: frame `#2241`, near `(-73.42, -90.46)`, floor 3. It leads to the A Lobby receiving room, frame `#1141`, floor 1.
- Receiving points are inside each room, on verified walkable ground near the exit. Both keep the equipped weapon, ammunition, view direction and Spike ownership; movement velocity/plant channel are cleared.
- Lotus A/Tree rotor: original `Prop_0_JamDoorA#6600`, pivot `(52.0378, 3, -55.75)`.
- Lotus C/Mound rotor: original `Prop_0_JamDoorA#6598`, pivot `(-16.5, 1.5, -48)`.
- The three source material/geometry parts of each rotor move together. Switch positions come from `Prop_0_DoorSwitchB#6617..#6620`; the original switch art stays in the scene.

## Runtime behavior

`multiplayer/map-mechanism-rules.mjs` shares scaled coordinates, portal eligibility, rotor angles, receiver panel movement and authoritative shot intersections between client and Worker. A rotor makes one 180-degree turn in 10 seconds and cannot be retriggered during that cycle. These timing values are reconstruction tuning, not a claim of exact current Riot parameters.

Bind entrances automatically transport living players and bots in one direction. Receiving doors open from inside on approach or F, slide over 350 ms and remain open for at least three seconds. Occupied thresholds, including a paused player, prevent closing. The receiving doors are reconstructed sliding panels inside the source frames. Portal surfaces and mechanical/transport cues are lightweight procedural effects. Utility projectiles are not transported in this version.

Original stationary rotor meshes are excluded from static batching/collision and reused as moving source models. `map-collision-cutouts.mjs` clips only aperture portions of vertical static pawn/projectile triangles, preserving floors and the wall around each opening. Rotors use capsule-versus-oriented-panel collision; receiver panels contribute moving solid boxes. Dynamic meshes also participate in the map raycaster. The Worker consumes shots that hit a closed/moving mechanism. These panels are not destructible.

Bots get directed off-mesh portal links in the existing navigation search. They can teleport, open a receiving door from inside, leave the room and continue their original goal. Blocked routes near a Lotus rotor can approach the source switch and activate it. Navigation caches refresh when a doorway becomes traversable or closes. Moving rotors displace contacting living actors toward clear nearby ground.

## Networking and resets

Feature flag: `map-mechanisms-1`. Events: `map_door`, `map_travel`, `map_mechanisms`, and rejected-request `map_travel_result`. The Worker checks map, life/activity, phase, range, entry side/height, cooldown and door busy state. Portal positions and destinations are server-selected. A brief source-position guard rejects stale pre-transport movement packets without blocking movement at the destination.

Door state and shared timestamps persist in room metadata and are included in welcome/resume snapshots. Initial server state replaces prior solo state even when its revision is lower; later stale revisions are ignored. New rounds reset the mechanisms; map transfers/rematches discard old-map state. Portal transport does not rebuild or unequip the first-person weapon.

Validation covers pure aperture area/floor preservation, portal direction/height/cooldowns, panel/shot math and round resets; real Worker peers test both transports, inside-only/occupied receivers, late join, busy switches and blocked damage. Real-map browser tests cover source geometry, closed/open pawn and projectile passages, rotor push, bot switches, bot portal navigation through the exit, weapon/ammo preservation and shaders. A two-browser test exercises actual RoomClient callbacks, own/remote transport snapping, receiver synchronization, room transfer and synchronized Lotus rotation.
