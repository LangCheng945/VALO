// crypto.getRandomValues is available on local HTTP; randomUUID needs a secure
// context in Chromium. Keep game IDs cryptographically random on LAN HTTP.
(()=>{if(globalThis.crypto&&!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{value(){const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const s=[...b].map(v=>v.toString(16).padStart(2,'0')).join('');return s.slice(0,8)+'-'+s.slice(8,12)+'-'+s.slice(12,16)+'-'+s.slice(16,20)+'-'+s.slice(20);}});})();
