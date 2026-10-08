/* Source claims only: OPT acceptance, STEM extension and future H-1B are separate. */
(()=>{
const fields=['initial_opt','stem_opt','future_sponsorship'];
const tokens={initial_opt:'\\b(?:initial\\s+|post[- ]completion\\s+)?OPT\\b|optional practical training',stem_opt:'\\bSTEM\\s+OPT\\b',future_sponsorship:'\\bH[- ]?1B\\b|(?:visa\\s+)?sponsorship'};
const neg="(?:cannot|will not|do not|does not|don't|doesn't|won't|can't|not able to|unable to|no)\\s+(?:accept|consider|hire|support|offer|provide|sponsor)\\w*|not\\s+(?:accepted|eligible|supported|available|offered|provided)|ineligible|excluded";
const pos='(?:accept|welcome|consider|hire|support|offer|provide)\\w*|eligible|available|open to';
function canonical(url){try{const u=new URL(url);if(!/^https?:$/.test(u.protocol)||u.username||u.password)return '';const q=[...u.searchParams].filter(([k])=>!k.toLowerCase().startsWith('utm_')&&!['source','ref','gh_src'].includes(k.toLowerCase())).sort(([a,b],[c,d])=>a.localeCompare(c)||b.localeCompare(d));u.search=new URLSearchParams(q).toString();u.hash='';u.pathname=u.pathname.replace(/\/$/,'');return u.href.replace(/\/$/,'')}catch{return ''}}
function current(stamp,now=Date.now()){const age=now-Date.parse(stamp||'');return Number.isFinite(age)&&age>=-300000&&age<=7*86400000}
function claims(text){const result=[];for(const raw of String(text||'').split(/\n+|(?<=[.!?])\s+|;|\b(?:but|however|and)\b/i)){const quote=raw.trim();if(!quote||quote.includes('?')||/\b(?:will you|do you|are you|whether|historically|history|past filings|past sponsorship)\b/i.test(quote))continue;for(const field of fields){const work=field==='initial_opt'?quote.replace(/\bSTEM\s+OPT\b/gi,'STEM extension'):quote,tok=tokens[field];if(!new RegExp(tok,'i').test(work))continue;const positiveWords=field==='initial_opt'?'(?:accept|welcome|consider|hire|support)\\w*|open to':pos;const negative=new RegExp('(?:'+neg+')[^.;!?]{0,45}(?:'+tok+')|(?:'+tok+')[^.;!?]{0,35}(?:'+neg+')','i').test(work),conditional=/\b(?:may|might|case.by.case|conditional|depending|subject to|if)\b/i.test(work),positive=new RegExp('(?:'+positiveWords+')[^.;!?]{0,45}(?:'+tok+')|(?:'+tok+')[^.;!?]{0,35}(?:'+positiveWords+')','i').test(work)||(field==='initial_opt'&&/\bOPT\s+candidates?\s+(?:are\s+)?eligible\b/i.test(work));if(negative||conditional||positive)result.push({field,value:negative?'excluded':conditional?'conditional':'accepted',quote:quote.slice(0,1200)})}}return result}
const cache=new WeakMap();
function evaluate(job,now=Date.now()){
const signature=[job.id,job.url,job.description,job.description_observed_at,job.description_verified_at,job.description_source_url,job.board_url,job.sponsorship_hint,job.sponsorship_hint_observed_at,job.source,job.closed,JSON.stringify(job.eligibility_evidence),JSON.stringify(job.employer_verification),JSON.stringify(job.browser_verification),JSON.stringify(job.information_feedback)];
const prior=cache.get(job);if(prior&&now>=prior.created_at&&now<prior.expires_at&&signature.every((part,i)=>part===prior.signature[i]))return prior.result;
const result=compute(job,now),stamps=[job.description_observed_at,job.description_verified_at,job.sponsorship_hint_observed_at,job.employer_verification?.checked_at,job.browser_verification?.source_observed_at||job.browser_verification?.checked_at||job.browser_verification?.completed_at,...(job.eligibility_evidence||[]).map(x=>x?.observed_at)].map(x=>Date.parse(x||'')+7*86400000).filter(x=>Number.isFinite(x)&&x>now);
cache.set(job,{signature,result,created_at:now,expires_at:Math.min(now+30000,...stamps)});return result;
}
function compute(job,now){
const role=canonical(job.url),evidence=[];let browserDisputed=false,browserClosed=false;
function collect(text,url,stamp,jobURL=job.url,source='Listing'){if(!role||!canonical(url)||canonical(jobURL)!==role||!current(stamp,now))return;for(const claim of claims(text))evidence.push({...claim,source_url:url,observed_at:stamp,source})}
collect(job.description,job.description_source_url||job.board_url||job.url,job.description_observed_at||job.description_verified_at,job.url,job.source||'Recorded posting');
collect(job.sponsorship_hint,job.board_url||job.url,job.sponsorship_hint_observed_at,job.url,job.source||'Job board');
for(const row of job.eligibility_evidence||[])if(row&&typeof row==='object')collect(row.quote,row.source_url,row.observed_at,row.job_url||job.url,row.source||'Board-reported');
const v=job.employer_verification||{},visa=v.visa||{};
const sourced=(v.sources||[]).some(row=>canonical(typeof row==='string'?row:row?.url||row?.source_url)===role);
if(v.posting_live===true&&sourced&&visa.specific_to_role===true&&(!v.job_id||v.job_id===job.id)&&canonical(visa.source_url)===role){for(const row of visa.evidence||[])if(row&&typeof row==='object')collect(row.quote,visa.source_url,v.checked_at,v.job_url||job.url,'Employer posting');collect(visa.evidence_quote,visa.source_url,v.checked_at,v.job_url||job.url,'Employer posting')}
const b=job.browser_verification;
if(b&&b.job_id===job.id&&canonical(b.job_url)===role&&current(b.source_observed_at||b.checked_at||b.completed_at,now)){
browserDisputed=!!(b.review?.eligibility?.identity_mismatch||b.review?.eligibility?.source_policy_conflict);browserClosed=b.role_status==='closed'||b.status==='closed';
if(!browserDisputed&&!browserClosed)for(const s of b.review?.sources||[])if(s.status==='readable'&&(s.kind==='board'||canonical(s.url)===role)&&b.role_status==='listed')for(const row of s.sponsorship?.evidence||[])collect(row.quote,row.url||s.url,b.source_observed_at||b.checked_at||b.completed_at,job.url,s.kind==='board'?'Job board':'Employer posting');
}
const dimensions=Object.fromEntries(fields.map(f=>[f,{value:'unknown',evidence:evidence.filter(e=>e.field===f)}]));
for(const dimension of Object.values(dimensions)){const values=new Set(dimension.evidence.map(e=>e.value));dimension.value=values.has('accepted')&&values.has('excluded')?'conflict':values.has('excluded')?'excluded':values.has('conditional')?'conditional':values.has('accepted')?'accepted':'unknown'}
const disputed=browserDisputed||(job.information_feedback?.field==='visa'&&job.information_feedback?.verdict==='incorrect'),opt=dimensions.initial_opt.value;
const status=disputed?'pending':['excluded','conflict'].includes(opt)||job.closed||browserClosed?'conflict':opt==='accepted'?'confirmed':'pending';
return {status,label:disputed?'OPT information is disputed':status==='confirmed'?'OPT accepted':status==='conflict'?'OPT conflict':'Check OPT',reason:status==='confirmed'?'Current role-specific listing states initial OPT acceptance. H-1B is optional; your approved authorization and start date still require review.':status==='pending'?'OPT information is disputed or unclear; check with the employer.':'The listing excludes OPT, contains contradictory OPT claims, or is closed.',...dimensions};
}
const api={claims,evaluate,canonical,current};if(typeof module!=='undefined'&&module.exports)module.exports=api;if(typeof window!=='undefined')window.OPTPolicy=api;
})();
