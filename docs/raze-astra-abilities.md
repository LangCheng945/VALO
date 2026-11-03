# Raze and Astra trainer kits

Two model-backed agents now have four playable abilities each, original packaged icon images, shop/selection descriptions, local effects and real multiplayer event/state handling. All numbers are explicit browser-trainer tuning, not a claim of exact current competitive-patch parity.

## Reference and art

Slots were checked against the pinned [valorant-playbook agents.json](https://github.com/chl191980/valorant-playbook/blob/10295be30455109f119d2e80d62184bbf1e7f76f/data/agents.json), including Astra's Astral Form passive distinction. Character and original transparent icon attribution remain in `assets/agents` and `assets/ui/abilities/provenance.json`. The launcher, rocket/grenade/robot props, star effects, planner and divide plane are locally authored. No new official deployed-ability mesh or original skill audio has been imported.

## Raze

- **C Boom Bot:** equip, left click on supported ground ahead to deploy, right click to cancel. The robot follows ground, turns at blocked routes and chases a visible enemy ahead. Close contact detonates it. Its body collider is destructible by firearms, nearby melee and Neon Overdrive; destroying it removes it without a blast. One use per round.
- **Q Blast Pack:** equip and left click to throw a sticky pack. While a pack exists, Q detonates it, including during flight. Two packs per round. The blast propels nearby actors and causes enemy/reduced friendly damage, while the owner receives an impulse without HP damage. Player impulse follows the existing collision solver; bot displacement is a conservative ground step plus a brief model lift. It is not a reproduction of original satchel physics.
- **E Paint Shells:** throw a bouncing grenade. Its first timed explosion releases four independently bouncing, delayed cluster grenades. Range falloff, armor, friendly ability damage, invulnerability, Iso shielding and kill credit use the existing rules. Two kills restore one grenade, capped at one available charge.
- **X Showstopper:** equip a rocket for a 10-second window. Weapon switching or X puts it away; X can re-equip the same unspent rocket before expiry. Left click fires once. Native firearm/Spike overlap is rejected while equipped. Impact causes an area explosion; expiry/death does not refund the ultimate.

The Worker validates ballistic contacts/normals, owned robot movement/rate, device HP, cooldowns and fixed damage. Robot pathing/visibility are client simulated and bounded by server position/range checks. Missed contacts cannot claim arbitrary damage. The current robot is a coarse forward-seeking ground agent, not original navigation AI. Grenade/satchel blast occlusion uses the existing radial ability model, not an authoritative map-mesh solver.

## Astra

- **X Astral Form:** enter a map planner. The body stays at its world position, remains vulnerable and cannot shoot or operate Spike. Left click places a star, up to four per round. C/Q/E activate the star beside the map cursor; outside the planner, aim toward a star and use the same key. Right click exits. Astral Form itself spends no ultimate and remains available after Cosmic Divide has been used.
- **C Gravity Well:** consumes a star, pulls nearby actors with collision checks, then applies vulnerability to actors still in the area. Allies are affected too. It causes no direct HP damage. Pull/stun statuses are not cleared merely by switching weapons.
- **Q Nova Pulse:** consumes a star, warns briefly, then applies one timed concussion, including to allies. It shares the existing movement/fire-rate concussion penalties. A single activation cannot extend the stun every tick.
- **E Nebula:** consumes a star to create smoke. Two smoke charges recharge independently. Bullets can pass through smoke. Gravity and Nova have their own cooldowns.
- **F Dissipate:** recall an unused star. It produces a short smoke, then returns the star after a separate 20-second delay. This does not spend/refund a normal Nebula charge, and replaying a recall cannot duplicate stars.
- **X again while in Astral Form:** select Cosmic Divide mode, then choose two map points. Confirming the second point spends the ultimate and leaves the planner. The wide vertical divide intercepts bullets on both the client and Worker, so a client-reported target hit beyond it cannot deal firearm damage. Walking through it is allowed. Footsteps across the plane are attenuated; a full original audio-isolation model is not implemented.

The planner samples map support near the player's current elevation; it is not the original free-flying 3D astral view. Cosmic Divide uses a map-spanning finite plane, rather than the original rendering/audio system. Stars, smoke and completed abilities persist for the round or their duration, including after caster death. Preparation and channel state are interrupted by death, inactivity, map changes and disconnect; round reset clears field objects and cooldown resources.

## Checks

`raze-astra.test.mjs` verifies grenade/cluster timing, falloff/kill refresh, self-safe satchel impulses, one-rocket equipment, destructible robot and Neon-device interaction, star caps, delayed recall refunds, pull/vulnerability, Nova timing, smoke charges and divide intersections. Real WebSocket tests verify robot explosions, launcher/firearm exclusion, one rocket, planner body locking, late-join stars, gravity status and authoritative bullet blocking. The Chrome test uses actual Ascent ground/projectile contacts and actual input for all eight abilities, plus weapon use, smoke/recall resources, planner re-entry, forced-movement plant interruption and cleanup. Full multiplayer regression and Sites build/lint are run before push.
