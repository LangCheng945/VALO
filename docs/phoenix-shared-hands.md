# Shared Phoenix first-person hands

At the user's request, all agents now use the Phoenix first-person hand appearance from the pinned open-aim Classic viewmodel package. Agent identity, ability selection, third-person avatars and the cosmetic lower body are independent of this choice. Dedicated Jett assets remain available in source history/assets, but are not selected by the active hand renderer.

Original hand meshes, finger hierarchies, skin weights, UVs and albedo are extracted from `classic.json/bin` and `arms.png`. Each hand has 35 retained joints; the left has 2,698 vertices / 4,731 triangles and the right 2,021 / 3,597. Textured source forearm sleeves are now extracted as 830/849 vertices (left/right) and fitted between the wrist and elbow. Source UV/albedo replace the plain authored sleeves. Full source arm/weapon animation clips are not imported. Reload/inspect/ability release poses remain local adaptations of finger joints.

Source attribution is in `assets/phoenix-hands/provenance.json`. `tools/export-phoenix-hands.py <classic.json> <classic.bin>` reproduces extraction. A shared resource promise bounds network/texture loading, disposed weapon roots cannot receive late attachments, and private mesh/material/skeleton resources are disposed on swaps.

The Chrome shared-hand test checks five weapon mounts, skinning attributes, finger release/recovery, rapid swaps, scope hiding, role switching and shaders. The first-person regression checks ammunition, reload interruption, draw settling and shared palette behavior.


## Karambit grip and sleeve correction

The earlier mount positioned the wrist independently from the ring and added a fixed offset after loading Phoenix hands. Its generic finger curl also left an open palm. The karambit now uses the pinned tactical-knife idle finger rotations, transformed to the existing normalized hand basis, and fits the right index joint to the ring center on every update. Inspect rotates the blade around that shared pivot while the other fingers release toward their source rest poses. The index stays engaged. This is a local Prime-style adaptation, not an original Prime//2.0 animation.

Source sleeve geometry retains the original Phoenix jacket/cuff appearance and UVs. It replaces three procedural sleeve/cuff meshes per arm with one textured mesh, with roll fitted to the wrist. Wrist transition triangles exclude triangles already owned by the hand. `tools/export-knife-grip.py <knife-payload-directory>` and `tools/export-phoenix-forearms.py <classic-payload-directory>` reproduce the additional assets. Source/output hashes are recorded in the hand provenance files.

The karambit browser check measures index-to-ring error through multiple inspect phases, verifies source-textured sleeves, and renders draw/idle/inspect/swap states. Existing Phoenix and first-person checks cover firearm mounts, reload, shader validity and rapid swaps. These tests verify functional behavior and rendered poses; they do not establish exact original-game animation equivalence.
