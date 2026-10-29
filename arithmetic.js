export const symbols={'+':'＋','-':'−','*':'×','/':'÷'};
const places=['一','十','百','千','万','十万','百万','千万'];
export function parseFormula(value){
 const m=/^(\d{1,4})([+\-*/])(\d{1,4})$/.exec(value);
 if(!m)return {error:'数 → ＋・−・×・÷ → 数 のじゅんに 入れてね。'};
 const a=Number(m[1]),op=m[2],b=Number(m[3]);
 if(op==='*'&&m[3].length>3)return {error:'かける数は 3けたまでに してね。'};
 if(op==='/'&&m[3].length>2)return {error:'わる数は 2けたまでに してね。'};
 if(op==='-'&&a<b)return {error:'大きい数から 小さい数を ひいてね。'};
 if(op==='/'&&b===0)return {error:'0で わることは できないよ。'};
 if(op==='/'&&a<b)return {error:'わられる数を わる数より 大きくしてね。'};
 return {a,b,op};
}
export function buildPlan({a,b,op},settings={}){
 const base=[],steps=[];
 const put=(list,text,row,right,kind='digit')=>[...String(text)].reverse().forEach((text,k)=>list.push({row,col:right-k,text,kind}));
 const line=(list,row,left,right)=>list.push({row,col:left,end:right,kind:'line'});
 const A=String(a),B=String(b),L=Math.max(A.length,B.length),R=op==='*'?A.length+B.length+1:L+2;
 const digit=(s,k)=>Number(s[s.length-1-k]||0);
 const carryMark=(row,col,text)=>({row:settings.carry==='down'?row:2,col,text,kind:settings.carry==='down'?'carry-down':'carry'});
 const step=(expected,row,col,message,marks=[],highlight=[],extra={})=>steps.push({expected,row,col,message,marks,highlight,...extra});
 if(op!=='/'){
  put(base,A,3,R);put(base,B,4,R);base.push({row:4,col:R-L,text:symbols[op]});line(base,4,R-L,R);
 }
 if(op==='+'){
  let carry=0;
  for(let k=0;k<L;k++){
   const x=digit(A,k),y=digit(B,k),v=x+y+carry,marks=[];
   const msg=`${places[k]}の位。${x}＋${y}${carry?'＋'+carry+'（くりあがり）':''}を しよう。`;
   put(marks,k===L-1?v:v%10,5,R-k,'answer');
   if(v>=10&&k<L-1)marks.push(carryMark(5,R-k-1,1));
   step(v,5,R-k,msg,marks,[[3,R-k],[4,R-k]],{hint:`${x}こに ${y}こ${carry?'と くりあがりの '+carry+'こ':''}を あわせよう。10こで ひとまとまりだよ。`,success:v>=10?`${v}だね！ ${v%10}を かいて、1を くりあげよう。`:'せいかい！',parts:[x,y,carry]});carry=Math.floor(v/10);
  }
 }
 if(op==='-'){
  const cur=[...A].reverse().map(Number);
  for(let k=0;k<A.length;k++){
   const y=digit(B,k),marks=[];let borrowed=false;
   if(cur[k]<y){let j=k+1;while(cur[j]===0)j++;cur[j]--;for(let z=j-1;z>k;z--)cur[z]=9;cur[k]+=10;borrowed=true;
    for(let z=k;z<=j;z++)marks.push({row:settings.borrow==='side'?3:2,col:R-z,text:cur[z],kind:settings.borrow==='side'?'borrow-side':'borrow'});
   }
   const x=cur[k],v=x-y;if(k<String(a-b).length)put(marks,v,5,R-k,'answer');
   step(v,5,R-k,`${places[k]}の位。${borrowed?'左の位から 1を かりて、':''}${x}−${y}を しよう。`,marks,[[3,R-k],[4,R-k]],{hint:`${borrowed?'1つ上の位の 1は、この位の 10と 同じだよ。':''}${x}こから ${y}こを とると いくつかな？`,parts:[x,y],borrowed});
  }
 }
 if(op==='*'){
  const partials=[];
  for(let j=0;j<B.length;j++){
   const y=digit(B,j),row=5+j;let carry=0;partials.push(a*y*10**j);
   for(let k=0;k<A.length;k++){
    const x=digit(A,k),v=x*y+carry,marks=[];put(marks,k===A.length-1?v:v%10,row,R-k-j,'answer');
    if(k===0&&j>0)marks.unshift({kind:'clear-carry'});
    if(v>=10&&k<A.length-1)marks.push(carryMark(row,R-k-j-1,Math.floor(v/10)));
    step(v,row,R-k-j,`${places[j]}の位の ${y}を かけよう。${x}×${y}${carry?'＋'+carry+'（くりあがり）':''}は？`,marks,[[3,R-k],[4,R-j]],{hint:`${x}が ${y}こ分だよ。${carry?'さいごに '+carry+'を たそう。':''}`,parts:[x,y,carry],table:{base:y,factor:x,carry}});carry=Math.floor(v/10);
   }
   for(let z=0;z<j;z++)steps.at(-1).marks.push({row,col:R-z,text:0,kind:'answer'});
  }
  if(B.length>1){steps.at(-1).marks.push({kind:'clear-carry'});const row=5+B.length;line(steps.at(-1).marks,row-1,R-String(a*b).length,R);let carry=0;
   for(let k=0;k<String(a*b).length;k++){
    const ds=partials.map(n=>digit(String(n),k)),v=ds.reduce((s,n)=>s+n,carry),marks=[];put(marks,k===String(a*b).length-1?v:v%10,row,R-k,'answer');
    if(v>=10&&k<String(a*b).length-1)marks.push(carryMark(row,R-k-1,Math.floor(v/10)));
    step(v,row,R-k,`さいごに たそう。${ds.join('＋')}${carry?'＋'+carry:''}は？`,marks,ds.map((_,j)=>[5+j,R-k]),{hint:'位を そろえて、右から じゅんに たそう。'});carry=Math.floor(v/10);
   }
  }
 }
 if(op==='/'){
  const start=5;put(base,A,3,start+A.length-1);put(base,B,3,start-2);base.push({row:3,col:start-1,end:start+A.length-1,kind:'division'});
  let rem=0,row=4,started=false;
  for(let k=0;k<A.length;k++){
   const current=rem*10+Number(A[k]),col=start+k,q=Math.floor(current/b),product=q*b,r=current-product;
   if(!started&&q===0&&k<A.length-1){rem=current;continue;}started=true;
   step(q,2,col,`たてる：${current}÷${b}の こたえを 上に たてよう。`,[{row:2,col,text:q,kind:'answer'}],[[3,col]],{hint:`${b}の だんを 思い出そう。${b}×□ が ${current}を こえない 一番大きな数は？`,table:{base:b,factor:q,dividend:current}});
   const mult=[];put(mult,product,row,col);line(mult,row,col-Math.max(String(current).length,String(product).length)+1,col);
   step(product,row,col,`かける：${q}×${b}は いくつかな？`,mult,[[2,col],[3,start-2]],{hint:`いま たてた ${q}と、わる数の ${b}を かけよう。`,table:{base:b,factor:q}});
   const sub=[];put(sub,r,row+1,col,'answer');
   step(r,row+1,col,`ひく：${current}−${product}を しよう。`,sub,[[row,col]],{hint:`のこりが ${b}より 小さくなるか 確かめよう。`});
   if(k<A.length-1)step(Number(A[k+1]),row+1,col+1,`おろす：つぎの ${A[k+1]}を 下に おろそう。`,[{row:row+1,col:col+1,text:A[k+1]}],[[3,col+1]],{hint:'つぎの位の 数字を そのまま 赤いわくに 入れよう。'});
   rem=r;row+=2;
  }
 }
 const result=op==='+'?a+b:op==='-'?a-b:op==='*'?a*b:Math.floor(a/b);
 return {base,steps,result,remainder:op==='/'?a%b:0};
}
