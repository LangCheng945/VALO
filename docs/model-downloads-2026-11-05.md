# Downloaded model research — 2026-11-05

These files were downloaded and their GLB headers, embedded glTF JSON, material images, skin joints and animation tracks were inspected. Phoenix, Sage and Sova were also loaded and visually inspected in a local Three.js preview using posed skin bounds. They are research candidates, not installed game assets.

Repository: https://github.com/abdullah-nadeem-lodhi/Valorant-3D-Immersive-Guide/tree/0813765657a56d5722760dd0db3a47ac22dc6876

| Agent | File bytes | Vertices | Joints | Animation |
|---|---:|---:|---:|---|
| phoenix | 5981616 | 16891 | 186 | phx_kamae (3.0 s) |
| jett | 5839112 | 14656 | 191 | wsh_kamae (1.9 s) |
| sage | 5639376 | 12955 | 204 | trn_kamae (18.03 s) |
| sova | 7843144 | 18933 | 192 | hnt_kamae (7.5 s) |

## Asset credits and pinned downloads

Each GLB embeds credit to BojanV06 and declares CC-BY-4.0. This metadata is preserved in the downloaded files. The embedded original source links are listed below. The GitHub project itself has no top-level license file in the inspected tree; do not assume its unrelated application code has the same license as these individual models.

- Phoenix: [pinned GLB](https://github.com/abdullah-nadeem-lodhi/Valorant-3D-Immersive-Guide/blob/0813765657a56d5722760dd0db3a47ac22dc6876/public/phoenix/phoenix_animated.glb), [credited original listing](https://sketchfab.com/3d-models/phoenix-fighting-stance-bcc9e29d2a044802bf0bcc8e9d68880d). SHA-256: `46b84d62a9a723d4cf113dc6f269dae7a8d8828954025e74f1f02b1b007544f2`.
- Jett: [pinned GLB](https://github.com/abdullah-nadeem-lodhi/Valorant-3D-Immersive-Guide/blob/0813765657a56d5722760dd0db3a47ac22dc6876/public/jett/jett_animated.glb), [credited original listing](https://sketchfab.com/3d-models/jett-fighting-stance-69f7b293673a4e418d22133fd50a0857). SHA-256: `1ef2fd903390073199c284488120bad8ae5360a5cc20dba6bd1a6c6151386f6c`.
- Sage: [pinned GLB](https://github.com/abdullah-nadeem-lodhi/Valorant-3D-Immersive-Guide/blob/0813765657a56d5722760dd0db3a47ac22dc6876/public/sage/sage_animated.glb), [credited original listing](https://sketchfab.com/3d-models/sage-fighting-stance-bd892217cebc457ba79b95d301704a43). SHA-256: `ed6ce0a06dfda32a93b0dddfd4fa604e4effec2d8205122f6cf2a1e289743562`.
- Sova: [pinned GLB](https://github.com/abdullah-nadeem-lodhi/Valorant-3D-Immersive-Guide/blob/0813765657a56d5722760dd0db3a47ac22dc6876/public/sova/sova_animated.glb), [credited original listing](https://sketchfab.com/3d-models/sova-fighting-stance-ff28941ea4b24e5f8736d14d506c15b1). SHA-256: `b3c8dbb425eb0f10cea94995c126c6e11c976c2ee974e846ab7e44da9a9abc71`.

## Reusable parts and practical limits

- Phoenix has separate body, hair and eye meshes. This is a full-body candidate from a different repository; the absence of Phoenix in open-aim does not mean it is unavailable elsewhere.
- Sage includes a separate `TP_Thorne_S0_Orb_MI` mesh. It must be visually checked and baked out of the character rig before treating it as a throwable skill prop.
- Sova includes separate `Hunter_Bow_Emissive`, `Hunter_BowProp`, and `Hunter_E_GauntletMode` meshes, useful candidates for replacing approximate bow/gauntlet visuals.
- Every file has one fighting-stance/idle animation, not a complete locomotion, weapon handling or first-person ability animation set. The existing game uses a different skeleton and actor alignment; direct replacement needs rig mapping, scale checks and hitbox agreement.
- Files are roughly 5.6–7.8 MB each. Keep them out of the gameplay initial bundle until optimized and validated; downloading all four at game start would add about 25.3 MB.

This document records the initial research stage. Subsequent game integration is documented in [the integration note](referenced-model-integration.md).
