/* Preserve navigation context and unsaved role edits while this page is open. */
const workspaceUI={boards:{},drafts:new Map(),baseline:null,listHTML:new WeakMap()};
function renderJobList(html){const el=$('#job-list');if(workspaceUI.listHTML.get(el)===html)return false;el.innerHTML=html;workspaceUI.listHTML.set(el,html);return true}
function boardFieldIds(){return ['job-search','lane-filter','scope-filter','tier-filter','review-filter','type-filter','source-filter','visa-filter','show-excluded']}
function readUIField(el){return el.type==='checkbox'?el.checked:el.value}
function writeUIField(el,value){if(el.type==='checkbox')el.checked=value;else if(el.tagName!=='SELECT'||[...el.options].some(x=>x.value===value))el.value=value}
function captureBoardContext(){if(!['jobs','prepare','quick','discovery','verification'].includes(view)||!$('#job-search'))return;workspaceUI.boards[view]={page:jobPage,fields:Object.fromEntries(boardFieldIds().map(id=>[id,readUIField($('#'+id))]))}}
function restoreBoardContext(){const c=workspaceUI.boards[view];jobPage=c?.page||1;if(c)for(const [id,value] of Object.entries(c.fields)){const el=$('#'+id);if(el)writeUIField(el,value)}}
function detailFieldIds(){return ['job-status','follow-up','job-notes','job-description','source-feedback','application-queue','resume-version','plan-resume_ready','plan-referral_ready','plan-eligibility_reviewed','plan-application_checked','information-verdict','information-field','information-note','recruiter-name','recruiter-email']}
function detailFieldValues(ids=detailFieldIds()){return Object.fromEntries(ids.filter(id=>$('#'+id)).map(id=>[id,readUIField($('#'+id))]))}
function rememberDetailDraft(saved={}){
const baseline=workspaceUI.baseline;if(!baseline||!activeJob||baseline.id!==activeJob.id)return;
const draft=workspaceUI.drafts.get(activeJob.id)||{};
for(const [id,value] of Object.entries(detailFieldValues())){
 if(Object.hasOwn(saved,id)&&saved[id]===value){delete draft[id];baseline.fields[id]=value;continue;}
 if(value!==baseline.fields[id])draft[id]=value;else delete draft[id];
}
if(Object.keys(draft).length)workspaceUI.drafts.set(activeJob.id,draft);else workspaceUI.drafts.delete(activeJob.id);
updateDraftNotice();
}
function restoreDetailDraft(j){
workspaceUI.baseline={id:j.id,fields:detailFieldValues()};
for(const [id,value] of Object.entries(workspaceUI.drafts.get(j.id)||{})){const el=$('#'+id);if(el)writeUIField(el,value)}
for(const id of detailFieldIds())$('#'+id)?.addEventListener('input',()=>rememberDetailDraft());
$('#discard-detail-draft')?.addEventListener('click',()=>{for(const [id,value] of Object.entries(workspaceUI.baseline.fields)){const el=$('#'+id);if(el)writeUIField(el,value)}workspaceUI.drafts.delete(j.id);updateDraftNotice()});
updateDraftNotice();
}
function updateDraftNotice(){const box=$('#detail-draft-notice');if(box)box.hidden=!workspaceUI.drafts.has(activeJob?.id)}
async function saveDetailUpdate(j,body,fieldIds){
const submitted=detailFieldValues(fieldIds);await api('/api/jobs/'+j.id+'/update',body);rememberDetailDraft(submitted);await load();await openJob(j.id);
}
