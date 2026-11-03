# Jett first-person appearance

The active default is now [shared Phoenix hands](phoenix-shared-hands.md) at the user’s request. This document records the retained Jett asset integration.

Jett uses the dedicated first-person mesh, skin weights, wrist/finger skeleton and albedo from the pinned open-aim snapshot. This replaces the earlier generic hand experiments only for Jett. Each hand retains 3,924 vertices, 5,979 triangles and 35 joints. Attribution and source files are recorded in `assets/jett-hands/provenance.json`; `tools/export-jett-hands.py` reproduces the hand extraction from the source JSON/bin.

Existing sleeve profiles and weapon mounts remain. Reload release and grasp are driven by original finger-joint rotations; these are local pose adaptations, not the source's full weapon animation clips. Switching away from Jett restores authored hands, including skill/observer hand instances. Async imports cannot attach to a disposed weapon root; private skeleton buffers, meshes and materials are released on swaps.

The first-person cosmetic body uses the selected agent's existing lower-body rig and textures, excludes upper-body triangles, follows the player and uses standing/walk/run/crouch animation. It hides outside the player's live camera and has no gameplay collision or hitboxes. Jumping moves the body with the player; a dedicated airborne animation is not included.

Chrome checks verify real source skin attributes, finger pose recovery, five weapon mounts, rapid swaps, scope hiding, shader errors and low-look body rendering. Sage's dedicated first-person mesh was not present in the inspected source; her existing hands remain.
