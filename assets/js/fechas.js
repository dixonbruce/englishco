(function(){

  // ===== Trimestres (inicio / fin) =====
  const TERM1 = ['2026-09-07', '2026-12-22'];
  const TERM2 = ['2027-01-11', '2027-03-19'];
  const TERM3 = ['2027-04-05', '2027-06-18'];


  // ===== Vacaciones escolares =====
  const CIERRES_RANGOS = [
    ['2026-12-23','2027-01-09'], // Navidad
    ['2027-03-22','2027-03-26'], // Semana Santa
  ];


  // ===== Festivos y cierres sueltos =====
  const CIERRES_SUELTOS = [
    ['2026-09-08', 'Nuestra Señora del Pino (Gran Canaria)'],

    ['2026-10-12', 'Fiesta Nacional de España'],
    ['2026-11-02', 'Todos los Santos'],
    ['2026-12-07', 'Día del Enseñante y del Estudiante'],
    ['2026-12-08', 'Inmaculada Concepción'],

    ['2027-01-06', 'Día de Reyes'],
    ['2027-01-20', 'San Sebastián (Agüimes)'],

    ['2027-02-08', 'Carnaval'],
    ['2027-02-09', 'Carnaval'],

    ['2027-05-01', 'Día del Trabajo'],
    ['2027-05-30', 'Día de Canarias'],
  ];


  // ===== Helpers =====

  const makeDate = s => {
    const [y,m,d] = s.split('-').map(Number);
    return new Date(y, m-1, d);
  };


  const d2s = d => {
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  };


  const isoDow = d => (d.getDay()===0 ? 7 : d.getDay());

  const inRange = (d,a,b)=> d>=a && d<=b;


  function adjustBoundaryDate(s,isStart){
    let d = makeDate(s);

    if(isoDow(d)===7){
      d = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate() + (isStart ? 1 : -2)
      );
    }

    return d2s(d);
  }


  // ===== Terms =====

  const TERMS = [
    TERM1,
    TERM2,
    TERM3
  ].map(([a,b])=>[
    makeDate(a),
    makeDate(b)
  ]);


  const inAnyTerm = d =>
    TERMS.some(([a,b])=>inRange(d,a,b));


  // ===== Hitos =====

  const HITOS_DISPLAY = [
    adjustBoundaryDate(TERM1[0],true),
    adjustBoundaryDate(TERM1[1],false),

    adjustBoundaryDate(TERM2[0],true),
    adjustBoundaryDate(TERM2[1],false),

    adjustBoundaryDate(TERM3[0],true),
    adjustBoundaryDate(TERM3[1],false),
  ];


  const hitos = new Set(HITOS_DISPLAY);


  // ===== Closed days =====

  const closed = new Set();
  const closedReasons = {};


  function addClosed(date,reason){

    const d = makeDate(date);

    if(isoDow(d)!==7){

      closed.add(date);

      if(reason){
        closedReasons[date]=reason;
      }

    }
  }


  // Single holidays

  CIERRES_SUELTOS.forEach(([date,reason])=>{
    addClosed(date,reason);
  });


  // Ranges

  CIERRES_RANGOS.forEach(([from,to])=>{

    let d = makeDate(from);
    const end = makeDate(to);

    while(d<=end){

      const s=d2s(d);

      addClosed(
        s,
        s>= '2026-12-23' && s<='2027-01-08'
          ? 'Vacaciones de Navidad'
          : 'Semana Santa'
      );

      d=new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate()+1
      );

    }

  });



  // ===== Banner =====

  (function banner(){

    const el=document.getElementById('banner-hoy');

    if(!el) return;

    const today=new Date();
    const s=d2s(today);

    if(
      isoDow(today)!==7 &&
      (!inAnyTerm(today) || closed.has(s))
    ){

      el.hidden=false;

      el.textContent =
        closed.has(s)
        ? `Hoy no hay clase: ${closedReasons[s] || 'cierre'}`
        : 'Fuera del periodo lectivo.';

    }

  })();



  // ===== Lists =====

  (function lists(){

    const fmt={
      day:'numeric',
      month:'long',
      year:'numeric'
    };


    const ulTerms=
      document.getElementById('lista-trimestres');


    if(ulTerms){

      [
        ['Trimestre 1',
          adjustBoundaryDate(TERM1[0],true),
          adjustBoundaryDate(TERM1[1],false)],

        ['Trimestre 2',
          adjustBoundaryDate(TERM2[0],true),
          adjustBoundaryDate(TERM2[1],false)],

        ['Trimestre 3',
          adjustBoundaryDate(TERM3[0],true),
          adjustBoundaryDate(TERM3[1],false)]

      ].forEach(([name,start,end])=>{

        const li=document.createElement('li');

        li.textContent =
          `${name}: ${makeDate(start).toLocaleDateString('es-ES',fmt)} — ${makeDate(end).toLocaleDateString('es-ES',fmt)}`;

        ulTerms.appendChild(li);

      });

    }



    const ulClosures=
      document.getElementById('lista-cierres');


    if(ulClosures){

      const dates=[...closed]
        .map(x=>makeDate(x))
        .filter(d=>inAnyTerm(d))
        .sort((a,b)=>a-b);


      dates.forEach(d=>{

        const s=d2s(d);

        const li=document.createElement('li');

        li.textContent =
          `${d.toLocaleDateString('es-ES',fmt)} — ${closedReasons[s] || 'Sin clase'}`;

        ulClosures.appendChild(li);

      });

    }


  })();



  // ===== Mini calendario =====

  (function miniCal(){

    const wrap=document.getElementById('mini-cal');

    if(!wrap) return;


    function* monthsBetween(a,b){

      let y=a.getFullYear();
      let m=a.getMonth();

      while(
        y<b.getFullYear() ||
        (y===b.getFullYear() && m<=b.getMonth())
      ){

        yield {y,m};

        m++;

        if(m>11){
          m=0;
          y++;
        }

      }

    }


    const todayS=d2s(new Date());

    const firstMonth=new Date(2026,8,1);
    const lastMonth=new Date(2027,5,30);



    for(const {y,m} of monthsBetween(firstMonth,lastMonth)){


      const first=new Date(y,m,1);
      const last=new Date(y,m+1,0);


      const sec=document.createElement('section');
      sec.className='m';


      const h=document.createElement('h4');

      h.textContent =
        first.toLocaleDateString(
          'es-ES',
          {
            month:'long',
            year:'numeric'
          }
        );

      sec.appendChild(h);



      const tbl=document.createElement('table');
      tbl.className='cal';


      const thead=document.createElement('thead');
      const trh=document.createElement('tr');


      ['L','M','X','J','V','S','D']
      .forEach(x=>{

        const th=document.createElement('th');
        th.textContent=x;
        trh.appendChild(th);

      });


      thead.appendChild(trh);
      tbl.appendChild(thead);



      const tb=document.createElement('tbody');


      let cur=new Date(first);
      let tr=document.createElement('tr');


      for(let i=isoDow(cur)-1;i>0;i--){
        tr.appendChild(document.createElement('td'));
      }



      while(cur<=last){

        const td=document.createElement('td');

        const s=d2s(cur);

        const span=document.createElement('span');

        span.className='d';
        span.textContent=cur.getDate();


        if(closed.has(s))
          span.classList.add('d--cerrado');

        if(hitos.has(s))
          span.classList.add('d--hito');

        if(s===todayS)
          span.classList.add('d--hoy');


        td.appendChild(span);

        tr.appendChild(td);



        if(isoDow(cur)===7){

          tb.appendChild(tr);
          tr=document.createElement('tr');

        }


        cur=new Date(
          cur.getFullYear(),
          cur.getMonth(),
          cur.getDate()+1
        );

      }



      if(isoDow(last)!==7){

        for(let i=isoDow(last);i<7;i++){
          tr.appendChild(document.createElement('td'));
        }

        tb.appendChild(tr);

      }


      tbl.appendChild(tb);

      sec.appendChild(tbl);

      wrap.appendChild(sec);

    }


  })();


})();
