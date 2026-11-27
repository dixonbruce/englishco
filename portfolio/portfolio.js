(() => {
  'use strict';
  const root = document.querySelector('.ec-portfolio');
  if (!root) return;
  const $ = s => root.querySelector(s);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const colours = ['#12468f','#00765c','#a65d0a','#a74e2f'];
  const percent = (n,total) => total ? Math.round(n / total * 100) : 0;
  let filter = 'all';
  const load = async url => {
    const response = await fetch(url, {cache:'no-cache'});
    if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
    return response.json();
  };
  function study(item) {
    if (Array.isArray(item.words)) {
      return `<div class="pf-wordgrid">${item.words.map(w => `<div class="pf-word"><span aria-hidden="true">${esc(w.symbol)}</span>${esc(w.word)}</div>`).join('')}</div>`;
    }
    return `<p>${esc(item.lesson)}</p>`;
  }
  function updateFilter() {
    const query = $('#pf-search').value.trim().toLowerCase();
    let visible = 0;
    let total = 0;
    for (const group of root.querySelectorAll('.pf-group')) {
      let groupVisible = 0;
      for (const item of group.querySelectorAll('details')) {
        total++;
        item.hidden = (filter !== 'all' && item.dataset.status !== filter) || (query && !item.textContent.toLowerCase().includes(query));
        if (!item.hidden) { visible++; groupVisible++; }
      }
      group.hidden = groupVisible === 0;
    }
    $('#pf-result').textContent = visible ? `${visible} of ${total} objectives shown` : 'No matching objectives. Try a different search or filter.';
  }
  async function init() {
    const [curriculum, student] = await Promise.all([load(root.dataset.curriculum),load(root.dataset.progress)]);
    if (student.level !== curriculum.level) throw new Error('Student and curriculum levels differ.');
    const achieved = new Set(student.achieved);
    const all = curriculum.groups.flatMap(g => g.items);
    const done = all.filter(i => achieved.has(i.id)).length;
    $('#pf-student').textContent = `${student.name} · Academic year ${student.academicYear}`;
    $('#pf-level').textContent = `Target level: ${curriculum.label}`;
    $('#pf-percent').textContent = `${percent(done,all.length)}%`;
    $('#pf-progress').value = percent(done,all.length);
    $('#pf-total').textContent = `${done} of ${all.length} learning objectives achieved`;
    curriculum.groups.forEach((g,index) => {
      const n = g.items.filter(i => achieved.has(i.id)).length;
      const colour = colours[index % colours.length];
      $('#pf-tiles').insertAdjacentHTML('beforeend',`<div class="pf-tile" style="--pf-accent:${colour}"><span>${esc(g.name)}</span><strong>${n} / ${g.items.length}</strong><progress value="${percent(n,g.items.length)}" max="100" aria-label="${esc(g.name)} progress"></progress></div>`);
      $('#pf-groups').insertAdjacentHTML('beforeend',`<section class="pf-group" style="--pf-accent:${colour}"><div class="pf-group-head"><div><h3>${esc(g.name)}</h3><p>${esc(g.description)}</p></div><span class="pf-count">${n} / ${g.items.length}</span></div>${g.items.map(item => {
        const ok = achieved.has(item.id);
        return `<details data-status="${ok?'achieved':'pending'}"><summary><span class="pf-status ${ok?'':'pf-pending'}" role="img" aria-label="${ok?'Achieved':'Not yet achieved'}">${ok?'✓':'○'}</span><span class="pf-item-title">${esc(item.title)}</span><span class="pf-chevron" aria-hidden="true">⌄</span></summary><div class="pf-content"><p><strong>${esc(item.can)}</strong></p><div class="pf-example">${esc(item.example)}</div><div><h4>Study &amp; practise</h4>${study(item)}</div><div class="pf-assessment"><h4>How to demonstrate mastery</h4><p>${esc(item.assessment)}</p></div><p class="pf-small">${ok?'✓ Mastery verified by your teacher':'○ Awaiting successful assessment'}</p></div></details>`;
      }).join('')}</section>`);
    });
    for (const button of root.querySelectorAll('[data-pf-filter]')) button.addEventListener('click', () => {
      filter = button.dataset.pfFilter;
      for (const other of root.querySelectorAll('[data-pf-filter]')) other.setAttribute('aria-pressed',String(other === button));
      updateFilter();
    });
    $('#pf-search').addEventListener('input',updateFilter);
    updateFilter();
  }
  init().catch(error => {
    $('#pf-result').textContent = 'The portfolio could not load. Check that both JSON files are uploaded to portfolio/data/ and refresh.';
    $('#pf-total').textContent = 'Progress unavailable';
    console.error(error);
  });
})();
