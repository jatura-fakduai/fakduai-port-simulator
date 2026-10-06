(function(root){
  'use strict';
  // Read-after-write confirmation. A lost response is NOT a failed mutation.
  async function acknowledge({eventId,status,readState,send,storage,key,notify=()=>{},now=Date.now}){
    const started=now();
    let sent=false,lastError;
    for(let attempt=0;attempt<4;attempt++){
      notify({status,attempt,elapsed:Math.floor((now()-started)/1000)});
      try{
        const result=await readState();
        if(!result.ok)throw new Error(result.error||'Cannot verify event status');
        if(result.eventStatus==='COMPLETED'&&(status==='PROCESSING'||result.shipmentSynced===true)){
          storage.removeItem(key);return result;
        }
        if(status==='PROCESSING'&&result.eventStatus==='PROCESSING'&&result.owned){
          storage.removeItem(key);return result;
        }
        if(result.eventStatus==='WAITING_DOCUMENT')throw new Error('Waiting for required documents');
        if(!['PENDING','PROCESSING','COMPLETED'].includes(result.eventStatus))throw new Error('Event is not ready: '+result.eventStatus);
        if(status==='COMPLETED'&&result.eventStatus==='PENDING')throw new Error('Event has not been claimed');
        if(status==='COMPLETED'&&result.eventStatus==='PROCESSING'&&!result.owned)throw new Error('Event is running in another browser');
        // Persist before POST: timeouts/reloads cannot cause an immediate resend.
        const previous=Number(storage.getItem(key));
        if(!sent&&(!previous||now()-previous>=60000)){
          storage.setItem(key,String(now()));sent=true;
          try{await send()}catch(error){lastError=error}
        }
        // The next iteration only checks state, including when POST timed out.
      }catch(error){lastError=error}
    }
    const error=new Error(lastError?.message||'Confirmation pending; will check again');
    error.confirmationPending=true;
    throw error;
  }
  async function readJson({url,timeoutMs=45000,fetchImpl=fetch}){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetchImpl(url,{cache:'no-store',signal:controller.signal});
      if(!response.ok){const error=new Error('HTTP '+response.status);error.retryable=response.status===429||response.status>=500;throw error}
      const body=await response.text();
      let data;
      try{data=JSON.parse(body)}catch{throw new Error('Google returned a non-JSON response')}
      if(!data||typeof data!=='object'){throw new Error('Invalid Google Sheet response')}
      // API application errors (permissions/schema) need intervention, not retries.
      if(data.ok===false){const error=new Error(data.error||'Sheet API error');error.retryable=/timeout|timed out|try again|temporar|too many|service unavailable|internal error|quota|rate limit/i.test(error.message);throw error}
      return data;
    }catch(error){if(error.name==='AbortError')throw new Error('Google Sheet response timed out');throw error}
    finally{clearTimeout(timer)}
  }
  async function retryRead({read,notify=()=>{},sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),attempts=3}){
    for(let attempt=0;attempt<attempts;attempt++){
      notify({attempt,attempts});
      try{return await read()}catch(error){
        if(error.retryable===false||attempt===attempts-1)throw error;
        const delay=attempt===0?1500:4000;
        notify({attempt,attempts,error,delay});await sleep(delay);
      }
    }
  }
  const nextSyncDelay=failures=>Math.min(60000,5000*Math.pow(2,Math.max(0,failures-1)));
  const api={acknowledge,readJson,retryRead,nextSyncDelay};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.FreightSyncTransport=api;
})(typeof window==='object'?window:globalThis);
