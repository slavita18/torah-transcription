(function () {
  const editors = window.EDITORS_DATA || [];
  const grid = document.getElementById('editors-grid');
  const searchInput = document.getElementById('search');
  const filterPills = document.getElementById('filter-pills');
  const emptyState = document.getElementById('empty-state');
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modal-body');
  const buildDate = document.getElementById('build-date');

  let currentFilter = 'all';
  let currentSearch = '';

  // Stats
  document.getElementById('stat-total').textContent = editors.length;
  document.getElementById('stat-active').textContent = editors.filter(e => e.status && e.status.includes('פעיל')).length;
  document.getElementById('stat-samples').textContent = editors.reduce((acc, e) => acc + (e.samples ? e.samples.length : 0), 0);
  buildDate.textContent = new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });

  // ===== Helpers =====
  function badgeClass(status) {
    if (!status) return 'badge-other';
    if (status.includes('פעיל')) return 'badge-active';
    if (status.includes('מציע')) return 'badge-offer';
    if (status.includes('דוגמה') || status.includes('דוגמא')) return 'badge-sample';
    return 'badge-other';
  }

  function sampleIcon(type) {
    if (!type) return 'note';
    const t = type.toLowerCase();
    if (t.includes('pdf')) return 'pdf';
    if (t.includes('doc')) return 'docx';
    if (t.includes('png') || t.includes('jpg') || t.includes('image')) return 'image';
    return 'note';
  }

  function sampleTypeLabel(type) {
    if (!type) return '';
    const t = type.toLowerCase();
    if (t.includes('pdf')) return 'PDF';
    if (t.includes('doc')) return 'DOC';
    if (t.includes('png')) return 'IMG';
    if (t.includes('image')) return 'IMG';
    return '';
  }

  function roleLabel(role) {
    if (role === 'cv') return 'קורות חיים';
    if (role === 'sample-before') return 'דוגמה — לפני עריכה';
    if (role === 'sample-after') return 'דוגמה — אחרי עריכה';
    if (role === 'sample') return 'דוגמת עריכה';
    return '';
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function gmailUrl(threadId) {
    if (!threadId) return null;
    return `https://mail.google.com/mail/u/0/#all/${threadId}`;
  }

  // ===== Card rendering =====
  function renderCard(editor) {
    const cls = badgeClass(editor.status);
    const cvCount = (editor.samples || []).filter(s => s.role === 'cv').length;
    const sampleCount = (editor.samples || []).filter(s => s.role !== 'cv').length;

    const specHtml = (editor.specialties || []).slice(0, 3).map(s =>
      `<span class="tag">${escapeHtml(s)}</span>`
    ).join('');

    const metaParts = [];
    if (editor.phone) metaParts.push(`<span>📞 ${escapeHtml(editor.phone)}</span>`);
    if (editor.email) metaParts.push(`<span>✉️ ${escapeHtml(editor.email.split('@')[0])}</span>`);
    if (editor.age) metaParts.push(`<span>גיל ${escapeHtml(editor.age)}</span>`);
    if (editor.kehilla) metaParts.push(`<span>${escapeHtml(editor.kehilla)}</span>`);

    return `
      <div class="card" data-id="${editor.id}">
        <div class="card-head">
          <h3 class="card-name">${escapeHtml(editor.name)}</h3>
          <span class="badge ${cls}">${escapeHtml(editor.status || '')}</span>
        </div>
        ${metaParts.length ? `<div class="card-meta">${metaParts.join('')}</div>` : ''}
        ${specHtml ? `<div class="card-specialties">${specHtml}</div>` : ''}
        <div class="card-foot">
          ${cvCount ? `<span class="item"><strong>${cvCount}</strong> קו"ח</span>` : ''}
          ${sampleCount ? `<span class="item"><strong>${sampleCount}</strong> דוגמאות</span>` : ''}
          ${!cvCount && !sampleCount ? `<span class="item" style="color:var(--ink-mute)">לחץ לפרטים</span>` : ''}
        </div>
      </div>
    `;
  }

  // ===== Modal rendering =====
  function renderModal(editor) {
    const cls = badgeClass(editor.status);

    const metaFields = [];
    if (editor.phone) metaFields.push(`<span class="field"><span class="field-label">טלפון:</span> <a href="tel:${escapeHtml(editor.phone.replace(/[^\d+]/g, ''))}">${escapeHtml(editor.phone)}</a></span>`);
    if (editor.email) metaFields.push(`<span class="field"><span class="field-label">אימייל:</span> <a href="mailto:${escapeHtml(editor.email)}">${escapeHtml(editor.email)}</a></span>`);
    if (editor.age) metaFields.push(`<span class="field"><span class="field-label">גיל:</span> ${escapeHtml(editor.age)}</span>`);
    if (editor.kehilla) metaFields.push(`<span class="field"><span class="field-label">קהילה:</span> ${escapeHtml(editor.kehilla)}</span>`);
    if (editor.rate) metaFields.push(`<span class="field"><span class="field-label">תעריף:</span> ${escapeHtml(editor.rate)}</span>`);
    if (editor.availability) metaFields.push(`<span class="field"><span class="field-label">זמינות:</span> ${escapeHtml(editor.availability)}</span>`);
    if (editor.reference) metaFields.push(`<span class="field"><span class="field-label">הפניה:</span> ${escapeHtml(editor.reference)}</span>`);

    const cvSamples = (editor.samples || []).filter(s => s.role === 'cv');
    const workSamples = (editor.samples || []).filter(s => s.role !== 'cv');

    function sampleHtml(s) {
      const ic = sampleIcon(s.type);
      const lbl = sampleTypeLabel(s.type);
      return `
        <div class="sample-item">
          <div class="sample-icon ${ic}">${lbl}</div>
          <div class="sample-info">
            <div class="sample-name">${escapeHtml(s.filename)}</div>
            <div class="sample-role ${s.role === 'cv' ? 'cv' : ''}">${escapeHtml(roleLabel(s.role))}</div>
          </div>
        </div>
      `;
    }

    const gmail = gmailUrl(editor.gmail_thread);

    return `
      <div class="detail-hero">
        <div class="detail-status"><span class="badge ${cls}">${escapeHtml(editor.status || '')}</span></div>
        <h2>${escapeHtml(editor.name)}</h2>
        ${metaFields.length ? `<div class="detail-meta">${metaFields.join('')}</div>` : ''}
      </div>

      ${editor.specialties && editor.specialties.length ? `
        <div class="detail-section">
          <h3>תחומי התמחות</h3>
          <div class="specialties-list">
            ${editor.specialties.map(s => `<span class="tag">${escapeHtml(s)}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      ${editor.bio ? `
        <div class="detail-section">
          <h3>קורות חיים / תיאור</h3>
          <div class="bio-text">${escapeHtml(editor.bio)}</div>
        </div>
      ` : ''}

      ${cvSamples.length ? `
        <div class="detail-section">
          <h3>קובץ קורות חיים</h3>
          <div class="samples-list">${cvSamples.map(sampleHtml).join('')}</div>
        </div>
      ` : ''}

      <div class="detail-section">
        <h3>דוגמאות עבודה</h3>
        ${workSamples.length ? `
          <div class="samples-list">${workSamples.map(sampleHtml).join('')}</div>
          <p style="font-size:12px;color:var(--ink-mute);margin:12px 0 0">
            לצפייה בקבצים — פתח את שרשור המייל בג'ימייל
          </p>
        ` : `
          <div class="no-samples">לא צורפו דוגמאות במייל</div>
        `}
      </div>

      ${gmail ? `
        <div class="detail-section">
          <a class="gmail-link" href="${gmail}" target="_blank" rel="noopener">
            <span>פתח שרשור במייל</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
          </a>
        </div>
      ` : ''}
    `;
  }

  // ===== Filter & search =====
  function filterEditors() {
    const q = currentSearch.trim().toLowerCase();
    return editors.filter(e => {
      // Filter by category
      if (currentFilter === 'active' && !(e.status || '').includes('פעיל')) return false;
      if (currentFilter === 'offer' && !(e.status || '').includes('מציע')) return false;
      if (currentFilter === 'sample' && !(e.status || '').includes('דוגמה')) return false;
      if (currentFilter === 'hassamples' && !(e.samples || []).some(s => s.role !== 'cv')) return false;
      if (currentFilter === 'hascv' && !(e.samples || []).some(s => s.role === 'cv')) return false;

      // Filter by search
      if (!q) return true;
      const hay = [
        e.name, e.status, e.phone, e.email, e.bio, e.kehilla, e.rate,
        ...(e.specialties || []),
        ...((e.samples || []).map(s => s.filename))
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  function render() {
    const list = filterEditors();
    grid.innerHTML = list.map(renderCard).join('');
    emptyState.style.display = list.length ? 'none' : 'block';
  }

  // ===== Events =====
  grid.addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (!card) return;
    const id = card.dataset.id;
    const editor = editors.find(x => x.id === id);
    if (!editor) return;
    modalBody.innerHTML = renderModal(editor);
    modalBody.scrollTop = 0;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  });

  modal.addEventListener('click', e => {
    if (e.target.matches('[data-close]')) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  });

  filterPills.addEventListener('click', e => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentFilter = pill.dataset.filter;
    render();
  });

  searchInput.addEventListener('input', e => {
    currentSearch = e.target.value;
    render();
  });

  render();
})();
