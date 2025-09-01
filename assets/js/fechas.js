(function(){
  // ===== Trimestres (inicio / fin) =====
  // If a boundary falls on Sunday, we will:
  //  - START: move to Monday (+1 day)
  //  - END:   move to Friday (-2 days)
  const TERM1 = ['2025-09-09', '2025-12-21']; // end is a Sunday
  const TERM2 = ['2026-01-08', '2026-03-29']; // end is a Sunday
  const TERM3 = ['2026-04-06', '2026-06-19'];

  // ===== Cierres (sin clase) — 8 Sep NO es cierre =====
  const CIERRES_RANGOS = [
    ['2025-12-22','2026-01-07'], // Navidad (2 semanas)
    ['2026-03-30','2026-04-05'], // Semana Santa (1 semana)
  ];
  const CIERRES_SUELTOS = [
    '2025-12-08', // Inmaculada (nacional)
    '2026-02-02', // Candelaria (Canarias)
  ];

  // ===== Helpers =====
  const makeDate = s => { const [y,m,d]=s.split('-').map(Number); return new Date(y, m-1, d); };
  const d2s = d => d.toISOString().slice(0,10);
  const isoDow = d => (d.getDay()===0 ? 7 : d.getDay()); // 1..7 Mon..Sun
  const inRange = (d,a,b)=> d>=a && d<=b;

  // Adjust a boundary that lands on Sunday
  function adjustBoundaryDate(s, isStart){
    let d = makeDate(s);
    if (isoDow(d) === 7){ // Sunday
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (isStart ? 1 : -2)); // Mon or Fri
    }
    return d2s(d);
  }

  // Build term arrays as Dates
  const TERMS = [TERM1,TERM2,TERM3].map(([a,b])=>[makeDate(a), makeDate(b)]);
  const inAnyTerm = d => TERMS.some(([a,b])=> inRange(d,a,b));

  // Build adjusted "hitos" (markers) that never fall on Sunday
  const HITOS_DISPLAY = [
    adjustBoundaryDate(TERM1[0], true),
    adjustBoundaryDate(TERM1[1], false),
    adjustBoundaryDate(TERM2[0], true),
    adjustBoundaryDate(TERM2[1], false),
    adjustBoundaryDate(TERM3[0], true),
    adjustBoundaryDate(TERM3[1], false),
  ];
  const hitos = new Set(HITOS_DISPLAY); // as date strings yyyy-mm-dd

  // Build set of CLOSED dates, excluding Sundays
  const closed = new Set();
  // singles
  CIERRES_SUELTOS.forEach(s=>{
    const d = makeDate(s);
    if (isoDow(d)!==7) closed.add(s);
  });
  // ranges
  CIERRES_RANGOS.forEach(([f,t])=>{
    let d=makeDate(f), B=makeDate(t);
    while(d<=B){
      if (isoDow(d)!==7) closed.add(d2s(d));
      d=new Date(d.getFullYear(), d.getMonth(), d.getDate()+1);
    }
  });

  // ===== Banner (no banner for Sundays) =====
  (function banner(){
    const el = document.getElementById('banner-hoy');
    if(!el) return;
    const today = new Date(), s = d2s(today);
    const isSunday = isoDow(today) === 7;
    if (!isSunday && (!inAnyTerm(today) || closed.has(s))) {
      el.hidden = false;
      el.textContent = closed.has(s)
        ? 'Hoy no hay clase (cierre).'
        : 'Fuera del periodo lectivo.';
    }
  })();

  // ===== Lists: trimestres + cierres (no weekday names shown) =====
  (function lists(){
    const fmtNoWd = { day:'numeric', month:'long', year:'numeric' };

    // Terms list (use adjusted dates for display, never Sundays)
    const ulTerms = document.getElementById('lista-trimestres');
    if (ulTerms){
      const T1S = adjustBoundaryDate(TERM1[0], true);
      const T1E = adjustBoundaryDate(TERM1[1], false);
      const T2S = adjustBoundaryDate(TERM2[0], true);
      const T2E = adjustBoundaryDate(TERM2[1], false);
      const T3S = adjustBoundaryDate(TERM3[0], true);
      const T3E = adjustBoundaryDate(TERM3[1], false);

      [
        ['Trimestre 1', T1S, T1E],
        ['Trimestre 2', T2S, T2E],
        ['Trimestre 3', T3S, T3E],
      ].forEach(([label, s, e])=>{
        const li=document.createElement('li');
        li.textContent = `${label}: ${makeDate(s).toLocaleDateString('es-ES',fmtNoWd)} — ${makeDate(e).toLocaleDateString('es-ES',fmtNoWd)}`;
        ulTerms.appendChild(li);
      });
    }

    // Closures list (skip Sundays automatically because 'closed' excludes them)
    const ulClosures = document.getElementById('lista-cierres');
    if (ulClosures){
      const out=[];
      closed.forEach(ss=>{
        const d=makeDate(ss);
        if(inAnyTerm(d)) out.push(d);
      });
      out.sort((a,b)=>a-b);
      if(!out.length){
        const li=document.createElement('li'); li.textContent='—'; ulClosures.appendChild(li);
      } else {
        out.forEach(d=>{
          const li=document.createElement('li');
          li.textContent = d.toLocaleDateString('es-ES',fmtNoWd);
          ulClosures.appendChild(li);
        });
      }
    }
  })();

  // ===== Mini-calendario (Sep 2025 → Jun 2026) =====
  (function miniCal(){
    const wrap = document.getElementById('mini-cal');
    if(!wrap) return;

    function* monthsBetween(a,b){
      let y=a.getFullYear(), m=a.getMonth();
      while (y<b.getFullYear() || (y===b.getFullYear() && m<=b.getMonth())) {
        yield {y,m}; m++; if(m>11){m=0;y++;}
      }
    }

    const todayS = d2s(new Date());
    const firstMonth = new Date(2025,8,1); // September
    const lastMonth  = new Date(2026,5,30); // June

    for (const {y,m} of monthsBetween(firstMonth,lastMonth)){
      const first=new Date(y,m,1), last=new Date(y,m+1,0);

      const sec=document.createElement('section'); sec.className='m';
      const h=document.createElement('h4'); h.textContent=first.toLocaleDateString('es-ES',{month:'long',year:'numeric'}); sec.appendChild(h);

      const tbl=document.createElement('table'); tbl.className='cal';
      const thead=document.createElement('thead'); const trh=document.createElement('tr');
      ['L','M','X','J','V','S','D'].forEach(x=>{const th=document.createElement('th'); th.textContent=x; trh.appendChild(th);});
      thead.appendChild(trh); tbl.appendChild(thead);
      const tb=document.createElement('tbody');

      let cur=new Date(first), tr=document.createElement('tr');
      for(let i=(isoDow(cur)-1); i>0; i--){ tr.appendChild(document.createElement('td')); }

      while(cur<=last){
        const td=document.createElement('td');
        const s=d2s(cur);
        const span=document.createElement('span'); span.className='d'; span.textContent=cur.getDate();

        // mark closures & term boundary markers — both already Sunday-free
        if (closed.has(s)) span.classList.add('d--cerrado');
        if (hitos.has(s))  span.classList.add('d--hito');
        if (s===todayS)    span.classList.add('d--hoy');

        td.appendChild(span); tr.appendChild(td);
        if (isoDow(cur)===7){ tb.appendChild(tr); tr=document.createElement('tr'); }
        cur=new Date(cur.getFullYear(),cur.getMonth(),cur.getDate()+1);
      }
      if (isoDow(last)!==7){
        for(let i=isoDow(last); i<7; i++){ tr.appendChild(document.createElement('td')); }
        tb.appendChild(tr);
      }
      tbl.appendChild(tb); sec.appendChild(tbl); wrap.appendChild(sec);
    }
  })();
})();
