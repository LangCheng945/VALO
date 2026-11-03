# Deployed ability props

These are **community recreations**, not verified original Riot game model extractions. Do not label them as original in the UI or release notes.

Source: [staticaron/CypherAgent](https://github.com/staticaron/CypherAgent), commit `0ea103e4b3901597a008b6e6b37ea58a03db0e7f`. The repository's MIT notice is retained verbatim in `STATICARON-LICENSE.txt`. VALORANT character and ability designs belong to Riot Games.

| Local asset | Actual upstream content | Use |
| --- | --- | --- |
| `cypher-hat.glb` | `Assets/Assets/Models/Cypher/CypherHat.fbx` and `Assets/Assets/CypherHatTex.png` | Textured hat thrown toward an enemy corpse for Neural Theft. |
| `cypher-cage-shell.glb` | `Assets/Assets/Models/Cypher/smoke.fbx` | Open cylinder mesh for Cyber Cage; its animated shader is authored locally. This is not the thrown cage device. |

The hat is about 84 KiB and the cage shell about 10 KiB. They load on first use, reuse cached templates, and have immediate geometric fallbacks. Per-effect geometry/materials are disposed while cached textures are shared. `provenance.json` records pinned source hashes, output hashes, mesh counts and conversion operations.

Rebuild after obtaining that exact source checkout:

```
blender -b -t 2 --python tools/export-cypher-models.py -- /path/to/CypherAgent
```

The converter imports only pinned static FBX/PNG data; it does not execute upstream scripts. Blender 4.3.2 was used for these GLBs.

The source's camera, cage puck and tripwire prefabs use Unity built-in primitives. No additional detailed camera/tripwire model was found there, so those deployed devices remain locally authored approximations.
