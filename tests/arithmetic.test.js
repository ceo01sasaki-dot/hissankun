import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFormula,buildPlan} from '../arithmetic.js';
function plan(s,settings){const p=parseFormula(s);assert.equal(p.error,undefined);return buildPlan(p,settings);}
function rowValue(p,row){const cells=new Map();for(const s of p.steps)for(const m of s.marks)if(m.row===row&&m.kind==='answer')cells.set(m.col,m.text);return Number([...cells].sort((a,b)=>a[0]-b[0]).map(x=>x[1]).join(''));}
test('validates supported integer expressions and rejects invalid division and ranges',()=>{
 for(const s of ['4/0','1-2','8/12','12345+1','1*1234','100/100','2++3','<script>','12+'])assert.ok(parseFormula(s).error,s);
 assert.deepEqual(parseFormula('9999+9999'),{a:9999,b:9999,op:'+'});
});
test('addition teaches column totals and carries, including the last carry',()=>{const p=plan('28+17');assert.deepEqual(p.steps.map(s=>s.expected),[15,4]);assert.equal(rowValue(p,5),45);assert.ok(p.steps[0].marks.some(m=>m.kind==='carry'&&m.text===1));assert.equal(rowValue(plan('9999+9999'),5),19998);});
test('subtraction borrows through zeroes and suppresses leading zeroes',()=>{const p=plan('1000-1');assert.deepEqual(p.steps.map(s=>s.expected),[9,9,9,0]);assert.equal(rowValue(p,5),999);assert.equal(p.steps.at(-1).marks.length,0);assert.equal(rowValue(plan('43-43'),5),0);});
test('multiplication includes shifted partial products and their sum',()=>{const p=plan('123*204');assert.equal(rowValue(p,5),492);assert.equal(rowValue(p,6),0);assert.equal(rowValue(p,7),24600);assert.equal(rowValue(p,8),25092);assert.equal(p.result,25092);});
test('division practices quotient, product, subtraction and bring down with remainder',()=>{const p=plan('125/4');assert.deepEqual(p.steps.filter(s=>s.type!=='info').map(s=>s.expected),[3,12,0,5,1,4,1]);assert.equal(rowValue(p,1),31);assert.equal(p.remainder,1);const z=plan('1005/5');assert.equal(rowValue(z,1),201);assert.equal(z.remainder,0);});
test('settings change carry and borrow locations',()=>{assert.ok(plan('28+17',{carry:'down'}).steps[0].marks.some(m=>m.kind==='carry-down'&&m.row===5));assert.ok(plan('32-18',{borrow:'side'}).steps[0].marks.some(m=>m.kind==='borrow-side'&&m.row===3));});
test('representative operand ranges produce correct written results',()=>{for(let a=0;a<100;a+=7)for(let b=0;b<100;b+=9){assert.equal(rowValue(plan(`${a}+${b}`),5),a+b);if(a>=b)assert.equal(rowValue(plan(`${a}-${b}`),5),a-b);const m=plan(`${a}*${b}`);assert.equal(rowValue(m,5+(String(b).length>1?String(b).length:0)),a*b);if(b&&a>=b){const d=plan(`${a}/${b}`);assert.equal(rowValue(d,1),Math.floor(a/b));assert.equal(d.remainder,a%b);}}});
test('multiplication and division assists expose the matching times-table operands',()=>{
 const m=plan('28*7');assert.deepEqual(m.steps[0].table,{base:7,factor:8,carry:0});assert.deepEqual(m.steps[1].table,{base:7,factor:2,carry:5});
 const d=plan('125/4');assert.deepEqual(d.steps.find(s=>s.phase==='quotient').table,{base:4,factor:3,dividend:12});assert.deepEqual(d.steps.find(s=>s.phase==='product').table,{base:4,factor:3});
 assert.deepEqual(plan('10/2').steps.find(s=>s.phase==='quotient').table,{base:2,factor:5,dividend:10});
});

