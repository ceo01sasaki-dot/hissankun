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
test('division practices quotient, product, subtraction and bring down with remainder',()=>{const p=plan('125/4');assert.deepEqual(p.steps.map(s=>s.expected),[3,12,0,5,1,4,1]);assert.equal(rowValue(p,2),31);assert.equal(p.remainder,1);const z=plan('1005/5');assert.equal(rowValue(z,2),201);assert.equal(z.remainder,0);});
test('settings change carry and borrow locations',()=>{assert.ok(plan('28+17',{carry:'down'}).steps[0].marks.some(m=>m.kind==='carry-down'&&m.row===5));assert.ok(plan('32-18',{borrow:'side'}).steps[0].marks.some(m=>m.kind==='borrow-side'&&m.row===3));});
test('representative operand ranges produce correct written results',()=>{for(let a=0;a<100;a+=7)for(let b=0;b<100;b+=9){assert.equal(rowValue(plan(`${a}+${b}`),5),a+b);if(a>=b)assert.equal(rowValue(plan(`${a}-${b}`),5),a-b);const m=plan(`${a}*${b}`);assert.equal(rowValue(m,5+(String(b).length>1?String(b).length:0)),a*b);if(b&&a>=b){const d=plan(`${a}/${b}`);assert.equal(rowValue(d,2),Math.floor(a/b));assert.equal(d.remainder,a%b);}}});
