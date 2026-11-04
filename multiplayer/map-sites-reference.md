# Plant region calibration

Reference inspected: public `unkwsr/open-aim` commit
`e1e81cf8ea37e5c363d7720c78cb17fedf0edd94`, `site/aim-maps/*.glb`
and corresponding `*.minimap.json`. Local asset hashes remain in
`assets/{ascent,haven,summit,abyss}/provenance.json`.
Summit's source identifier is `plummet`.

The source contains scene geometry and callout centres, **not the original game's
plant-trigger volumes**. These are reconstructed, conservative gameplay regions;
they must not be described as exact Riot boundaries. The top-down floor geometry
was inspected with roofs clipped out. Model coordinates already have their UE
root transform applied; the renderer then applies MAP_SCALE = 4/3.

Evidence used to correct the previous broad rectangles:

| Map | Scene evidence (source units) | Correction |
| --- | --- | --- |
| Ascent A | `AGRound_5_BombsiteA`: floor y≈5, max x≈−65 | Exclude the main courtyard to the east; preserve the raised site platform. |
| Ascent B | `BombsiteB_0_Ground`: z≈23…49; boathouse callout z=44.85 | Begin at the site floor, exclude lane/stairs and the rear boathouse. |
| Haven A | `Floor_0_ABombsite`: floor y≈3; site centre (−92,−64) | Tighten to the central tiled pad instead of adjoining entrances. |
| Haven B | `Floor_17_BsiteGrateFloor`: y≈3, centre (−93,−19) | Keep the surrounding interior platform; reject the underground layer. |
| Haven C | `Shell_24_CSiteFloorStripes`: x≈−103.97…−89.89, z≈16.80…36.95, y≈2 | Align with the striped site pad instead of the entire C courtyard. |
| Summit A | `PLUM_Shell_Garden_ASite_Ground03`: max x≈122, y≈1 | Exclude the empty space east of the courtyard. |
| Summit B | `PLUM_Ground_Academy_BSite_Ground_01`: z begins≈−97, y≈1 | Keep the lower site, exclude the upper interior floor (y≈5.5). |
| Abyss A | `Shell_2_ASite_Floor*`: y≈8; site callout (−2,−43) | Exclude bridge/entrance extremes and the upper layer. |
| Abyss B | `Shell_6_BSiteFloorADU`: y≈6; upper tower floor y≈10 | Keep the lower site while rejecting the overlapping tower. |

Vertical bands include small steps and site props, rather than requiring an
identical floor y everywhere. Client and Worker call the same `spikeSite` function,
including boundary edges and vertical bands. The client additionally requires a
supported, stationary player on the ground before starting installation. The
Worker has no full collision mesh and cannot independently certify floor support.

Sunset uses the newer pinned `807f55721e64ca457d763c64a4a1de7b11e5f3eb`
`app/mods/aim-maps/juliett` package. Gold minimap regions, `Shell_8_ASiteGroundA/E`
(floor 1), `Shell_9_BSiteFloorA/B/C` (floors 2/3/4) and their steps define
conservative stepped polygons. The source callout centres alone are insufficient:
several refer to approaches outside the gold plant footprints. Polygons include
edges and reject floor 0 below the visible site platforms. See `docs/sunset-map.md`
and `assets/sunset/provenance.json` for coordinate and source details.


Visible-floor correction (2026-11-05): the bundled BVH segment-distance helper missed intersections through triangle interiors. Capsule clearance now tests the segment against the face before edge distance, rejecting hidden lower support planes. Corrode A/B planting floors are 5.7–6.8 source metres, matching the visible floor near 6, rather than the hidden proxy near 5. Lotus/Corrode defender spawn heights and Ascent defender clearance are synchronized with the server.
