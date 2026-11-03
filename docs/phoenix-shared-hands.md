# Shared Phoenix first-person hands

At the user's request, all agents now use the Phoenix first-person hand appearance from the pinned open-aim Classic viewmodel package. Agent identity, ability selection, third-person avatars and the cosmetic lower body are independent of this choice. Dedicated Jett assets remain available in source history/assets, but are not selected by the active hand renderer.

Original hand meshes, finger hierarchies, skin weights, UVs and albedo are extracted from `classic.json/bin` and `arms.png`. Each hand has 35 retained joints; the left has 2,698 vertices / 4,731 triangles and the right 2,021 / 3,597. The existing tailored sleeves use a shared Phoenix-inspired white/gold palette; full source forearm geometry and weapon animation clips are not imported. Reload/inspect/ability release poses remain local adaptations of finger joints.

Source attribution is in `assets/phoenix-hands/provenance.json`. `tools/export-phoenix-hands.py <classic.json> <classic.bin>` reproduces extraction. A shared resource promise bounds network/texture loading, disposed weapon roots cannot receive late attachments, and private mesh/material/skeleton resources are disposed on swaps.

The Chrome shared-hand test checks five weapon mounts, skinning attributes, finger release/recovery, rapid swaps, scope hiding, role switching and shaders. The first-person regression checks ammunition, reload interruption, draw settling and shared palette behavior.