test('division aligns the divisor, bracket, quotient and multi-digit input boxes',()=>{
 const p=plan('856/23'),bracket=p.base.find(m=>m.kind==='division');
 assert.equal(bracket.col,4);assert.equal(bracket.end,6);
 const divisor=p.base.filter(m=>m.row===2&&m.col<bracket.col);assert.deepEqual(divisor.map(m=>m.col).sort(),[2,3]);
 const inputs=p.steps.filter(s=>s.type==='input');
 assert.deepEqual(inputs.map(s=>[s.phase,s.expected,s.row,s.col,s.width]),[
  ['quotient',3,1,5,1],['product',69,3,5,2],['subtract',16,4,5,2],['bring-down',6,4,6,1],
  ['quotient',7,1,6,1],['product',161,5,6,3],['subtract',5,6,6,1]
 ]);
 assert.ok(inputs[4].highlight.some(([r,c])=>r===4&&c===4),'quotient highlights actual partial dividend');
});
test('a zero quotient does not create extra multiplication/subtraction rows',()=>{
 const p=plan('1005/5'),inputs=p.steps.filter(s=>s.type==='input');
 assert.deepEqual(inputs.map(s=>s.expected),[2,10,0,0,0,5,1,5,0]);
 assert.deepEqual(inputs.filter(s=>s.phase==='product').map(s=>s.row),[3,5]);
 assert.equal(inputs.find(s=>s.phase==='quotient'&&s.expected===0).success,'0は 5より 小さいから、商に 0を たてるよ。');
 assert.equal(inputs.find(s=>s.phase==='subtract').marks.length,0);
 assert.equal(inputs.find(s=>s.phase==='bring-down').marks.length,0);
 assert.deepEqual(inputs.filter(s=>s.phase==='bring-down').map(s=>s.row),[4,4]);
 assert.equal(rowValue(p,1),201);
});
test('division starts with an explanation and finishes by checking the remainder',()=>{
 const p=plan('125/4');assert.equal(p.steps[0].type,'info');assert.match(p.steps[1].message,/12/);
 assert.equal(p.steps.at(-1).phase,'finish');assert.match(p.steps.at(-1).message,/あまりは 1/);
 assert.ok(plan('125/5').steps.at(-1).message.includes('わりきれた'));
});
test('division with internal zeroes, two-digit divisors and maximum length stays within the paper',()=>{
 for(const expression of ['1015/5','1000/5','1000/9','9999/1','9999/99','1000/99','1200/12','1001/10','99/99']){
  const parsed=parseFormula(expression),p=buildPlan(parsed);
  assert.equal(rowValue(p,1),Math.floor(parsed.a/parsed.b),expression);
  assert.equal(p.remainder,parsed.a%parsed.b,expression);
  for(const s of p.steps)if(s.type==='input'){
   assert.ok(s.row>=0&&s.row<11,expression);assert.ok(s.col>=s.width-1&&s.col<15,expression);
   assert.ok(s.expected>=0);assert.ok(String(s.expected).length<=s.maxLength);
   if(s.phase==='quotient')assert.ok(s.expected<=9);
  }
 }
});

test('division colors every digit of the current dividend and divisor across phases',()=>{
 const p=plan('856/23'),quotients=p.steps.filter(s=>s.phase==='quotient');
 assert.deepEqual(quotients[0].operandHighlights.dividend,[[2,5],[2,4]]);
 assert.deepEqual(quotients[1].operandHighlights.dividend,[[4,6],[4,5],[4,4]]);
 assert.deepEqual(p.steps.find(s=>s.phase==='bring-down').operandHighlights.dividend,[[4,5],[4,4],[2,6]]);
 for(const s of p.steps.filter(s=>s.operandHighlights))assert.deepEqual(s.operandHighlights.divisor,[[2,3],[2,2]]);
 for(const phase of ['intro','quotient','product','subtract','bring-down'])assert.ok(p.steps.find(s=>s.phase===phase).operandHighlights);
 assert.deepEqual(plan('1005/5').steps.find(s=>s.phase==='quotient'&&s.expected===0).operandHighlights.dividend,[[2,5]]);
});

test('borrowing cancels each lending digit at the appropriate column step',()=>{
 const p=plan('345-48');
 assert.deepEqual(p.steps.map(s=>s.expected),[7,9,2]);
 const strikes=k=>p.steps[k].marks.filter(m=>m.kind==='strike').map(m=>m.col);
 assert.deepEqual(strikes(0),[4]);assert.deepEqual(strikes(1),[3]);assert.deepEqual(strikes(2),[]);
 assert.ok(p.steps[0].borrowed&&p.steps[1].borrowed);
 assert.equal(rowValue(p,5),297);
 const chain=plan('402-175');assert.deepEqual(chain.steps[0].marks.filter(m=>m.kind==='strike').map(m=>m.col),[4,3]);assert.equal(rowValue(chain,5),227);
 assert.equal(plan('987-123').steps.some(s=>s.marks.some(m=>m.kind==='strike')),false);
});
test('multiplication carries go into the next answer cell upper-right regardless of addition settings',()=>{
 for(const carry of ['up','down']){
  const p=plan('342*48',{carry});
  assert.deepEqual(p.steps[0].marks.find(m=>m.kind==='carry-answer'),{row:5,col:5,text:1,kind:'carry-answer'});
  assert.deepEqual(p.steps[1].marks.find(m=>m.kind==='carry-answer'),{row:5,col:4,text:3,kind:'carry-answer'});
  assert.ok(p.steps.every(s=>s.marks.every(m=>!['carry','carry-down'].includes(m.kind))));
  assert.equal(p.result,16416);assert.equal(rowValue(p,7),16416);
  assert.ok(p.steps.flatMap(s=>s.marks).some(m=>m.kind==='carry-answer'&&m.row===6));
 }
});
