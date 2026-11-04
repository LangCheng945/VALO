# Skirmish map source research

Riot patch 12.10 (2026-05-27) confirms D and E were added; each includes ramps: https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-12-10/

The community VALORANT API currently lists five Skirmish maps. This API supplies metadata and images, not 3D levels.

| Map | Internal game package | Preview |
|---|---|---|
| Skirmish A | `/Game/Maps/Duel/Duel_1/Skirmish_A` | https://media.valorant-api.com/maps/a9009649-421f-d5d5-f80c-0cbe02c125bb/splash.png |
| Skirmish B | `/Game/Maps/Duel/Duel_2/Skirmish_B` | https://media.valorant-api.com/maps/a38a3f9a-4042-844c-8970-a3ac2f7ce93d/splash.png |
| Skirmish C | `/Game/Maps/Duel/Duel_3/Skirmish_C` | https://media.valorant-api.com/maps/a264de0f-4a04-9c78-c97a-a6b192ce6e86/splash.png |
| Skirmish E | `/Game/Maps/Duel/Duel_Heady/Skirmish_E` | https://media.valorant-api.com/maps/4490f1d6-4818-bf5f-9b3a-9c9a8dbb52ed/splash.png |
| Skirmish D | `/Game/Maps/Duel/Duel_Platform/Skirmish_D` | https://media.valorant-api.com/maps/1c7555fc-4bc6-3b98-9674-789d47ef6c50/splash.png |

Source: https://valorant-api.com/v1/maps?language=en-US

No matching Skirmish A–E, Duel_1–3, Duel_Heady or Duel_Platform scene assets are present in the recursively inspected unkwsr/open-aim commit 807f55721e64ca457d763c64a4a1de7b11e5f3eb. Existing exported maps are not Skirmish maps and should not be relabelled as such. No complete downloadable 3D level was confirmed in GitHub repository search. These maps have not been added to game selection.
