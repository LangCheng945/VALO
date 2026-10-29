function origin(value){try{const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.search||u.hash||u.pathname!=='/')return '';return u.origin;}catch{return '';}}

// Switch a managed endpoint only after proving that /health is the game Worker,
// rather than GitHub Pages' HTML response. Explicit third-party servers stay selected.
export async function selectMultiplayerServer({current,preferred,fallback},fetcher=fetch){
 const selected=origin(current),custom=origin(preferred),legacy=origin(fallback);
 if(selected&&selected!==custom&&selected!==legacy)return {server:selected,ready:null,custom:false};
 const candidates=[...new Set([custom,legacy,selected].filter(Boolean))];
 for(const server of candidates){
  try{
   const r=await fetcher(server+'/health',{cache:'no-store',signal:AbortSignal.timeout(2500)});
   if(!r.ok)continue;
   const data=await r.json();
   if(data.ok===true&&data.protocol===1&&data.service==='valo-multiplayer')return {server,ready:true,custom:server===custom};
  }catch{ /* Keep a usable legacy address while DNS / Worker routes are pending. */ }
 }
 return {server:legacy||selected||custom,ready:false,custom:false};
}
