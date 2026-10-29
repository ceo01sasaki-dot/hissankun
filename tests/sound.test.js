import test from 'node:test';
import assert from 'node:assert/strict';
import {createSoundPlayer} from '../sound.js';
function fakeContext(){
 const starts=[];
 const ctx={state:'suspended',currentTime:0,destination:{},starts,
  async resume(){await Promise.resolve();this.currentTime=10;this.state='running';},
  createOscillator(){return {frequency:{},connect(){return {connect(){}};},start(t){starts.push(t);},stop(){},disconnect(){}};},
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},disconnect(){}};}
 };return ctx;
}
test('repeated sounds and resume after interruption schedule in the future',async()=>{
 const context=fakeContext(),play=createSoundPlayer({createContext:()=>context});
 await play();assert.equal(context.starts.length,1);assert.ok(context.starts[0]>10);
 context.currentTime=20;await play();assert.equal(context.starts.length,2);assert.ok(context.starts[1]>20);
 context.state='suspended';context.currentTime=0;await play('ok');assert.equal(context.starts.length,4);assert.ok(context.starts.slice(2).every(t=>t>10));
 context.state='interrupted';await play();assert.equal(context.starts.length,5);
});
test('closed audio contexts are replaced and disabled sounds remain silent',async()=>{
 const contexts=[];let enabled=true;const play=createSoundPlayer({enabled:()=>enabled,createContext:()=>{const c=fakeContext();contexts.push(c);return c;}});
 await play();contexts[0].state='closed';await play();assert.equal(contexts.length,2);
 enabled=false;await play();assert.equal(contexts[1].starts.length,1);
});
test('a failed resume does not break input and a later playback can recover',async()=>{
 const context=fakeContext(),resume=context.resume;context.resume=async()=>{throw Error('blocked');};const play=createSoundPlayer({createContext:()=>context});
 await play();assert.equal(context.starts.length,0);context.resume=resume;await play();assert.equal(context.starts.length,1);
});
