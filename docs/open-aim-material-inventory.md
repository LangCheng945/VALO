# Additional usable source assets

Pinned source: [unkwsr/open-aim](https://github.com/unkwsr/open-aim/tree/e1e81cf8ea37e5c363d7720c78cb17fedf0edd94), `site/aim-viewmodel`. These classifications are based on downloaded JSON payloads, not filenames alone. Source descriptions are community packaging metadata, not an official Riot download catalog.

| Candidate | Verified contents | Integration status |
| --- | --- | --- |
| `killjoy.device.json/bin`, `killjoy.device.df.jpg`, `killjoy.device.mask.png` | 5,059 vertices, 7,050 triangles, metre units, static shell, albedo and emissive mask | Integrated as Lockdown's cosmetic shell. Existing hitbox, HP, countdown and network behavior retained. |
| `killjoy.detain.json` | Intro/loop/outro first-person detention animation descriptions, named moving/held bones, quantization scales | Needs paired binary decoding, phase playback and rig retargeting. |
| `knife.json`, `knife.gun.png` | Tactical knife: 992 vertices / 1,274 triangles, hand rig and animation descriptions | Integrated as the optional Tactical knife alongside the existing Prime-style karambit, with complete arm rigs and source idle/attack/walk tracks. See `tactical-knife-and-jett-hands.md`. |
| `melee.knife.b996f03cc9.json` | Knife idle/run additives and named first-person bones | Requires correct additive-reference pose and corresponding binary; metadata alone is not a playable animation. |
| `viewmodel.equip.json`, `phantom.loco.b0ccd17632.json` | Vandal equip timing/quantized tracks; Phantom idle/run/walk additive clip metadata | Needs full arm/gun rig synchronization and animation time adaptation. |
| `smoke-jett-enemy.73177dc412.json` | Enemy Cloudburst phase definitions, particle emitters, lifetime/size/color/material distributions | Needs the paired mesh/texture buffers and a matching particle-material renderer. |
| `smoke-omen-ally.8d8898e624.json` | Allied Dark Cover loop/telegraph/outro systems and texture/material parameter curves | Needs rendering adaptation; cannot simply load as a glTF scene. |
| `flashfx.sky.json` | Skye victim flash emitters, leaf sprite sheet mapping, lifetime/size curves | Needs controlled screen-space particle rendering tied to the existing flash duration. |
| `muzzle.5073054cbb.json` | Weapon-specific ADS/hip muzzle-system selection and error thresholds | Useful for replacing generic muzzle planes; corresponding material/particle systems need implementation. |

All underlying game assets/designs remain Riot Games property. Repository MIT licensing does not establish an asset redistribution license. No upstream executable JavaScript is executed by this inventory workflow.

## Subsequent verified integration

`site/aim-impact/{bullet-hole.png,hit-burst.png,flash-glow.png}` is now used for wall marks, a four-tile additive impact flash and additive muzzle glow. Original images are retained. Decals remain capped at 45; expired particles and evicted decal geometries/materials are disposed, while shared source textures remain cached. Browser checks cover loaded images, alpha/additive materials, the cap, expiry and shaders.

A separate hand-source check confirmed `jett.json/bin/jett.arms.png` and Phoenix arms embedded in multiple weapon packages. No Sage-specific first-person hand package was found in the inspected `aim-viewmodel` directory. Full-body agent meshes are a different asset category and are not a drop-in first-person replacement.

Map lightmap descriptors, SH irradiance textures, PVS and triangle material classifications are present but remain unintegrated. Their instance/triangle identifiers must be matched before changing lighting, culling or penetration. Current batching/collision construction changes those groupings; copying sidecars alone would not validate the mapping.

## Newer collection package

The newer `807f55721e64ca457d763c64a4a1de7b11e5f3eb` snapshot adds nine verified gun skins and six usable melee packages. They are now integrated, along with the older Jett smoke intro/loop/outro body tracks. [Collection details, motion compatibility and controls](weapon-collection.md). The earlier Vandal equip row above is historical; compatible base equip tracks now also drive collection guns when their own equip is absent. Other particle-system and additive-locomotion rows remain unintegrated.
