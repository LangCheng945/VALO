# Source ability effects and knife hand compatibility

Source: open-aim commit `807f55721e64ca457d763c64a4a1de7b11e5f3eb`. Conversion provenance is recorded in `assets/abilities/open-aim/provenance.json`.

## Runtime connections

- Skye: source hawk geometry/texture, summon, aura, flash/star and removal systems on existing recon events.
- Reyna: source eye/shell geometry and birth/projectile/removal systems; existing collider and sight checks remain in place.
- Breach: projectile, telegraph and activation systems on Flashpoint events.
- Jett/Omen: source smoke meshes and embedded masks, adapted materials; Omen selects allied/enemy tint. Existing smoke radius, duration and vision rules remain unchanged.
- Vyse: source flower, windup, flash and removal. The initial E-only integration has now been extended to all four skills; see [vyse-abilities.md](vyse-abilities.md). Arc Rose: left-click surface deployment, 1.2-second arming, E activation, 0.5-second warning, 20-second cooldown, F recall while aiming at own flower, and shot destruction. C/Q/X now have trainer implementations.

The new Worker feature `vyse-flash-1` owns placement limits, arming, activation, cooldown, accepted-shot damage and flash windows. Player snapshots include flower/cooldown state for peers and late joins. Exposure reports use client line-of-sight observations, following the existing Breach architecture.

## Rendering scope and budget

The Three.js adapter uses source meshes, masks and selected emitter curves; it does not execute upstream app bundles or reproduce the entire decompiled original shader pipeline. Smoke materials are rewritten for this engine. Original skeletal hawk flapping and flower VAT animation are not available in these files.

Each flash is capped at 24 particles, six per emitter; transient removal effects are capped at eight roots and disposed after 1.2 seconds. Assets are cached and loaded lazily. Fallback props stay visible until source assets and textures load; disposed parents reject late attachment.

## Knife hands

Collection animations were authored on Phoenix topology. Previous Jett remapping created missing finger bones with zero bind offsets, deforming fingers/forearms. Collection viewmodels now use matching original Phoenix geometry, texture and skeleton for every agent, including the captured Damascus rig. Native tactical/standalone Prime karambit paths retain their existing rigs.

Animation sampling also resets scale and guards attack blending when an attack timestamp is absent.

## Validation

- `tests/test_vyse_events.mjs`: invalid class/range, arming, flash timing, cooldown, accepted-shot destruction, round cleanup.
- `multiplayer/tests/vyse-live.test.mjs`: actual Worker peers, late-join flower state, activation, flash, expiry and cooldown.
- `tests/test_source_ability_browser.cjs`: source props, smoke/flash shader compilation, particle limits, disposal, all six melee skins in both hand families, every clip sampled at five phases; finite deformed vertices and plausible dimensions.
- `tests/test_source_ability_game_browser.cjs`: source Skye/Reyna/Vyse in the actual map and Vyse E/cooldown.
- Existing collection browser suite: all collection firearms/melee on Jett/Phoenix, ADS/reload/equip/inspect/attack, resource reuse and Jett smoke gesture.
- Backend suite: 191/192 passed in concurrent run; Killjoy live detention timeout passed when rerun separately (all three Killjoy live cases).
