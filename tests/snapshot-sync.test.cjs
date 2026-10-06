const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readJson,retryRead,nextSyncDelay}=require('../public/freight-sync.js');
const response=(body,status=200)=>({ok:status<400,status,text:async()=>body});
test('Non-JSON response retries after a delay and recovers',async()=>{
  let calls=0;const waits=[],notes=[];
  const data=await retryRead({read:()=>readJson({url:'test',fetchImpl:async()=>response(++calls===1?'<html>Google error</html>':'{"ok":true,"shipments":[]}')}),sleep:async ms=>waits.push(ms),notify:n=>notes.push(n)});
  assert.equal(data.ok,true);assert.equal(calls,2);assert.deepEqual(waits,[1500]);assert.match(notes[1].error.message,/non-JSON/);
});
test('Transient HTTP errors retry; permission errors do not',async()=>{
  for(const [status,expected] of [[503,3],[429,3],[403,1]]){
    let calls=0;await assert.rejects(retryRead({read:()=>readJson({url:'test',fetchImpl:async()=>{calls++;return response('',status)}}),sleep:async()=>{}}),new RegExp('HTTP '+status));assert.equal(calls,expected);
  }
});
test('API authorization errors are surfaced without blind retries',async()=>{
  let calls=0;await assert.rejects(retryRead({read:()=>readJson({url:'test',fetchImpl:async()=>{calls++;return response('{"ok":false,"error":"Sheet owner does not match"}')}}),sleep:async()=>{}}),/owner/);assert.equal(calls,1);
});
test('Timeout includes slow response body and has a readable error',async()=>{
  await assert.rejects(readJson({url:'test',timeoutMs:5,fetchImpl:async(url,{signal})=>({ok:true,text:()=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'}))))})}),/timed out/);
});
test('Polling backs off with a maximum of 60 seconds',()=>{
  assert.deepEqual([1,2,3,4,5,10].map(nextSyncDelay),[5000,10000,20000,40000,60000,60000]);
});
test('Read retries never perform a mutation',async()=>{
  let options;await readJson({url:'test',fetchImpl:async(url,value)=>{options=value;return response('{"ok":true}')}});assert.equal(options.method,undefined);assert.equal(options.cache,'no-store');
});
