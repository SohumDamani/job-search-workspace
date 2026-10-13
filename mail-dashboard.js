/* Presentation rules only: never change application status, OPT evidence or Gmail. */
(() => {
  const negative = /\b(?:unfortunately|regret to inform|not (?:be )?(?:moving|proceeding) forward|not selected|unsuccessful|rejected|cannot (?:invite|offer)|unable to (?:invite|offer)|not able to (?:invite|offer)|no longer under consideration|(?:pursue|selected|select|forward with) other candidates|position (?:has been )?filled)\b/i;
  const positive = /\b(?:invite you to (?:a |an |the )?(?:interview|call|screen|meeting)|interview invitation|invitation to (?:a |an |your |the )?interview|schedule (?:a |an |your |the )?(?:interview|call|screen|meeting)|would (?:like|love) to (?:discuss|meet|speak|interview)|interested in (?:speaking|meeting|discussing)|move forward with (?:you|your)|next (?:round|stage)|pleased to (?:offer|extend (?:you )?(?:an |a )?offer)|offer (?:you|letter))\b/i;
  function responseKind(row) {
    if (!['interview','offer','action_required','recruiter_reply'].includes(row.category)) return null;
    const text = String(row.subject || '') + '\n' + String(row.evidence || '').split(/\n(?:On .+wrote:|From:|>)/i)[0];
    if (negative.test(text)) return null;
    if (row.category === 'action_required') return 'action';
    if (!positive.test(text)) return null;
    return row.category === 'offer' ? 'offer' : row.category === 'interview' ? 'interview' : 'reply';
  }
  function fang(job) {
    const key = String(job.company || '').toLowerCase().replace(/\b(incorporated|corporation|company|limited|inc|corp|ltd|llc)\b/g,'').replace(/[^a-z0-9]/g,'');
    if (['amazon','amazonwebservices','amazonwebservicesaws','aws','google','googlecloud','alphabet','meta','metaplatforms','facebook','netflix'].includes(key)) return true;
    if (key) return false; // An explicit different employer overrides URL/title hints.
    try {
      const u = new URL(job.url);
      if (['amazon.jobs','www.amazon.jobs','metacareers.com','www.metacareers.com','jobs.netflix.com','careers.netflix.com'].includes(u.hostname)) return true;
      if (['google.com','www.google.com'].includes(u.hostname) && /^\/about\/careers\//.test(u.pathname)) return true;
    } catch {}
    return /\s(?:at|@)\s+(?:Amazon(?: Web Services)?|Google|Meta|Facebook|Netflix)\s*$/i.test(job.title || '');
  }
  const api = {responseKind, fang};
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.MailDashboard = api;
})();
