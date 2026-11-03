# Neon trainer kit

Neon has playable C Fast Lane, Q Relay Bolt, E High Gear and X Overdrive. Her existing local character, hand palette and four original icon images are reused; this change adds gameplay and locally authored electric effects. Parameters are explicit trainer tuning, **not verified current-patch parity**.

## Asset research

The pinned character source [unkwsr/open-aim](https://github.com/unkwsr/open-aim), commit `e1e81cf8ea37e5c363d7720c78cb17fedf0edd94`, contains Neon's character mesh/albedo/ORM and portraits (`site/aim-agents/neon.54468eaf.*`), which are already represented in the local character pack. It did not supply a separate deployed Neon ability prop in the inspected paths.

GitHub repository searches for `neon valorant`, `Neon valorant unity` and Neon ability/model recreations did not yield a verified original skill model. [DevolutionLorca/neon-protocol](https://github.com/DevolutionLorca/neon-protocol), commit `530060e6af1e05b1ef9e939ade2f9af5f02eb4f2`, was inspected by file tree; it contains generic environment/character FBXs, not usable Neon skill props. Its files were not executed or imported. Search results for other Neon repositories were mostly themes, concept websites and bots. Direct official asset APIs remain outside this environment's allowed network destinations, so no new original Riot skill asset is claimed.

Neon's walls, bolt, electricity, recoil and pointing hand pose here are authored locally. There is no added externally loaded GLB and no claim that the electric shaders or audio are official game assets. Existing art attribution remains in `assets/agents` and `assets/ui/abilities`.

## Controls and rules

- **C** equips Fast Lane, left click raises two parallel electric walls, right click cancels. One use per round, 8 s duration. Each path samples supported ground and stops at solid terrain. Walls block bot/ability sight across their finite height; bullets and players pass through. They cause no damage.
- **Q** equips Relay Bolt, left click throws, right click cancels. One bolt per round. It bounces once, leaving a delayed 3.5 m concussion at both impact points; the status lasts 3.5 s and affects teammates/self as well as enemies. It slows movement and firing; it causes no HP damage. World contacts are checked by the browser and bounded against server ballistic state.
- **E** toggles High Gear. Energy starts at 100, drains while running and recovers after a delay when stopped. Running hides the gun and blocks weapon fire/Spike actions. While grounded and moving, right click spends one slide. The slide lasts 650 ms, lowers the camera/body capsule and uses the existing collision solver. Two kills restore a slide. Switching weapon stops sprinting. Sliding gives no invulnerability and remains subject to traps/detention.
- **X** equips Overdrive for 20 s. Hold left click to fire accurately from the pointing hand while moving. The server owns the firing interval, battery, damage and kill credit. Misses spend charge too; charge recovers between bursts. A kill refills the battery and refreshes duration. Weapon switching or X puts it away, and X can re-equip it before expiry without a second ultimate charge. The weapon HUD shows OVERDRIVE and its battery while equipped.

The Worker advertises `neon-kit-1`, restores active walls/bolts/stun warnings to late joiners and clears actions/effects on round reset, death or disconnect. Detention and isolated realms interrupt active movement/equipment. Actor damage uses existing shield/decay/invulnerability rules.

## Limits

There is no complete server map collider; existing client-owned movement and static line-of-sight reports remain bounded rather than fully authoritative. The electric beam currently damages actors; unlike firearm shots, it does not yet damage placed cameras, tripwires, turrets or other ability props. Third-person gun visibility follows sprint/slide/Overdrive, but its avatar pose still uses the existing character animation set. Spectator weapon models do not recreate Neon's local electric hand pose. Numeric values and timing are trainer adaptations, not latest competitive balancing claims.

## Checks

`multiplayer/tests/neon.test.mjs` checks energy/regen, finite wall intersection, charge limits, two contacts, delayed concussion, beam aim/rate/battery/damage, kill refresh and reset. `neon-live.test.mjs` checks real WebSocket synchronization and overlapping firearm rejection. `tests/test_neon_browser.cjs` uses actual Ascent geometry and keyboard/mouse input for slide/collision, wall vision, bouncing stuns, electric hands, actor ray hits, kill refresh, HUD, switching and expiry.
