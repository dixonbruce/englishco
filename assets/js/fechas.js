(function(){
  // ===== Trimestres (inicio/fin de cada uno) =====
  const TERM1 = ['2025-09-09', '2025-12-21']; // hasta el día antes de Navidad
  const TERM2 = ['2026-01-08', '2026-03-29']; // hasta el día antes de Semana Santa
  const TERM3 = ['2026-04-06', '2026-06-19'];

  // ===== Cierres (sin clase) — Ojo: 8 Sep NO está cerrado =====
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

  const TERMS = [TERM1,TERM2,TERM3].map(([a,b])=>[makeDate(a), makeDate(b)]);
  const inAnyTerm = d => TERMS.some(([a,b])=> inRange(d,a,b));

// Build sets
const closed = new Set();
CIERRES_SUELTOS.forEach(s=>{
  const d = makeDate(s);
  if(isoDow(d)!==7) closed.add(s);  // exclude Sundays
});
CIERRES_RANGOS.forEach(([f,t])=>{
  let d=makeDate(f), B=makeDate(t);
  while(d<=B){
    if(isoDow(d)!==7) closed.add(d2s(d));  // exclude Sundays
    d=new Date(d.getFullYear(), d.getMonth(), d.getDate()+1);
  }
});

// Term start/finish markers (hitos)
const rawHitos = [TERM1[0],TERM1[1],TERM2[0],TERM2[1],TERM3[0],TERM3[1]];
const hitos = new Set(rawHitos.filter(s => isoDow(makeDate(s))!==7)););

  // ===== Banner (si hoy es cierre o fuera de periodo lectivo) =====
  (function banner(){
    const el = document.getElementById('banner-hoy');
    if(!el) return;
    const today = new Date(), s = d2s(today);
    if (!inAnyTerm(today) || closed.has(s)) {
      el.hidden = false;
      el.textContent = closed.has(s)
        ? 'Hoy no hay clase (cierre).'
        : 'Fuera del periodo lectivo.';
    }
  })();

  // ===== Listas: trimestres y cierres =====
  (function lists(){
    const fmt = {weekday:'long', day:'numeric', month:'long', year:'numeric'};

    const ulTerms = document.getElementById('lista-trimestres');
    if (ulTerms){
      [[...TERM1],[...TERM2],[...TERM3]].forEach((t,i)=>{
        const li=document.createElement('li');
        li.textContent = `Trimestre ${i+1}: ${makeDate(t[0]).toLocaleDateString('es-ES',fmt)} — ${makeDate(t[1]).toLocaleDateString('es-ES',fmt)}`;
        ulTerms.appendChild(li);
      });
    }

    const ulClosures = document.getElementById('lista-cierres');
    if (ulClosures){
      const out=[];
      closed.forEach(s=>{
        const d=makeDate(s);
        if(inAnyTerm(d)) out.push(d);
      });
      out.sort((a,b)=>a-b);
      if(!out.length){
        const li=document.createElement('li'); li.textContent='—'; ulClosures.appendChild(li);
      } else {
        out.forEach(d=>{
          const li=document.createElement('li');
          li.textContent = d.toLocaleDateString('es-ES',fmt);
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
    const firstMonth = new Date(2025,8,1); // Sep
    const lastMonth  = new Date(2026,5,30); // Jun

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
