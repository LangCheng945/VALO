# Native motion and map expansion

Pinned source: [unkwsr/open-aim at 807f557](https://github.com/unkwsr/open-aim/tree/807f55721e64ca457d763c64a4a1de7b11e5f3eb).

- Ares, Bucky, Bulldog, Judge, Odin, Outlaw, Shorty, Spectre and Stinger now load their matched weighted gun/parts and native full-arm idle/fire/ADS/reload/equip clips. Both complete arm families remain supported. Collection cosmetics keep their separate assets and animations.
- Sixteen available gun locomotion sets supply native breathing/walk/run/crouch layers. These are mesh-space rotation offsets and local translation deltas, not replacement absolute poses. Guns without a source locomotion set retain their existing walk animation. Active reload, firing, ADS and inspection take priority.
- Killjoy detained intro, loop and exit are retargeted by bone names to Phoenix/Jett arm rigs. Death, menus and realm changes cancel the view. Expiry restores the normal weapon; no extra gameplay detention time is added.
- Sunset receives the pinned irradiance/SH atlas and source directional light. Instance UV transforms are retained without splitting every object into a draw call. The baked shader replaces generic hemisphere GI for mapped geometry; world and first-person render passes remain separate.
- Split/bonsai, Lotus/jam, Bind/duality and Corrode/rook source scenes, collision, minimaps, covers and available ropes are installed. All nine maps appear in selection, friend-host transfers, room creation and public match rotation. Public match rules remain first to 13 with a two-round overtime lead.

Plant polygons follow the source minimap's gold footprints, with actual source floor bands. Callout labels are not necessarily inside the plant zone. Spawn heights and tactical anchors were sampled against the actual collision BVH. Bind's uneven spawn surface uses a final ground snap, with matching server coordinates. The four new maps use double-sided ground sampling because exported collision faces can have reversed winding. Spawn/bot/site anchors are also checked in actual rendered frames: a collision-only check can accept a hidden floor beneath the scene. Split uses the visible upper street/B-site floors; Lotus B uses its visible floor around source height 2.03; Bind starts at the verified playable A-lobby position. Existing five maps keep their original ground selection.

Source scene geometry alone does not implement Bind teleporters or Lotus rotating-door gameplay.

Asset hashes/source details live in the corresponding provenance JSON files. The upstream repository's code license does not independently license Riot's game assets.

Validation: browser suites cover each map's safe/grounded spawns, five bot anchors per mode, legal plant interiors, map cards and authoritative spawn agreement; room tests cover two-peer transfer/resumption for all four new maps. Native-arm tests cover all nine guns on both arm families, reload/fire/equip and actual ammunition accounting. Motion tests cover native idle/walk/run/crouch switching and detention intro/loop/exit/cancellation. Sunset and existing clipping suites exercise real GPU rendering and source-body/skin regressions.
