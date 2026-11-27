(() => {
  'use strict';
  const root = document.querySelector('.ec-portfolio');
  if (!root) return;
  const $ = s => root.querySelector(s);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const colours = ['#12468f','#00765c','#a65d0a','#a74e2f'];
  const percent = (n,total) => total ? Math.round(n / total * 100) : 0;
  const items = group => [...group.querySelectorAll('details[data-objective]')];
  const groups = () => [...root.querySelectorAll('.pf-group')];
  let filter = 'all';
  async function load(url) {
    const response = await fetch(url, {cache:'no-cache'});
    if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
    return response.json();
  }
  // Compatibility with the existing Movers JSON curriculum. Starters uses HTML only.
  function renderLegacy(curriculum) {
    $('#pf-groups').innerHTML = curriculum.groups.map((g,index) => {
      const colour = colours[index % colours.length];
      return `<section class="pf-group" style="--pf-accent:${colour}"><div class="pf-group-head"><div><h3>${esc(g.name)}</h3><p>${esc(g.description)}</p></div><span class="pf-count">— / ${g.items.length}</span></div>${g.items.map(i => `<details data-objective="${esc(i.id)}" data-status="unknown"><summary><span class="pf-status pf-pending" role="img" aria-label="Progress unavailable">—</span><span class="pf-item-title">${esc(i.title)}</span><span class="pf-chevron" aria-hidden="true">⌄</span></summary><div class="pf-content"><p><strong>${esc(i.can)}</strong></p><div class="pf-example">${esc(i.example)}</div><div class="pf-study"><h4>Study &amp; practise</h4>${Array.isArray(i.words)?`<div class="pf-wordgrid">${i.words.map(w=>`<div class="pf-word"><span aria-hidden="true">${esc(w.symbol)}</span>${esc(w.word)}</div>`).join('')}</div>`:`<p>${esc(i.lesson)}</p>`}</div><div class="pf-assessment"><h4>How to demonstrate mastery</h4><p>${esc(i.assessment)}</p></div><p class="pf-small pf-mastery">Progress unavailable</p></div></details>`).join('')}</section>`;
    }).join('');
  }
  function updateFilter() {
    const query = $('#pf-search').value.trim().toLowerCase();
    let visible = 0, total = 0;
    for (const group of groups()) {
      let count = 0;
      for (const item of items(group)) {
        total++;
        item.hidden = (filter !== 'all' && item.dataset.status !== filter) || (query !== '' && !item.textContent.toLowerCase().includes(query));
        if (!item.hidden) { visible++; count++; }
      }
      group.hidden = count === 0;
    }
    $('#pf-result').textContent = visible ? `${visible} of ${total} objectives shown` : 'No matching objectives. Try a different search or filter.';
  }
  function renderProgress(student) {
    const achieved = student ? new Set(student.achieved) : null;
    const all = groups().flatMap(items);
    const done = achieved ? all.filter(i => achieved.has(i.dataset.objective)).length : 0;
    $('#pf-student').textContent = student ? `${student.name} · Academic year ${student.academicYear}` : 'Student progress unavailable';
    $('#pf-percent').textContent = achieved ? `${percent(done,all.length)}%` : '—';
    $('#pf-progress').value = percent(done,all.length);
    $('#pf-progress').hidden = !achieved;
    $('#pf-total').textContent = achieved ? `${done} of ${all.length} learning objectives achieved` : `${all.length} learning objectives · Progress unavailable`;
    $('#pf-tiles').replaceChildren();
    for (const group of groups()) {
      const list = items(group);
      const n = achieved ? list.filter(i=>achieved.has(i.dataset.objective)).length : 0;
      const label = group.querySelector('h3').textContent;
      const colour = group.style.getPropertyValue('--pf-accent');
      const count = `${achieved?n:'—'} / ${list.length}`;
      group.querySelector('.pf-count').textContent = count;
      $('#pf-tiles').insertAdjacentHTML('beforeend',`<div class="pf-tile" style="--pf-accent:${esc(colour)}"><span>${esc(label)}</span><strong>${count}</strong>${achieved?`<progress value="${percent(n,list.length)}" max="100" aria-label="${esc(label)} progress"></progress>`:''}</div>`);
      for (const item of list) {
        const ok = achieved && achieved.has(item.dataset.objective);
        item.dataset.status = !achieved ? 'unknown' : ok ? 'achieved' : 'pending';
        const status = item.querySelector('.pf-status');
        status.classList.toggle('pf-pending',!ok);
        status.textContent = !achieved ? '—' : ok ? '✓' : '○';
        status.setAttribute('aria-label',!achieved ? 'Progress unavailable' : ok ? 'Achieved' : 'Not yet achieved');
        item.querySelector('.pf-mastery').textContent = !achieved ? 'Progress unavailable' : ok ? '✓ Mastery verified by your teacher' : '○ Awaiting successful assessment';
      }
    }
    for (const button of root.querySelectorAll('[data-pf-filter]')) button.disabled = !achieved && button.dataset.pfFilter !== 'all';
    updateFilter();
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('.pf-answer-toggle');
    if (!button || !root.contains(button)) return;
    const answer = document.getElementById(button.getAttribute('aria-controls'));
    if (!answer || !root.contains(answer)) return;
    answer.hidden = !answer.hidden;
    button.setAttribute('aria-expanded',String(!answer.hidden));
    button.textContent = answer.hidden ? 'Show answers' : 'Hide answers';
  });
  for (const button of root.querySelectorAll('[data-pf-filter]')) button.addEventListener('click', () => {
    filter = button.dataset.pfFilter;
    for (const other of root.querySelectorAll('[data-pf-filter]')) other.setAttribute('aria-pressed',String(other === button));
    updateFilter();
  });
  $('#pf-search').addEventListener('input',updateFilter);
  async function init() {
    let level = root.dataset.level, label = root.dataset.label;
    if (root.dataset.curriculum) {
      const curriculum = await load(root.dataset.curriculum);
      level = curriculum.level; label = curriculum.label;
      renderLegacy(curriculum);
    }
    const all = groups().flatMap(items);
    if (!all.length || new Set(all.map(i=>i.dataset.objective)).size !== all.length) throw new Error('Missing or duplicate curriculum objective IDs.');
    $('#pf-level').textContent = `Target level: ${label}`;
    renderProgress(null);
    try {
      const student = await load(root.dataset.progress);
      if (student.level !== level || !Array.isArray(student.achieved)) throw new Error('Invalid student progress or mismatched level.');
      renderProgress(student);
    } catch (error) {
      console.warn('Student progress unavailable; lessons remain accessible.',error);
    }
  }
  init().catch(error => {
    $('#pf-result').textContent = 'The curriculum could not load. Check the portfolio files and refresh.';
    $('#pf-total').textContent = 'Progress unavailable';
    console.error(error);
  });
})();
