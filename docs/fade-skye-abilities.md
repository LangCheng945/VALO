# Fade and Skye trainer kits

Fade and Skye now have four playable abilities each, with existing packaged original ability icons, role/selection descriptions, local training effects and multiplayer state/events. Parameters in `multiplayer/recon-rules.mjs` are explicit trainer tuning, not a claim of current competitive-patch parity.

## Reference and assets

C/Q/E/X assignments were checked against the pinned [valorant-playbook agents.json](https://github.com/chl191980/valorant-playbook/blob/10295be30455109f119d2e80d62184bbf1e7f76f/data/agents.json): Grenade/Ability1/Ability2/Ultimate. Existing agent/icon provenance remains in `assets/agents` and `assets/ui/abilities/provenance.json`. Eye, creature, hawk, wood-dog, orb, wave, trail and first-person props are authored simplified geometry. No official deployed-skill mesh or original skill audio was imported in this change.

## Fade

- **C Prowler:** equip and left click to deploy on supported nearby ground. Hold left click to guide it; otherwise it follows a marked trail or pursues a visible enemy ahead. Contact causes timed nearsight without HP damage. Two uses per round, with destructible 80-HP creatures.
- **Q Seize:** equip and throw a bouncing orb. Q again forces it down. Landing captures enemies currently in its radius once, constraining their horizontal movement and applying deafening and reversible, nonlethal decay. Walking into the field later does not recapture a new target. One use per round.
- **E Haunt:** throw a bouncing eye; E again forces it down. On landing it arms, reveals enemies in range with clear sight and leaves a purple fear trail. The 50-HP eye can be shot; its existing trail persists after destruction. It recharges after 40 seconds. A later short reveal cannot shorten an existing Nightfall trail.
- **X Nightfall:** a forward wave advances in eight bands. Each enemy is affected once, receiving a fear trail, deafening and temporary nonlethal decay. It does not damage allies or finish an enemy through decay.

## Skye

- **C Regrowth:** equip and hold left click to heal visible injured teammates within range. It cannot heal Skye herself, enemies, dead teammates or armor. A shared 100-point resource pool drains only while there is a valid patient. Recent damage temporarily pauses healing. Native weapon attacks are blocked while equipped/channeling; release and cancel to use the gun.
- **Q Trailblazer:** left click deploys a destructible 100-HP scout. WASD moves its camera, Space jumps, left click pounces, and Q/right click exits. The owner body stays vulnerable at its original position. Pounce concusses nearby enemies and deals a fixed 30 damage to its direct target. Exit, destruction, timeout, death, inactivity and disconnect release control without requiring a weapon switch. Its movement is bounded to nearby supported terrain and a 35-metre radius.
- **E Guiding Light:** throw a hawk, hold left click to steer and press E again to flash. Expiry or a wall contact also bursts it in this trainer. Flash duration depends on age, range, sight and victim orientation; teammates can be flashed. Enemy exposure returns a brief small hit confirmation, without disclosing identity. Two charges per round, with no automatic recharge.
- **X Seekers:** deploy up to three destructible 100-HP seekers assigned to distinct living enemies. Contact causes nearsight without direct damage. If a target dies, an available unassigned enemy is selected; when none remain that seeker ends.

## Shared rules and limits

The Worker owns charges, cooldowns, device HP, healing, damage, statuses, control locking, expiration and late-join snapshots. Contact reports must match ballistic trajectories; movement is owner/rate/range bounded. Native bullets, nearby melee and Neon Overdrive can destroy the devices. Death interrupts channels, while independently deployed effects last until their duration/round cleanup. Round/map resets clear all field objects and status resources.

Visibility/contact and creature route selection use the browser's actual collision mesh. The Worker does not carry an authoritative copy of every map mesh; it validates bounded exposure/contact reports rather than independently raycasting map geometry. Creatures use coarse ground-following steering, not the original game's navigation system, and may need improvement around complex routes. Trailblazer has a limited camera far plane rather than the full original scout rendering pipeline. Wall-hit hawk auto-burst and all numeric tuning are documented trainer approximations.

## Validation

`recon.test.mjs` checks charges, cooldowns, ballistics, eye exposure/destruction, tether/decay recovery, Nightfall bands, healing resources, control locking, pounce, flash replay/feedback, distinct seeker targets, lifecycle and Neon-device interaction. `recon-live.test.mjs` uses real WebSocket peers for late joins, firearm destruction, healing exclusions, vulnerable owner body locking, pounce, gaze-based flash and distinct seekers. `tests/test_recon_browser.cjs` exercises all eight abilities using Chrome input on actual Ascent geometry, plus firearm restoration and round cleanup. Run multiplayer regression and Sites build/lint before publishing.
