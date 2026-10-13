/* Daily-use presentation only: existing storage and eligibility rules stay intact. */
(() => {
  const jobViews = ['jobs', 'prepare', 'verification', 'discovery', 'quick'];
  const originalRender = render;
  renderProfile = () => window.WorkspaceUI.profile(state);
  const originalCard = card;
  card = j => originalCard(j).replace('<div class="job-bottom">', `<p class="job-note">${j.source_updated ? 'Source date: '+esc(String(j.source_updated).slice(0,10)) : 'Posting date not provided'} · ${j.assessment_stale ? 'Fit review outdated' : j.assessment ? 'AI fit is advisory; check supporting evidence' : 'Profile fit not reviewed'}</p><div class="job-bottom">`);
  const originalOpenJob = openJob;
  openJob = async id => {
    await originalOpenJob(id);
    if (activeJob?.id !== id) return;
    document.querySelectorAll('#detail-body .detail-section').forEach(section => {
      const heading = section.querySelector('h3')?.textContent || '';
      if (/Browser verification|Help improve future fit/.test(heading) && section.parentElement.tagName !== 'DETAILS') {
        const d = document.createElement('details'); d.className = 'advanced-role';
        const summary = document.createElement('summary'); summary.textContent = heading;
        d.append(summary); section.before(d); d.append(section);
      }
    });
  };
  const originalSetView = setView;
  setView = next => {
    if (next === 'applications') next = 'pipeline';
    if (!meta[next]) next = 'jobs';
    originalSetView(next);
    history.replaceState(null, '', '#' + next);
  };
  render = () => {
    originalRender();
    const isJobs = jobViews.includes(view);
    document.querySelectorAll('nav [data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view || b.dataset.view === 'jobs' && isJobs));
    if (isJobs) {
      const tabs = document.createElement('div');
      tabs.className = 'button-row daily-tabs';
      tabs.setAttribute('aria-label', 'Job categories');
      tabs.innerHTML = [['jobs','OPT accepted'],['prepare','FANG preparation'],['verification','Check OPT']].map(([v,label]) => `<button class="${view===v?'primary':'secondary'}" data-daily-view="${v}" aria-pressed="${view===v}">${label}</button>`).join('') + '<label>Job queue<select id="daily-queue"><option value="">All jobs in this tab</option><option value="quick">Startup quick-apply queue</option><option value="discovery">Browse other leads</option></select></label>';
      $('#content').prepend(tabs);
      $('#daily-queue').value = ['quick','discovery'].includes(view) ? view : '';
      $('#daily-queue').onchange = e => setView(e.target.value || 'jobs');
      $('#page-title').textContent = 'Jobs';
      $('#verification-queue').hidden = true;
      if (state.storage_mode === 'browser' && (!state.profile.savedAt && state.profile.name === 'Your workspace')) {
        const welcome = document.createElement('section');
        welcome.className = 'panel onboarding';
        welcome.innerHTML = '<h2>Create your private profile</h2><p>Add your skills, experience, resume and authorization details to personalize your workspace. Your profile stays in this browser; it is not sent to the site owner and does not sync across devices.</p><button class="primary" data-daily-view="profile">Create my profile</button><p class="muted">Public feeds refresh while this page is open. AI analysis and Gmail require your own local companion; this website does not provide a shared AI service.</p>';
        $('#content').prepend(welcome);
      }
    }
    if (view === 'profile') {
      $('#page-title').textContent = 'My profile';
      $('#page-subtitle').textContent = 'Keep your experience and authorization details accurate. Browser profiles stay on this device.';
      const extra = $('#content > section:nth-child(2)');
      if (extra) { const d = document.createElement('details'); d.innerHTML = '<summary>Optional report import</summary>'; extra.before(d); d.append(extra); }
    }
    if (view === 'settings') {
      const wrapper = document.createElement('details');
      wrapper.innerHTML = '<summary>Advanced settings and data controls</summary><div class="button-row">' + [['sources','Discovery sources'],['services','Job services & Gmail'],['network','Manage connections'],['actions','Detailed next actions']].map(([v,label]) => `<button class="secondary" data-daily-view="${v}">${label}</button>`).join('') + '</div>';
      const old = Array.from($('#content').childNodes);
      $('#content').append(wrapper); old.forEach(n => wrapper.append(n));
    }
    document.querySelectorAll('[data-daily-view]').forEach(b => b.onclick = () => setView(b.dataset.dailyView));
    const accounts = state.integrations?.gmail?.accounts || [];
    $('#daily-connection').textContent = state.storage_mode === 'browser' ? 'Private browser profile · local AI optional' : accounts.length ? `Gmail: ${accounts.filter(a=>a.status==='Connected').length}/${accounts.length} connected` : 'Local workspace';
    $('#daily-connections').onclick = () => setView('services');
    document.querySelector('nav details').open = ['settings','sources','services','network','actions'].includes(view);
  };
  window.addEventListener('hashchange', () => setView(location.hash.slice(1) || 'jobs'));
  if (meta[location.hash.slice(1)]) view = location.hash.slice(1);
})();
