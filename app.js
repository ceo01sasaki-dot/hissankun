import {symbols,parseFormula,buildPlan} from './arithmetic.js?v=1.2.0';
import {createSoundPlayer} from './sound.js?v=1.2.0';
const $=id=>document.getElementById(id),storageKey='sasakky-hissan-v1';
let settings={carry:'up',borrow:'up',sound:true},state={formula:'',problem:null,index:0,input:''},history=[],future=[],plan=null,feedback='',feedbackType='',timer;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const display=s=>[...s].map(c=>symbols[c]||c).join('');
const copy=s=>structuredClone(s);
try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved){settings={...settings,...saved.settings};if(saved.state&&typeof saved.state.formula==='string'){state=saved.state;if(state.problem){const p=parseFormula(`${state.problem.a}${state.problem.op}${state.problem.b}`);if(p.error)throw Error();state.problem=p;plan=buildPlan(p,settings);if(!Number.isInteger(state.index)||state.index<0||state.index>plan.steps.length)state.index=0;}}}}catch{state={formula:'',problem:null,index:0,input:''};plan=null;}
function save(){try{localStorage.setItem(storageKey,JSON.stringify({settings,state}));}catch{}}
function snapshot(){history.push(copy(state));if(history.length>200)history.shift();future=[];}
const sound=createSoundPlayer({enabled:()=>settings.sound});

