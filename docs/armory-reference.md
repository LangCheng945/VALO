# Armory research and implementation scope

- Geometry, gunshot audio, regen shield icon and numeric weapon reference: [unkwsr/open-aim](https://github.com/unkwsr/open-aim/tree/e1e81cf8ea37e5c363d7720c78cb17fedf0edd94), source asset commit already used by this project. Numeric literals: `site/_assets/r20261021-1/next/js/BiMsX6Xn.js`. Original static geometry and normals remain unchanged. The source repository MIT license does not license Riot assets.
- Also inspected upstream HEAD `807f55721e64ca457d763c64a4a1de7b11e5f3eb` for Bandit/Warden paths; neither was found in aim-weapons/aim-viewmodel. The latest repository does not establish that this game contains every current official weapon.
- [reuhreuh/valorant-api-client](https://github.com/reuhreuh/valorant-api-client): README changelog adds Bandit, enum UUID `410b2e0b-4ceb-1321-1727-20858f7f3477`. This establishes a community API identifier, not a verified model, damage table or license.
- [EnriqueFelixR/valorant-weapon-roulette](https://github.com/EnriqueFelixR/valorant-weapon-roulette): lists Bandit under sidearms and Warden under rifles. It supplies no models or weapon statistics, and is insufficient to claim official availability or balance.
- Official news request `https://playvalorant.com/zh-tw/news/game-updates/` returned proxy CONNECT 403. No official page was viewed, and no proxy bypass was attempted.

All 18 existing firearm models now equip and fire. Primary/sidearm slots, distance damage and sniper zooms are connected. Shotguns use server-validated pellet batches; animations, weapon spread/recoil, alternate burst modes and shotgun alternate fire are not a complete official reproduction. Gun shapes use the source assets; Smite appearance remains authored by this project.

The pinned armor reference says regen points 25, reserve 50, absorb 1, delay 3 seconds, rate 10/second. This implementation deliberately uses the user's requested reserve 25, with the remaining behavior based on that reference. The UI labels 25 + 25, and does not claim these are the current official defaults. Rebuying worn armor costs credits in the local shop; refund restores the pre-purchase armor snapshot. Multiplayer validates armor actions and regeneration, but the existing game economy still trusts client credits and movement.

Reproduce numeric extraction using `python tools/export-weapon-catalog.py /path/to/open-aim`. The closed parser accepts numeric/string/null/array/object literals only and never executes upstream JavaScript.
