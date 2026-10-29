// Procedural ice sounds for this trainer; no new sample downloads are needed.
export function playIce(ctx,kind='step',volume=.15,pan=0){
 if(!ctx)return;const now=ctx.currentTime,duration=kind==='shatter'?.32:kind==='bounce'?.09:.13;
 const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<data.length;i++){const t=i/data.length;data[i]=(Math.random()*2-1)*Math.exp(-t*8)*(Math.sin(t*60)>.1?1:.25);}
 const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type='highpass';filter.frequency.value=kind==='shatter'?900:1800;gain.gain.value=volume;source.connect(filter);filter.connect(gain);
 const panner=ctx.createStereoPanner?.();if(panner){panner.pan.value=Math.max(-1,Math.min(1,pan));gain.connect(panner);panner.connect(ctx.destination);}else gain.connect(ctx.destination);
 source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();panner?.disconnect();};source.start();
 for(const freq of kind==='shatter'?[1850,2630,3710]:[kind==='bounce'?2300:3100]){const tone=ctx.createOscillator(),envelope=ctx.createGain();tone.type='sine';tone.frequency.setValueAtTime(freq,now);tone.frequency.exponentialRampToValueAtTime(freq*.6,now+duration);envelope.gain.setValueAtTime(volume*.3,now);envelope.gain.exponentialRampToValueAtTime(.001,now+duration);tone.connect(envelope);envelope.connect(gain);tone.onended=()=>{tone.disconnect();envelope.disconnect();};tone.start();tone.stop(now+duration);}
}
