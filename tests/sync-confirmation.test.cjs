const {test}=require('node:test');
const assert=require('node:assert/strict');
const {acknowledge}=require('../public/freight-sync.js');
function fixture(states){const items=new Map(),notes=[];let reads=0,writes=0;
  return {options:{eventId:'TEST',status:'PROCESSING',key:'TEST:PROCESSING',storage:{getItem:k=>items.get(k),setItem:(k,v)=>items.set(k,v),removeItem:k=>items.delete(k)},now:()=>100000,notify:n=>notes.push(n),readState:async()=>{const state=states[Math.min(reads++,states.length-1)];if(state instanceof Error)throw state;return state},send:async()=>{writes++}},items,notes,counts:()=>({reads,writes})};}
test('Slow/lost confirmation does not resend a successful command',async()=>{
  const f=fixture([{ok:true,eventStatus:'PENDING'},new Error('timeout'),new Error('timeout'),{ok:true,eventStatus:'PROCESSING',owned:true}]);
  assert.equal((await acknowledge(f.options)).eventStatus,'PROCESSING');
  assert.deepEqual(f.counts(),{reads:4,writes:1});assert.equal(f.notes.length,4);
});
test('POST timeout still verifies the write without resending',async()=>{
  const f=fixture([{ok:true,eventStatus:'PENDING'},{ok:true,eventStatus:'PROCESSING',owned:true}]);let sends=0;
  f.options.send=async()=>{sends++;throw new Error('POST timeout')};
  assert.equal((await acknowledge(f.options)).eventStatus,'PROCESSING');assert.equal(sends,1);
});
test('Read timeouts do not cause blind writes',async()=>{
  const f=fixture([new Error('timeout')]);await assert.rejects(acknowledge(f.options),/timeout/);
  assert.deepEqual(f.counts(),{reads:4,writes:0});
});
test('A persisted uncertain write is not resent immediately after reload',async()=>{
  const f=fixture([{ok:true,eventStatus:'PENDING'}]);f.items.set('TEST:PROCESSING','95000');
  await assert.rejects(acknowledge(f.options));assert.equal(f.counts().writes,0);
  f.options.now=()=>160001;await assert.rejects(acknowledge(f.options));assert.equal(f.counts().writes,1);
});
test('Already owned/complete jobs need no new start mutation',async()=>{
  for(const result of [{ok:true,eventStatus:'PROCESSING',owned:true},{ok:true,eventStatus:'COMPLETED',shipmentSynced:true}]){
    const f=fixture([result]);await acknowledge(f.options);assert.equal(f.counts().writes,0);
  }
});
test('Completion waits for Shipment projection, not just Event status',async()=>{
  const f=fixture([{ok:true,eventStatus:'COMPLETED',shipmentSynced:false},{ok:true,eventStatus:'COMPLETED',shipmentSynced:true}]);f.options.status='COMPLETED';
  await acknowledge(f.options);assert.equal(f.counts().writes,1);
});
test('Cannot complete another browsers processing job',async()=>{
  const f=fixture([{ok:true,eventStatus:'PROCESSING',owned:false}]);f.options.status='COMPLETED';
  await assert.rejects(acknowledge(f.options),/another browser/);assert.equal(f.counts().writes,0);
});
