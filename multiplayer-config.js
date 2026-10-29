// Public endpoints only; never put Cloudflare credentials here.
// /health and /rooms* are routed to the same Worker; the game page remains on GitHub Pages.
window.__multiplayer_preferred_server ||= 'https://valonow.langcheng.uk';
window.__multiplayer_fallback_server ||= 'https://valo.09786593a.workers.dev';
window.__multiplayer_server ||= window.__multiplayer_preferred_server;
