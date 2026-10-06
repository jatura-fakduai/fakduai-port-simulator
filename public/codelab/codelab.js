const tracks=[...document.querySelectorAll('.track')],steps=[...document.querySelectorAll('.step')];
let done;try{done=new Set(JSON.parse(localStorage.getItem('port-codelab-done')||'[]'));}catch{done=new Set();}
let current=0;
const el=id=>document.getElementById(id);
function show(index){current=Math.max(0,Math.min(steps.length-1,index));const step=steps[current],track=step.closest('.track');tracks.forEach(t=>t.hidden=t!==track);steps.forEach(s=>s.hidden=s!==step);
el('tracks').replaceChildren(...tracks.map(t=>{const b=document.createElement('button');b.textContent=t.dataset.name;b.onclick=()=>show(steps.indexOf(t.querySelector('.step')));b.setAttribute('aria-pressed',String(t===track));return b;}));
el('rail').replaceChildren(...[...track.querySelectorAll('.step')].map(s=>{const li=document.createElement('li'),b=document.createElement('button');b.textContent=(done.has(s.id)?'✓ ':'')+s.dataset.title;b.onclick=()=>show(steps.indexOf(s));li.append(b);return li;}));
el('zoneName').textContent=track.dataset.name;el('pos').textContent=(current+1)+' / '+steps.length;el('doneCount').textContent=done.size;el('barFill').style.width=(done.size/steps.length*100)+'%';el('complete').textContent=done.has(step.id)?'✓ ทำแล้ว (ยกเลิก)':'ทำขั้นนี้แล้ว';el('prev').disabled=current===0;el('next').disabled=current===steps.length-1;history.replaceState(null,'','#'+step.id);}
el('prev').onclick=()=>show(current-1);el('next').onclick=()=>show(current+1);
el('complete').onclick=()=>{const id=steps[current].id;done.has(id)?done.delete(id):done.add(id);localStorage.setItem('port-codelab-done',JSON.stringify([...done]));show(current);};
el('resetBtn').onclick=()=>{if(confirm('ล้างความคืบหน้า Codelab นี้?')){done.clear();localStorage.removeItem('port-codelab-done');show(0);}};
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{b.dataset.mode==='auto'?delete document.documentElement.dataset.theme:document.documentElement.dataset.theme=b.dataset.mode;});
document.querySelectorAll('button[data-accent]').forEach(b=>b.onclick=()=>document.documentElement.dataset.accent=b.dataset.accent);
window.addEventListener('hashchange',()=>{const index=steps.findIndex(s=>s.id===location.hash.slice(1));if(index>=0)show(index);});
show(Math.max(0,steps.findIndex(s=>s.id===location.hash.slice(1))));