function stopFeedback(){clearTimeout(timer);feedback='';feedbackType='';}
function animate(id,cls){$(id).classList.remove(cls);void $(id).offsetWidth;$(id).classList.add(cls);}
function fail(text){stopFeedback();feedback=text;feedbackType='error';sound('error');render({paper:false});animate('entry','shake');}
const current=()=>plan?.steps[state.index];
function render({paper=true}={}){
 const c=current();
 if(paper){
 const svg=[];
 svg.push('<defs><pattern id="small" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#83c6ee" stroke-width="1" stroke-dasharray="2 3"/></pattern><pattern id="big" width="56" height="56" patternUnits="userSpaceOnUse"><rect width="56" height="56" fill="url(#small)"/><path d="M56 0H0V56" fill="none" stroke="#299dd5" stroke-width="1.5"/></pattern></defs><rect width="896" height="672" fill="url(#big)"/>');
 for(let n=5;n<=30;n+=5){svg.push(`<text x="${n*28}" y="-7" text-anchor="middle" fill="#2997c8" font-size="13">${n}</text><text x="${n*28}" y="690" text-anchor="middle" fill="#2997c8" font-size="13">${n}</text>`);}
 for(let n=5;n<=20;n+=5)svg.push(`<text x="-8" y="${n*28+4}" text-anchor="middle" fill="#2997c8" font-size="13">${n}</text><text x="906" y="${n*28+4}" fill="#2997c8" font-size="13">${n}</text>`);
 svg.push('<text x="28" y="20" text-anchor="middle" font-size="12" fill="#27334a">しき</text><text x="28" y="50" text-anchor="middle" font-size="35" font-weight="bold" fill="#27334a">式</text>');
 let marks=[];
 if(plan){marks=[...plan.base];for(let i=0;i<state.index;i++)marks.push(...plan.steps[i].marks);if(c?.borrowed)marks.push(...c.marks.filter(m=>m.kind?.startsWith('borrow')));const cleaned=[];for(const m of marks){if(m.kind==='clear-carry'){for(let j=cleaned.length-1;j>=0;j--)if(['carry','carry-down'].includes(cleaned[j].kind))cleaned.splice(j,1);}else{const old=cleaned.findIndex(x=>x.row===m.row&&x.col===m.col&&x.kind===m.kind);if(old>=0)cleaned.splice(old,1);cleaned.push(m);}}marks=cleaned;}
 if(c)for(const [row,col]of c.highlight||[])svg.push(`<rect x="${col*56+2}" y="${row*56+2}" width="52" height="52" rx="6" fill="#ffdc6270"/>`);
 const formula=plan?`${state.problem.a}${state.problem.op}${state.problem.b}`:state.formula;
 if(plan)[...display(formula)].forEach((text,k)=>marks.push({row:0,col:k+1,text}));
 for(const m of marks){const x=m.col*56,y=m.row*56;if(m.kind==='line'){svg.push(`<path d="M${x} ${y+57}H${(m.end+1)*56}" stroke="#283344" stroke-width="3"/>`);continue;}if(m.kind==='division'){svg.push(`<path d="M${x+56} ${y}H${(m.end+1)*56}M${x+56} ${y}Q${x+40} ${y+28} ${x+56} ${y+56}" fill="none" stroke="#283344" stroke-width="3"/>`);continue;}
 const small=['carry','carry-down','borrow','borrow-side'].includes(m.kind),side=m.kind?.endsWith('side')||m.kind==='carry-down';svg.push(`<text x="${x+(side?10:28)}" y="${y+(side?18:small?49:46)}" text-anchor="middle" font-size="${small?23:43}" font-weight="${small?600:700}" fill="${small?'#258b9e':m.kind==='answer'?'#244a91':'#263344'}">${escape(m.text)}</text>`);
 }
 $('grid').innerHTML=svg.join('');
 }
 const done=plan&&state.index>=plan.steps.length;
 $('entry').classList.toggle('hidden',!!done);
 const row=c?.row||0,col=c?.col||1,width=plan?Math.max(1,state.input.length):9;
 Object.assign($('entry').style,{top:(row/12*100)+'%',left:((col-(plan?width-1:0))/16*100)+'%',width:(width/16*100)+'%'});
 $('entry').textContent=plan?state.input:display(state.formula);
 let message=feedback||(!plan?(state.formula?'入れたら「けってい」を おそう。':'まず <ruby>赤<rt>あか</rt></ruby>い わくに <ruby>式<rt>しき</rt></ruby>を <ruby>入<rt>い</rt></ruby>れよう'):done?'ぜんぶ できたね！<br>よく がんばりました。':escape(c.message));
 $('message').innerHTML=`${plan&&!done?`<span class="progress">${state.index+1} / ${plan.steps.length} ステップ</span>`:''}<span class="${feedbackType}">${message}</span>`;
 $('actions').innerHTML=done?'<button class="gloss green" data-action="new">あたらしい式</button><button class="gloss gray" data-action="retry">もういちど</button>':plan?'<button class="gloss pink" data-action="hint">アシストを みる？</button>':'';
 $('undo').disabled=history.length===0;$('redo').disabled=future.length===0;
 document.querySelectorAll('[data-key]').forEach(button=>{button.disabled=!!done||(!!plan&&'+-*/'.includes(button.dataset.key));});
 $('status').textContent=plan?(done?`${display(`${state.problem.a}${state.problem.op}${state.problem.b}`)} ＝ ${plan.result}${plan.remainder?' あまり '+plan.remainder:''}`:'学習のとちゅうも 自動で 保存されます。'):'じぶんの ペースで、ひとつずつ。';save();
}
function key(k){
 if($('dialog').open)return;
 if(k==='Enter'){confirm();return;}
 if(plan&&state.index>=plan.steps.length)return;
 if(k==='Backspace'){if(!(plan?state.input:state.formula))return;snapshot();if(plan)state.input=state.input.slice(0,-1);else state.formula=state.formula.slice(0,-1);stopFeedback();render({paper:false});sound();return;}
 if(!/^[0-9+\-*/]$/.test(k))return;
 if(plan){if(!/^\d$/.test(k))return;if(state.input.length>=4)return;snapshot();state.input+=k;}
 else{
  const m=/^(\d*)([+\-*/]?)(\d*)$/.exec(state.formula);if(!m)return;
  let [,a,op,b]=m;
  if('+-*/'.includes(k)){if(!a)return fail('さきに 数を 入れてね。');if(op&&b)return fail('計算の きごうは 1つだけだよ。');op=k;}
  else if(!op){if(a.length>=4)return fail('さいしょの数は 4けたまでだよ。');a=a==='0'?k:a+k;}
  else{const lim=op==='*'?3:op==='/'?2:4;if(b.length>=lim)return fail(`うしろの数は ${lim}けたまでだよ。`);b=b==='0'?k:b+k;}
  snapshot();state.formula=a+op+b;
 }
 stopFeedback();render({paper:false});sound();
}
function confirm(){
 if(!plan){const p=parseFormula(state.formula);if(p.error)return fail(p.error);snapshot();state.problem=p;state.index=0;state.input='';plan=buildPlan(p,settings);stopFeedback();sound('ok');render();return;}
 const c=current();if(!c)return;if(state.input==='')return fail('赤いわくに こたえを 入れてね。');
 if(Number(state.input)!==c.expected){snapshot();state.input='';return fail('おしい！ もういちど 考えてみよう。');}
 snapshot();state.index++;state.input='';feedback=c.success||'せいかい！ そのちょうし！';feedbackType='success';sound('ok');animate('mascot','hop');render();clearTimeout(timer);
 if(!current()){sound('clear');confetti();timer=setTimeout(()=>{stopFeedback();render();completion();},800);}else timer=setTimeout(()=>{stopFeedback();render();},1100);
}
function reset(){snapshot();stopFeedback();state={formula:'',problem:null,index:0,input:''};plan=null;render();}
function restore(s){state=s;plan=state.problem?buildPlan(state.problem,settings):null;stopFeedback();render();}
function modal(html){$('dialog-content').innerHTML=html;$('dialog').showModal();}
function close(){ $('dialog').close(); }
function completion(){modal(`<div class="celebrate">✦ できたね！ ✦</div><h2 id="dialog-title">よく がんばりました！</h2><p class="answer-text">${display(`${state.problem.a}${state.problem.op}${state.problem.b}`)} ＝ ${plan.result}${plan.remainder?'<br>あまり '+plan.remainder:''}</p><button class="gloss green close" data-action="new">あたらしい式</button><button class="gloss gray close" data-action="close">このまま みる</button>`);}
function confetti(){const el=document.createElement('div');el.className='confetti';for(let i=0;i<50;i++){const p=document.createElement('i');p.style.cssText=`left:${Math.random()*100}%;background:${['#6bc6ce','#f2bb5c','#b7a0df','#f3a7b7'][i%4]};animation-delay:${Math.random()*.7}s`;el.append(p);}document.body.append(el);setTimeout(()=>el.remove(),4000);}
function showSettings(){
 const group=(label,name,values)=>`<h3>${label}</h3><div class="options">${values.map(([v,t])=>`<button data-setting="${name}" data-value="${v}" aria-pressed="${String(settings[name])===v}">${t}</button>`).join('')}</div>`;
 modal(`<h2 id="dialog-title">⚙ せってい</h2>${group('くりあがりを かく場所','carry',[['up','うえの だん'],['down','こたえの マス']])}${group('くりさがりを かく場所','borrow',[['up','うえの だん'],['side','数の みぎうえ']])}${group('こうかおん','sound',[['true','あり ♪'],['false','なし']])}<button class="gloss purple close" data-action="close">とじる</button><p class="credit">ひっ算おたすけ君 ver 1.2.0<br>つくった人：ささっきー</p>`);
}
function hint(){
 const c=current();if(!c)return;
 let visual='';
 if(c.table){
  const {base,factor,carry=0,dividend}=c.table;
  const first=Math.max(0,factor-1),last=Math.min(10,factor+1);
  visual=`<section class="times-hint" aria-label="${base}のだんのヒント"><h3>${base}の だん${base<=9?'（九九）':'（かけ算のひょう）'}</h3>${Array.from({length:last-first+1},(_,i)=>{const n=first+i;return `<div class="times-row ${n===factor?'current':''}"${n===factor?' aria-current="true"':''}>${base} × ${n} ＝ <strong>${base*n}</strong></div>`;}).join('')}${carry?`<p class="times-note">${base} × ${factor} ＝ ${base*factor}<br>くりあがりの ${carry}も たして、<br>${base*factor} ＋ ${carry} ＝ <strong>${c.expected}</strong></p>`:''}${dividend!==undefined?`<p class="times-note">${base} × □ が ${dividend}を こえない、<br>いちばん 大きい □を さがそう。</p>`:''}</section>`;
 }else if(c.parts&&state.problem.op==='+')visual=`<div class="beads" aria-label="数を表す丸">${Array.from({length:c.parts.reduce((a,b)=>a+b,0)},(_,i)=>`<i class="bead ${i>=c.parts[0]?'alt':''}"></i>`).join('')}</div>`;
 modal(`<h2 id="dialog-title">いっしょに 考えよう</h2><p>${escape(c.message)}</p><p>${escape(c.hint||'右の位から じゅんに 計算しよう。')}</p>${visual}<button class="gloss green close" data-action="close">やってみる</button><button class="gloss sand close" data-action="reveal">こたえを みる</button>`);
}
$('keypad').innerHTML=[['7','7'],['8','8'],['9','9'],['+','＋'],['4','4'],['5','5'],['6','6'],['-','−'],['1','1'],['2','2'],['3','3'],['*','×'],['0','0'],['Backspace','⌫'],['/','÷'],['Enter','けってい']].map(([k,label])=>`<button class="gloss ${'+-*/'.includes(k)?'orange':k==='Enter'?'green confirm':k==='0'?'zero':k==='Backspace'?'gray':''}" data-key="${k}" aria-label="${k==='Backspace'?'一文字けす':label}">${label}</button>`).join('');
// Delete on contact rather than release, with one deletion per tap.
let deleteDelay,deleteRepeat;
function stopDelete(){clearTimeout(deleteDelay);clearInterval(deleteRepeat);}
$('keypad').addEventListener('pointerdown',e=>{
 const button=e.target.closest('[data-key="Backspace"]');
 if(!button||button.disabled||e.button!==0||!e.isPrimary)return;
 e.preventDefault();button.focus({preventScroll:true});key('Backspace');
 deleteDelay=setTimeout(()=>{deleteRepeat=setInterval(()=>key('Backspace'),80);},400);
});
for(const event of ['pointerup','pointercancel'])document.addEventListener(event,stopDelete);
window.addEventListener('blur',stopDelete);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopDelete();});
$('keypad').addEventListener('click',e=>{const b=e.target.closest('[data-key]');if(b&&!b.disabled){if(b.dataset.key==='Backspace'&&e.detail>0)return;key(b.dataset.key);}});
$('undo').onclick=()=>{if(!history.length)return;future.push(copy(state));restore(history.pop());sound();};
$('redo').onclick=()=>{if(!future.length)return;history.push(copy(state));restore(future.pop());sound();};
$('reset').onclick=()=>{if(!state.formula&&!plan)return;modal('<h2 id="dialog-title">はじめから やりなおす？</h2><p>いまの式を けして、あたらしい式を 入れられるよ。</p><button class="gloss sand close" data-action="new">リセットする</button><button class="gloss gray close" data-action="close">このまま つづける</button>');};
$('settings').onclick=showSettings;
function action(e){const b=e.target.closest('[data-action],[data-setting]');if(!b)return;sound();if(b.dataset.setting){const name=b.dataset.setting;settings[name]=name==='sound'?b.dataset.value==='true':b.dataset.value;if(plan)plan=buildPlan(state.problem,settings);close();render();showSettings();return;}switch(b.dataset.action){case'close':close();break;case'new':close();reset();break;case'retry':snapshot();state.index=0;state.input='';stopFeedback();render();break;case'hint':hint();break;case'reveal':{const c=current();close();feedback=`こたえは ${c.expected}だよ。赤いわくに 入れてみよう。`;feedbackType='';render();break;}}}
$('actions').addEventListener('click',action);$('dialog-content').addEventListener('click',action);
$('dialog').addEventListener('click',e=>{if(e.target===$('dialog')){const r=$('dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
document.addEventListener('keydown',e=>{if($('dialog').open)return;const k=e.key==='Delete'?'Backspace':e.key==='x'?'*':e.key;if(/^[0-9+\-*/]$/.test(k)||['Enter','Backspace'].includes(k)){e.preventDefault();key(k);}});
render();

// Keep the complete workspace visible, including inside a Canva iframe.
// Measure the unscaled layout so zoom never compounds when the size changes.
let fitFrame;
function fitToScreen(){
 cancelAnimationFrame(fitFrame);
 fitFrame=requestAnimationFrame(()=>{
  const app=$('app');
  const viewportWidth=document.documentElement.clientWidth;
  const viewportHeight=window.visualViewport?.height||window.innerHeight;
  const naturalWidth=viewportWidth<=800?Math.max(320,(viewportWidth-24)/.9):1440;
  app.style.width=naturalWidth+'px';
  const scale=Math.min(.9,(viewportWidth-24)/naturalWidth,(viewportHeight-24)/app.offsetHeight);
  app.style.setProperty('--app-scale',Math.max(.1,scale));
 });
}
window.addEventListener('resize',fitToScreen);
window.visualViewport?.addEventListener('resize',fitToScreen);
new ResizeObserver(fitToScreen).observe($('app'));
document.fonts?.ready.then(fitToScreen);
fitToScreen();
