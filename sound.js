// Resume before scheduling: mobile browsers can suspend/interupt a context
// after switching tabs or returning from another app.
export function createSoundPlayer({enabled=()=>true,createContext=()=>new (window.AudioContext||window.webkitAudioContext)()}={}){
 let context;
 return async function play(kind='tap'){
  if(!enabled())return;
  try{
   if(!context||context.state==='closed')context=createContext();
   const active=context;
   if(active.state!=='running')await active.resume();
   if(!enabled()||active.state!=='running')return;
   const now=active.currentTime+.01;
   const notes=kind==='ok'?[659,880]:kind==='clear'?[523,659,784,1047]:kind==='error'?[220,185]:[440];
   notes.forEach((frequency,i)=>{
    const oscillator=active.createOscillator(),gain=active.createGain(),start=now+i*.11;
    oscillator.type='sine';oscillator.frequency.value=frequency;
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.exponentialRampToValueAtTime(.12,start+.01);
    gain.gain.exponentialRampToValueAtTime(.0001,start+.16);
    oscillator.connect(gain).connect(active.destination);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
    oscillator.start(start);oscillator.stop(start+.18);
   });
  }catch{/* Sound is optional; input must continue if a browser blocks audio. */}
 };
}
