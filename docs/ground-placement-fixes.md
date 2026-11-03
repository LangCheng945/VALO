# Ground interaction fixes

Spike now checks a short ray below the player's feet instead of requiring the transient jump flag and the collision solver's highest neighboring support sample. It still requires an eligible planting region and stationary movement, and rejects rising/falling players. The same client predicate is used in local and network modes; backend planting site/anchor validation remains unchanged.

Sage slow fields use a subdivided grid sampled against actual collision surfaces rather than a flat circle. Unsupported triangles are omitted, and crystal shards follow local support height. Surface checks are bounded to the landing floor and nearby steps (0.45 m up / 1.8 m down), avoiding projection onto far floors. Bloom updates are throttled and stop at full size. Slow movement membership still uses the existing bounded landing-height rule.

Chrome regression covers an actual Ascent site completing plant with a stale jump flag, airborne rejection and a tilted support mesh producing deformed ice. Existing slow-orb tests cover input, wall bounce, expiry, movement and shader errors.
