# Breach trainer kit

Breach now has a playable four-slot kit, local original ability icons, his existing character model, locally authored arm launcher/effects, shop labels and role-selection descriptions. Timing and damage below are explicit trainer tuning, not a claim of current competitive patch parity.

## Reference and assets

The slot mapping was checked against [valorant-playbook agents.json](https://github.com/chl191980/valorant-playbook/blob/10295be30455109f119d2e80d62184bbf1e7f76f/data/agents.json): C Aftershock, Q Flashpoint, E Fault Line and X Rolling Thunder. Existing ability research was also consulted. Model/portrait attribution remains in `assets/agents`; original transparent skill-icon provenance is in `assets/ui/abilities/provenance.json`. No newly discovered official deployed-skill mesh is claimed. The launcher, orange warning lanes and energy effects are authored locally.

## Controls and mechanics

- C equips Aftershock. Aim at a wall and left click to emit two delayed damage pulses on its far side; right click cancels. One cast per round. Terrain does not stop the outgoing blast. Team/self damage uses the existing reduced friendly-ability damage rule.
- Q equips Flashpoint. Left click on a wall to deploy a flash on its far side; right click cancels. Two uses per round. Exposed allies and enemies can be blinded. The client checks static line of sight and reports exposure; the Worker validates the known effect, time window, range and gaze, rejects replays and computes duration. Turning away gives a shorter flash. Flash causes no HP damage.
- E equips Fault Line. Hold left click to charge, release to send a ground concussion through terrain. Charge increases range. The Worker measures elapsed charge time; client-supplied damage/range/charge is ignored. Recharges in 40 seconds. Charging blocks firearm/Spike overlap, and interruption clears the pending charge without spending E.
- X equips Rolling Thunder. Left click sends a wide series of expanding concussion bands. Each actor is hit once, including allies; the caster is excluded from their own outgoing ground wave. Players receive an upward movement impulse and bots a short model lift. One use per round. It causes no HP damage.

Warnings and effects are persisted for late joiners. Charges, cooldown, HP, kill credit and concussion are server-owned. Opening menus, switching weapons, death, detention, disconnect/reconnect, round reset and map changes cancel preparation/charging. Concussion reuses the existing shared movement/fire-rate penalty. Death clears flash/concussion without refunding already spent abilities.

## Limits

There is no full authoritative map mesh on the Worker. Wall exits and flash occlusion are client raycasts with bounded server geometry/time checks. Extremely thick walls and surfaces without a usable far-side collider cannot be targeted. Floor/elevation checks and bot lift are trainer approximations, not the original game's movement physics. Effects and weapon-hand animation are approximations; the existing character rig is reused.

## Validation

Unit tests exercise server charge time, fixed delayed pulses/kill credit, flash gaze/range/replay checks, progressive ultimate bands, team effects, isolation and reset. Real WebSocket tests cover late joiners, synchronized flash/damage and cancellation/firearm exclusion. The browser test uses actual Ascent walls, keyboard/mouse charging, flash visibility, concussion, ultimate lift and input cleanup.
