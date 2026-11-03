# First-person hand articulation

The authored hand meshes now blend between grip and release poses using GPU position/normal morph targets. Finger parts remain merged by material, preserving two hand draw calls per side. Palm pads and nail geometry add silhouette detail without extra materials. Reload reaching, grabbing, insertion and release use deterministic pose timing; knife inspection opens the non-index fingers while preserving the ring grip. Gun inspection also releases the support hand.

Weapon inspection position is computed from animation progress instead of accumulating an offset every frame. Hand updates reuse their vector scratch objects to reduce garbage collection work. This is not a measured FPS claim.

The existing Chrome first-person suite checks five weapon meshes, material batching, morph release/grasp/reset, draw settling at 30/60/144 FPS, weapon swaps, reload ammunition, scoped visibility and page/shader errors. Karambit timing tests and Sites build/lint also apply.

No external hand model is imported in this revision. Research candidates are Ayush-Mohanty/FPS-Arms-3D (the bundled Cransh AK model has its own CC BY 4.0 license and eight animation clips) and wwwriks/wrad-arms (CC0 GLB with finger skinning, no animation clips). They still require art-direction and weapon-grip adaptation before replacing the current hands.
