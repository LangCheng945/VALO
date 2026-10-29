// Call both requests from the same user gesture. Fullscreen consumes activation,
// so pointer lock must be requested first, without awaiting either request.
export function requestGamePointerLock(doc,canvas,{timeoutMs=2500}={}){
 if(doc.pointerLockElement===canvas)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  let timer,settled=false;
  const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);doc.removeEventListener('pointerlockchange',changed);doc.removeEventListener('pointerlockerror',failed);error?reject(error):resolve();};
  const changed=()=>{if(doc.pointerLockElement===canvas)finish();};
  const failed=()=>finish(new Error('Pointer lock was declined'));
  doc.addEventListener('pointerlockchange',changed);doc.addEventListener('pointerlockerror',failed);
  timer=setTimeout(()=>finish(new Error('Pointer lock timed out')),timeoutMs);
  try{if(!canvas.requestPointerLock)throw Error('Pointer lock unavailable');const result=canvas.requestPointerLock();result?.then(changed,error=>finish(error));changed();}catch(error){finish(error);}
 });
}
export async function enterGameSession(doc,canvas){
 const pointer=requestGamePointerLock(doc,canvas);
 let full;
 try{full=doc.fullscreenElement?Promise.resolve():doc.documentElement.requestFullscreen({navigationUI:'hide'});}catch(error){full=Promise.reject(error);}
 const [lockResult,fullResult]=await Promise.allSettled([pointer,full]);
 return{locked:doc.pointerLockElement===canvas,fullscreen:!!doc.fullscreenElement,lockError:lockResult.status==='rejected'?lockResult.reason:null,fullscreenError:fullResult.status==='rejected'?fullResult.reason:null};
}
