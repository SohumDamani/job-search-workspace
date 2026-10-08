/* Next actions use saved progress and source evidence, without model calls. */
let actionDisplayLimit=50;
function actionToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function actionDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return '';const d=new Date(value+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value?value:''}
function actionDays(date,today){return Math.round((Date.parse(date+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000)}
function actionDeadline(j){
const v=freshBrowserEvidence(j);if(!v||v.review?.eligibility?.identity_mismatch)return null;
const records=(v.review?.deadline?.records||[]).filter(x=>x.kind==='application deadline'&&actionDate(x.value)&&['board','employer'].includes(x.source_kind)&&safeLink(x.url)&&v.review.sources?.some(s=>s.kind===x.source_kind&&s.status==='readable'&&normalizedRoleURL(s.url)===normalizedRoleURL(x.url)&&(s.kind==='board'||normalizedRoleURL(s.url)===normalizedRoleURL(j.url))));
records.sort((a,b)=>a.value.localeCompare(b.value));return records[0]||null;
}
function preparationStep(j){
const policy=visaEvidence(j),v=freshBrowserEvidence(j);
if(j.closed||browserHardConflict(j)||!j.screen?.eligible||policy.status==='conflict')return {code:'hold',title:'Resolve the role conflict',detail:policy.reason||v?.note||j.screen?.issues?.join(' · ')||'Check the employer restriction before investing in this role.',target:'browser-verification-panel'};
if(policy.status!=='confirmed')return {code:'eligibility',title:'Check initial OPT acceptance',detail:policy.reason||'Initial OPT acceptance is missing or unclear. Check the posting or ask the employer. Future H-1B is optional; a browser check is optional.',target:'browser-verification-panel'};
if(!j.description_complete)return {code:'description',title:'Import the full role description',detail:'OPT acceptance is stated. Add the full posting so the fit review can show relevant proof and gaps; employer browser verification remains optional.',target:'job-description'};
if(!j.eligibility_reviewed)return {code:'eligibility_review',title:'Review your authorization, start and deadline',detail:'Employer policy is stated; review your personal authorization and all role restrictions separately.',target:'plan-eligibility_reviewed'};
if(!j.resume_ready||!String(j.resume_version||'').trim())return {code:'resume',title:'Prepare and record the resume for this role',detail:'Review the relevant proof and gaps, then save the exact resume filename/version.',target:'resume-version'};
if(!j.referral_ready)return {code:'referral',title:'Decide whether to request a referral',detail:'Review employer connections; record outreach reviewed or not needed.',target:'plan-referral_ready'};
if(!j.application_checked)return {code:'answers',title:'Review required application answers',detail:'Check all required fields and materials against the employer form.',target:'plan-application_checked'};
return {code:'final_review',title:'Complete your final review and apply',detail:'Your saved plan is complete. Recheck the live form and authorization answers before you submit.',target:'job-status'};
}
function nextActionQueue(jobs,today=actionToday(),windowIds=[]){
const q={due:[],upcoming:[],preparation:[],held:[]};
for(const j of jobs){
 if(['Rejected','Offer','Archived'].includes(j.status))continue;
 const tracking=['Applied','Interview','Referral requested'].includes(j.status),selected=['Saved','Referral requested'].includes(j.status)||j.source_feedback==='interested',automatic=windowIds.includes(j.id)||!!freshBrowserEvidence(j);
 if(!tracking&&!selected&&!automatic)continue;
 if(!tracking&&j.source_feedback==='not_interested')continue;
 const follow=actionDate(j.follow_up),deadline=tracking?null:actionDeadline(j),step=tracking&&j.status!=='Referral requested'?{code:follow?'follow_up':'schedule',title:j.status==='Interview'?'Review interview preparation / next contact':'Review application reply / follow up',detail:follow?'Check for a reply, then decide whether a follow-up is appropriate.':'Set a reminder so this application does not get lost.',target:'follow-up'}:preparationStep(j);
 const row={job:j,...step,follow_up:follow,deadline,days_to_deadline:deadline?actionDays(deadline.value,today):null,progress:['resume_ready','referral_ready','eligibility_reviewed','application_checked'].filter(k=>j[k]===true).length};
 if(tracking&&follow){row.code='follow_up';row.title=j.status==='Referral requested'?'Check referral reply / follow up':step.title;row.target='follow-up';row.detail='Check for a reply and review your last contact before sending anything.';row.due=follow;row.days=actionDays(follow,today);(follow<=today?q.due:q.upcoming).push(row);continue;}
 if(step.code==='hold'){q.held.push(row);continue;}
 if(follow&&follow<=today){row.due=follow;row.days=actionDays(follow,today);q.due.push(row);continue;}
 if(deadline&&deadline.value<=today){row.code='deadline_review';row.title='Recheck the published application cutoff';row.detail=deadline.value<today?'The captured cutoff date has passed; check the exact source before spending time on the application.':'The captured cutoff is today. Read the original time and timezone before proceeding.';row.target='browser-verification-panel';row.due=deadline.value;row.days=actionDays(deadline.value,today);q.due.push(row);continue;}
 if(tracking){row.title='Set your next reminder';row.code='schedule';row.target='follow-up';}
 q.preparation.push(row);
}
q.due.sort((a,b)=>a.due.localeCompare(b.due)||a.job.id.localeCompare(b.job.id));
q.upcoming.sort((a,b)=>a.due.localeCompare(b.due)||a.job.id.localeCompare(b.job.id));
q.preparation.sort((a,b)=>{const urgent=x=>x.days_to_deadline!==null&&x.days_to_deadline<=7?x.days_to_deadline:Infinity;return urgent(a)-urgent(b)||verificationOrder(a.job,b.job)});
return q;
}
function actionRow(row){const j=row.job;return `<article class="action-card"><div><h3>${esc(row.title)}</h3><p><strong>${esc(j.company)}</strong> · ${esc(j.title)}</p><div class="job-meta">${pill(j.status)}${row.due?pill(row.days<0?`${Math.abs(row.days)} days overdue`:row.days===0?'Due today':`Due ${row.due}`,row.days<=0?'warn':''):''}${row.deadline?pill(`${row.deadline.source_kind==='board'?'Board cutoff':'Employer deadline'}: ${row.deadline.value}`,'warn'):''}${!['Applied','Interview'].includes(j.status)?pill(`Plan ${row.progress}/4`):''}</div><p>${esc(row.detail)}</p>${row.deadline?`<p class="muted">${esc(row.deadline.evidence||row.deadline.raw||'')} ${link(row.deadline.url,'Read cutoff time & timezone ↗')} A board cutoff does not establish employer closure.</p>`:''}</div><div class="action-controls"><button class="primary" data-action-job="${esc(j.id)}" data-action-target="${esc(row.target)}">Open next step</button><label>Next reminder<input type="date" data-action-reminder="${esc(j.id)}" value="${esc(j.follow_up||'')}"></label><button class="secondary" data-save-reminder="${esc(j.id)}">Save reminder</button></div></article>`}
function renderActions(){
const w=state.verification_queue?.window,q=nextActionQueue(state.jobs,actionToday(),[...(w?.main||[]),...(w?.fang||[])]);
const section=(title,rows,empty)=>`<section class="panel action-section"><div class="section-heading"><h2>${title}</h2><span>${rows.length}</span></div>${rows.length?rows.slice(0,actionDisplayLimit).map(actionRow).join(''):`<p class="muted">${empty}</p>`}${rows.length>actionDisplayLimit?`<button class="secondary" data-action-more>Show more actions (${rows.length-actionDisplayLimit} remaining)</button>`:''}</section>`;
return `<div class="metrics">${metric('Due / overdue',q.due.length,'Your reminders and captured cutoffs')}${metric('Prepare next',q.preparation.length,'Selected and verified roles')}${metric('Upcoming follow-ups',q.upcoming.length,'Scheduled applications / referrals')}${metric('Resolve before preparing',q.held.length,'Saved roles with evidence conflicts')}</div><div class="section-heading"><p class="muted">Today: ${esc(actionToday())}, using this browser’s local date. This view uses selected/saved jobs, tracked applications and roles with current browser evidence. It reads your saved plan; checkboxes do not confirm employer policy or authorization. Missing deadlines stay unknown. Refresh after background verification to include new results.</p><button id="refresh-actions" class="secondary">Refresh actions</button></div>${section('Due now',q.due,'No due reminders or captured cutoffs. Set a reminder on a role to bring it here.')}${section('Next preparation steps',q.preparation,'Select or save a role, or let its browser verification finish, to get a next step.')}${section('Upcoming follow-ups',q.upcoming,'No scheduled follow-ups yet.')}${section('Resolve conflicts',q.held,'No selected or verified roles with unresolved conflicts.')}`;
}
async function openActionStep(id,target){await openJob(id);const allowed=['browser-verification-panel','verify-browser-detail','plan-eligibility_reviewed','resume-version','plan-referral_ready','plan-application_checked','job-status','follow-up'];if(allowed.includes(target)){const el=$('#'+target);el?.scrollIntoView({block:'center'});if(el?.matches('input,button,select'))el.focus()}}
function bindActions(){
$('#refresh-actions')?.addEventListener('click',()=>load().catch(e=>message(e.message,true)));
document.querySelectorAll('[data-action-more]').forEach(b=>b.onclick=()=>{const drafts=new Map([...document.querySelectorAll('[data-action-reminder]')].map(x=>[x.dataset.actionReminder,x.value]));actionDisplayLimit+=50;$('#content').innerHTML=renderActions();for(const input of document.querySelectorAll('[data-action-reminder]'))if(drafts.has(input.dataset.actionReminder))input.value=drafts.get(input.dataset.actionReminder);bindActions()});
document.querySelectorAll('[data-action-job]').forEach(b=>b.onclick=()=>openActionStep(b.dataset.actionJob,b.dataset.actionTarget).catch(e=>message(e.message,true)));
document.querySelectorAll('[data-save-reminder]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const id=b.dataset.saveReminder,input=document.querySelector(`[data-action-reminder="${id}"]`);if(input.value&&!actionDate(input.value))throw Error('Choose a valid reminder date.');await api('/api/jobs/'+id+'/update',{follow_up:input.value});await load();message('Reminder saved locally. Review and send any follow-up yourself.')}catch(e){message(e.message,true);b.disabled=false}});
}
