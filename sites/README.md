# VALO / new ChatGPT Sites project

Uses the official @openai/create-sites 0.3.0 scaffold, Vinext, React and the
Sites hosting plugin. Node >=22.13 is required.

    npm ci
    npm run dev
    npm run build
    npm start

`prepare-game.mjs` copies the shared game from the parent repository into
`public/game` before development/build. The standalone import archive includes
that directory and can build without the parent repository. No CNAME, secret
files, Git history, node_modules or generated Worker state are included.

The page embeds the same-origin game in a full-screen iframe without sandbox
restrictions so mouse lock and user-activated audio work. /api/health checks the
Worker route. `.openai/hosting.json` is packaged by the official Sites plugin.
No D1/R2 bindings are required for the current static game assets.

## Publish a NEW Sites project

Import the complete source folder into a new ChatGPT Sites project, run its
build/preview, then publish from Sites. The CLI scaffold/hosting plugin alone
does not create or publish a managed Sites project. This workspace has no Sites
publication tool or signed-in Sites session; preparation is not publication.
Keep the current valonow.langcheng.uk and existing DNS until the new preview
has been checked. Do not reuse work.langcheng.uk or change its CNAME.

Multiplayer uses the separately deployed WebSocket Worker in ../multiplayer.
Set public/game/multiplayer-config.js to its public URL and add the actual Sites
origin to the Worker ALLOWED_ORIGINS variable. Moving hosting alone does not
provision that backend. Sage resurrection is unavailable without
connected teammates. Skills are trainer approximations: Jett, Sage and Clove have playable kits;
other imported agents remain appearance options. Sage's wall has four destructible
segments. Clove multiplayer requires the `clove-kit-1` Worker feature. Dynamic
door behavior is not reproduced. Ultimate/utility charges are preloaded on training reset.

Game art attribution is in public/game/assets/ascent/provenance.json and
public/game/assets/weapons/README.md. This is an unofficial fan project.
