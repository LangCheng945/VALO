# Pinned map-loading dependencies

- Three.js r128 core, GLTFLoader, KTX2Loader, BasisTextureLoader, ktx-parse and zstddec are vendored from the official `three@0.128.0` npm distribution. See THREE-LICENSE.txt and the source-file notices.
- `three-shim.js` re-exports the existing global Three.js r128 classes for the unchanged ES module loaders; it avoids loading another Three.js instance.
- Basis Universal's JS/WASM transcoder is the copy bundled with Three.js r128. See BASIS-LICENSE.txt.
- meshoptimizer's decoder is version 0.18.1. See MESHOPT-LICENSE.txt.
- three-mesh-bvh is version 0.5.23, compatible with the existing r128 engine. See MESH-BVH-LICENSE.txt.

All loader and decoder files are served locally so the model does not depend on the availability of a separate asset website. TLS verification was retained when obtaining these packages.

The Ascent map assets are separate from these libraries. Their source and hashes are recorded in `assets/ascent/provenance.json`; these MIT library licenses do not grant rights to Riot Games' map assets.
