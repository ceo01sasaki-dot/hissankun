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
 const multiplicationCarry=(row,col,text)=>({row,col,text,kind:'carry-answer'});
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
    for(let z=k;z<=j;z++){
     marks.push({row:settings.borrow==='side'?3:2,col:R-z,text:cur[z],kind:settings.borrow==='side'?'borrow-side':'borrow'});
     if(z>k)marks.push({row:3,col:R-z,kind:'strike'});
    }
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
    if(v>=10&&k<A.length-1)marks.push(multiplicationCarry(row,R-k-j-1,Math.floor(v/10)));
    step(v,row,R-k-j,`${places[j]}の位の ${y}を かけよう。${x}×${y}${carry?'＋'+carry+'（くりあがり）':''}は？`,marks,[[3,R-k],[4,R-j]],{hint:`${x}が ${y}こ分だよ。${carry?'さいごに '+carry+'を たそう。':''}`,parts:[x,y,carry],table:{base:y,factor:x,carry}});carry=Math.floor(v/10);
   }
   for(let z=0;z<j;z++)steps.at(-1).marks.push({row,col:R-z,text:0,kind:'answer'});
  }
  if(B.length>1){steps.at(-1).marks.push({kind:'clear-carry'});const row=5+B.length;line(steps.at(-1).marks,row-1,R-String(a*b).length,R);let carry=0;
   for(let k=0;k<String(a*b).length;k++){
    const ds=partials.map(n=>digit(String(n),k)),v=ds.reduce((s,n)=>s+n,carry),marks=[];put(marks,k===String(a*b).length-1?v:v%10,row,R-k,'answer');
    if(v>=10&&k<String(a*b).length-1)marks.push(multiplicationCarry(row,R-k-1,Math.floor(v/10)));
    step(v,row,R-k,`さいごに たそう。${ds.join('＋')}${carry?'＋'+carry:''}は？`,marks,ds.map((_,j)=>[5+j,R-k]),{hint:'位を そろえて、右から じゅんに たそう。'});carry=Math.floor(v/10);
   }
  }
 }
 if(op==='/'){
  // The divisor touches the bracket; each dividend digit occupies one cell.
  const firstCol=B.length+2,lastCol=firstCol+A.length-1;
  put(base,B,2,firstCol-1);put(base,A,2,lastCol);
  base.push({row:2,col:firstCol,end:lastCol,kind:'division'});
  const cells=(row,right,length)=>Array.from({length},(_,i)=>[row,right-i]);
  const divisorCells=cells(2,firstCol-1,B.length);
  const explain=(message,phase='intro',highlight=[])=>steps.push({type:'info',phase,message,highlight,marks:[]});
  const input=(expected,row,col,phase,message,marks,highlight,extra={})=>{
   const width=String(expected).length;
   step(expected,row,col,message,marks,highlight,{type:'input',phase,width,maxLength:width,...extra});
  };
  explain('わり算は「たてる → かける → ひく → おろす」を くりかえすよ。');
  let prefixLength=1;
  while(Number(A.slice(0,prefixLength))<b)prefixLength++;
  let working=Number(A.slice(0,prefixLength)),workingRow=2,productRow=3;
  if(prefixLength>1)explain(`${A.slice(0,prefixLength-1)}では ${b}で われないね。${working}で 考えよう。`,'intro',cells(2,firstCol+prefixLength-1,prefixLength));
  for(let k=prefixLength-1;k<A.length;k++){
   const col=firstCol+k,quotient=Math.floor(working/b),hasNext=k<A.length-1;
   input(quotient,1,col,'quotient',`たてる：${working}÷${b}の こたえを、${A[k]}の 上に たてよう。`,
    [{row:1,col,text:quotient,kind:'answer'}],cells(workingRow,col,String(working).length).concat(divisorCells),
    {hint:`${b}×□ が ${working}を こえない、いちばん 大きい □を さがそう。`,table:{base:b,factor:quotient,dividend:working},dividend:working,divisor:b,success:quotient===0?`${working}は ${b}より 小さいから、商に 0を たてるよ。`:undefined});
   // A zero belongs in the quotient. Do not introduce a spurious 0×b / subtraction row.
   if(quotient!==0){
    const product=quotient*b,remainder=working-product,productMarks=[];
    put(productMarks,product,productRow,col,'working');
    line(productMarks,productRow,col-Math.max(String(working).length,String(product).length)+1,col);
    input(product,productRow,col,'product',`かける：たてた ${quotient}と、わる数の ${b}を かけよう。`,productMarks,[[1,col],...divisorCells],
     {hint:`${quotient}×${b}の こたえを、位を そろえて 下に かこう。`,table:{base:b,factor:quotient},success:`${quotient}×${b}＝${product} だね。`});
    const remainderMarks=[];
    if(remainder!==0||!hasNext)put(remainderMarks,remainder,productRow+1,col,'working');
    input(remainder,productRow+1,col,'subtract',`ひく：${working}−${product}を しよう。`,remainderMarks,
     cells(workingRow,col,String(working).length).concat(cells(productRow,col,String(product).length)),
     {hint:`${working}から ${product}を ひこう。のこりは ${b}より 小さくなるよ。`,
      success:remainder===0&&hasNext?'0だね。とちゅうの 0は かかずに、つぎの数を おろそう。':undefined});
    working=remainder;workingRow=productRow+1;productRow+=2;
   }
   if(hasNext){
    const nextDigit=Number(A[k+1]),nextValue=working*10+nextDigit,marks=[];
    if(nextValue!==0)marks.push({row:workingRow,col:col+1,text:nextDigit,kind:'working'});
    input(nextDigit,workingRow,col+1,'bring-down',`おろす：つぎの ${nextDigit}を 下に おろそう。`,marks,[[2,col+1]],
     {hint:'上の数字を、そのまま 同じ位の 下へ おろそう。',targetDividend:(working>0?cells(workingRow,col,String(working).length):[]).concat([[2,col+1]]),arrow:{from:[2,col+1],to:[workingRow,col+1]},
      success:nextValue===0?'0を おろしたね。つぎは 商に 0を たてよう。':`${nextValue}に なったね。つぎの商を 考えよう。`});
    working=nextValue;
   }
  }
  explain(a%b===0?'あまりは 0。わりきれたね！':`のこりの ${a%b}は ${b}より 小さいから おわり。あまりは ${a%b}だよ。`,'finish',cells(workingRow,lastCol,String(a%b).length));
  // Keep the actual operands colored throughout every division stage.
  let activeDividend=cells(2,firstCol+prefixLength-1,prefixLength);
  for(const stage of steps){
   if(stage.phase==='finish')activeDividend=stage.highlight;
   if(stage.phase==='bring-down')activeDividend=stage.targetDividend;
   if(stage.phase==='quotient')activeDividend=stage.dividend===0?[[2,stage.col]]:cells(stage.highlight[0][0],stage.col,String(stage.dividend).length);
   stage.operandHighlights={dividend:activeDividend.map(cell=>[...cell]),divisor:divisorCells.map(cell=>[...cell])};
  }
 }

 const result=op==='+'?a+b:op==='-'?a-b:op==='*'?a*b:Math.floor(a/b);
 return {base,steps,result,remainder:op==='/'?a%b:0};
}
