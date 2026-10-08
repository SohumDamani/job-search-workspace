/* Public implementation status only; no profile, credentials or application data. */
(() => {
  const labels={done:'Completed',working:'In progress',needs_action:'Needs your setup',deferred:'Deferred'};
  let version='',lastSuccess=null;
  const root=document.getElementById('work-progress');
  if(!root)return;
  const text=(tag,value,cls)=>{const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e;};
  async function refresh(){
    if(document.hidden)return;
    try{
      const r=await fetch('./work-progress.json',{cache:'no-store',credentials:'omit'});
      if(!r.ok)throw Error('Progress status unavailable');
      const p=await r.json();if(!Array.isArray(p.tasks)||p.tasks.length>40||!p.tasks.every(t=>typeof t.title==='string'&&typeof t.detail==='string'&&labels[t.status]))throw Error('Invalid progress status');
      lastSuccess=new Date();
      const next=JSON.stringify(p);if(next===version)return;version=next;
      const wasOpen=root.querySelector('details')?.open??false,details=document.createElement('details');details.open=wasOpen;
      const summary=document.createElement('summary');summary.append(text('strong','Build progress'));
      for(const [status,label]of Object.entries(labels)){const n=p.tasks.filter(t=>t.status===status).length;if(n)summary.append(text('span',`${n} ${label.toLowerCase()}`,`progress-count ${status}`));}
      const model=p.tasks.find(t=>t.id==='models');if(model){const line=text('small',model.title+' / Advisory reviews','progress-model');summary.append(line);}
      details.append(summary);
      const stamp=text('p',`Updated ${new Date(p.updated_at).toLocaleString('en-US',{timeZone:'America/Los_Angeles',timeZoneName:'short'})}. Refreshes every 10 seconds while this tab is visible.`,'muted');details.append(stamp);
      const list=document.createElement('ul');list.className='progress-tasks';
      for(const t of p.tasks){const li=document.createElement('li');li.append(text('span',labels[t.status],`progress-state ${t.status}`));const info=document.createElement('div');info.append(text('strong',t.title),text('p',t.detail));li.append(info);list.append(li);}details.append(list);
      root.replaceChildren(details);root.setAttribute('aria-label','Project implementation progress');
    }catch{if(!lastSuccess)root.textContent='Build progress is temporarily unavailable. Your workspace is unaffected.';}
  }
  refresh();setInterval(refresh,10000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
