# Cypher kit and ability-model research

## Scope and sources

Cypher is now playable with C Trapwire, Q Cyber Cage, E Spycam and X Neural Theft. Slot icons use the existing local agent icon pack. This is a browser trainer adaptation, not a claim of exact current-patch parity with VALORANT.

Asset research found two useful small meshes in the MIT-licensed community recreation [staticaron/CypherAgent](https://github.com/staticaron/CypherAgent), pinned at `0ea103e4b3901597a008b6e6b37ea58a03db0e7f`. The hat retains the upstream texture/UVs; the smoke shell uses a locally authored animated cylinder shader. See [asset provenance](../assets/abilities/README.md). Camera, wire endpoints and thrown cage puck are authored geometry because no detailed meshes for them were found in that source. The original weapon/character source `open-aim-source` also contained Cypher's body, but no deployed ability props.

Other public repository trees inspected: ShortValorantProject/Valorant, gh-kwayet/killjoyTurret, osjend/ValorantAssets, abdullah-nadeem-lodhi/Valorant-3D-Immersive-Guide, 64fade/valorant-3d-models, Nico-T-Ihle/Valorant-Cypher-Cam and ACipherEXE/ValCypherTrip. They did not supply usable detailed deployed props for this integration. No upstream executables were run. Direct official asset API requests are blocked by this environment's network policy, so original game extractions have not been verified.

## Controls and trainer tuning

- C equips a wire preview between two nearby vertical walls (up to 9 m span, first anchor within 6 m). Left click deploys, right click cancels. Two wires per round. Enemies crossing an armed wire are briefly tethered/revealed; escaping or shooting either endpoint releases them. A completed snare deals 5 damage and a brief movement/fire-rate concussion, then rearms. F while aiming near an owned endpoint recalls that wire and restores its charge. Dead owners disable traps.
- Q throws a cage puck (right click for a soft throw), including bounded wall bounces. Aim at the landed puck and press F to activate a 7.25 s cylinder. It blocks vision, permits bullets and continues after the owner dies. Two per round. No enemy-entry sound has been added yet.
- E equips a wall-mounted camera preview, then places it on left click. Press E again to view, move the mouse to rotate, left click to shoot a tracking dart, E/right click to leave, R while viewing to recall. The body stays in place and can be damaged. Recall cooldown is 15 s; destruction cooldown 45 s. Tagged enemies pulse on radar/outline and hold F for 1.5 s to remove the dart; local bots remove it automatically. Spycam darts have a 6 s cooldown.
- X needs a recently dead enemy within 8 m and in the crosshair. It throws the imported hat onto the corpse and reveals surviving enemies twice, about 2 s apart. Invalid targets do not spend the ultimate.

Shared rules live in `multiplayer/cypher-rules.mjs`. The Worker owns charges, HP, trap crossing/tether bounds, damage, tag removal, camera state and reveal timing. Room join restores active devices/projectiles/hat animations; death, disconnect and round reset release camera control. Existing realm and invulnerability exclusions apply. The browser owns static-world ray casts and projectile contact reports, with bounded Worker validation; the Worker does not contain the full map collider. Existing client-owned movement/credits remain unchanged. These are not comprehensive anti-cheat guarantees.

## Verification

`multiplayer/tests/cypher.test.mjs` covers validation, wire trigger/release/rearm, charges, ballistic landing, camera tags/cooldowns, corpse-gated pulses and reset. `cypher-live.test.mjs` uses real WebSocket clients against Wrangler. `tests/test_cypher_browser.cjs` uses actual Ascent geometry, native inputs and local GLB requests; it checks deployed models rather than merely finding asset filenames.
