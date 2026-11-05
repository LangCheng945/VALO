# LAN multiplayer implementation

The Node server imports the existing `GameRoom` rules from `multiplayer/worker.mjs`. The only Cloudflare-specific room admission operation was extracted as `attachSocket`; Workers still use their native `WebSocketPair` and response. LAN supplies in-memory storage, serialized room execution, WebSocket attachments and alarm timers. It never calls the Cloudflare Worker routing entry point, a Durable Object binding, SQL, or an external game API.

`lan/server.mjs` provides same-origin game HTTP hosting, `/health`, room creation and WebSocket admission (10 players/room). Optional trusted certificates enable HTTPS/WSS. Static paths and origins are validated; incoming packets retain the original size/rate checks and authoritative health/damage/skills/Spike/round logic. Rooms and reconnect tickets are lost on server restart, intentionally.

LAN clients send positions around 15 Hz, rounded to 0.001 world units. Unchanged state is suppressed with a one-second keepalive; sockets also ping every five seconds. Room snapshots are coalesced to at most 20 Hz. Capable LAN clients negotiate `lanVersion:1` and receive player deltas/removals; legacy clients receive compatible full `players` snapshots. Unchanged snapshots are omitted; WebSocket permessage-deflate is available. Existing client interpolation is reused.

The public site's LAN selector only provides navigation to the LAN-hosted page; it does not attempt insecure WS from an HTTPS page. LAN-hosted HTML identifies itself before initialization, avoids managed Cloudflare discovery and removes remote font requests. Tailwind is vendored. A crypto.getRandomValues UUID fallback supports HTTP LAN contexts where randomUUID is unavailable. No security flags, browser TLS checks, firewall rules or administrator elevation are disabled.

## Windows build

`lan/build-windows.mjs` bundles server code, uses official Node.js 22.23.4 Linux/Windows binaries with SHA-256 verification against the official release checksums, prepares a matching SEA blob without snapshot/code cache, removes the obsolete Authenticode directory from the copied executable, and injects the application. The package includes a portable official node.exe fallback, server.cjs, game assets and licenses. It does not require installing Node.js. The exe is unsigned and has not been run on physical Windows in this cloud environment.

The pre-existing user changes in agent-avatar.js are excluded from commits and portable package copies; the committed file is used for that package entry.

## Tests

- `node --test lan/tests/*.test.mjs`: server rules/admission, five clients, movement/shooting/health validation, reconnect, round score, delta/unchanged suppression, leave/shutdown, path/origin/payload/capacity checks, HTTPS/WSS with explicit trusted CA and rejection of an untrusted certificate.
- `lan/tests/browser.cjs`: five real browser RoomClients, sustained movement, automatic reconnect preserving identity, UUID fallback, actual game menu and join, external requests denied, server-close prompt. Observed SQL writes: zero. Alternate interface navigation returned HTTP 503 in the cloud network; it is not reported as a successful cross-machine test.
- `lan/tests/bundle-smoke.mjs`: self-contained bundled server, five WebSocket clients, local assets and health.
- Existing Cloudflare Worker regression: 13 tests passed (agents, rooms/reconnect/capacity/map identities, skills, Spike and Vyse).
- Sites production build passes.

A physical second school computer and physical Windows 10/11 execution cannot be validated from this cloud workspace. School VLAN isolation, inbound firewall policy and certificate trust require on-site acceptance. The server does not alter or bypass those policies. Outbound network denial tests establish independence from Cloudflare quota; they do not deliberately exhaust a live Cloudflare account.
