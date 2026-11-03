# Viper trainer kit

Viper has playable C Snake Bite, Q Poison Cloud, E Toxic Screen and X Viper's Pit, with the existing model, original local ability-icon images, equipment controls, shop labels and role-selection descriptions. Numeric tuning is explicit in `viper-rules.mjs`; this is a browser trainer adaptation, not a claim of exact current competitive-patch balancing.

## Reference and assets

The slot mapping was checked against the pinned [valorant-playbook agents.json](https://github.com/chl191980/valorant-playbook/blob/10295be30455109f119d2e80d62184bbf1e7f76f/data/agents.json) and the previously collected role/ability research. Character attribution remains in `assets/agents`; original transparent skill-icon provenance is in `assets/ui/abilities/provenance.json`. No new original deployed-skill model has been imported. The chemical launcher, gas shaders, projectile and acid surface are authored locally.

## Controls and mechanics

- **C** equips Snake Bite. Left click throws a chemical projectile; right click cancels preparation. It reflects from walls and deploys on a supported upward-facing contact. The ground field causes damage and vulnerability. One use per round; temporary fields survive their caster's death. Existing shield, friendly-damage, Iso shielding and kill-credit rules apply.
- **Q** first equips the Poison Cloud projectile. Left click deploys the emitter; after landing, Q toggles the gas. There is one emitter per round. Its smoke blocks vision rather than bullets. This trainer does not offer emitter pickup/repositioning.
- **E** equips Toxic Screen placement. Left click samples supported ground ahead to deploy a line of emitters. Press E again to toggle the green curtain. Terrain can interrupt the supported path; the curtain does not collide with bullets or players.
- **Q and E share one fuel pool.** It starts at 100. Either or both active devices consume the same 10 fuel/s, rather than charging twice for two devices. Zero fuel disables both. Recharging begins after a delay, and activating requires at least 20 fuel. A small HUD label shows remaining fuel.
- **X** equips Viper's Pit. Aim at nearby supported ground and left click to create the gas volume. It does not consume Q/E fuel. Returning inside resets the outside timer; staying away for 12 seconds, death or leaving the room removes the field. Pressing X while the Pit exists ends it without refunding the ultimate.

Enemy gas exposure causes an initial 30 HP temporary decay, followed by continuing nonlethal decay. Standing in overlapping Viper clouds causes one decay tick per simulation time, not multiple charges. Leaving gas restores the recorded temporary health loss after a delay through the existing shared decay-recovery system. Gas does not damage allies and cannot directly kill; Snake Bite is a separate lethal damage field and can apply reduced friendly damage.

The Worker owns charges, fuel, damage, decay and Pit lifetime. World-contact reports are bounded against projectile flight state and contact normals. Live effects are persisted for late joiners. Reset, team/map transitions, death, detention, inactivity and disconnect stop the relevant actions, while switching weapons only cancels preparation. Deployed gas allows normal gun use.

## Limits

The Worker has no full map mesh. Surface collision, wall-path support and line-of-sight queries are client raycasts with bounded server checks. Poison Cloud/Pit are simplified volumes; shader/fog, toxin propagation through complex elevations, hand pose and projectile bounce behavior are approximations. The Pit has a finite-height trainer volume and no separate official particle or audio assets.

## Validation

Unit tests cover shared fuel, depletion/regen delay, validated reflection and single landing, nonlethal decay, overlap, friendly/realm exclusions, temporary-loss recovery after real damage, lethal acid, finite wall height, detention and Pit timeout/reset. Real WebSocket peers test synchronized gas, late joining, fuel, recovery and manual Pit cancellation. The Chrome test uses actual Ascent ground contacts, real input, vision/bullet separation, poison/recovery, lethal acid, ordinary firearm use and Pit cleanup. Sites build/lint and the full multiplayer suite are checked before pushing.
