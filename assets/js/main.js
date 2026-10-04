/* STASH website behavior: tabs, hero machine, lineup, address suggestions, inquiry form */
(function(){
  let reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  try{ localStorage.removeItem('stash-motion'); }catch(_){} // setting from the retired pause button
  const hoverable = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- tabs ---------- */
  const panes=[...document.querySelectorAll('.pane')], tabsEls=[...document.querySelectorAll('.tab')];
  function showPane(id, target, focusPane){
    panes.forEach(p=>p.hidden = p.dataset.pane!==id);
    tabsEls.forEach(t=>{ if(t.dataset.go===id) t.setAttribute('aria-current','page'); else t.removeAttribute('aria-current'); });
    dispatchEvent(new Event('resize'));
    requestAnimationFrame(()=>{
      if(target && target.closest('.pane')) target.scrollIntoView({behavior: reduce?'auto':'smooth', block:'start'});
      else { scrollTo({top:0, behavior:'auto'}); if(focusPane){ const hd=document.querySelector('#pane-'+id+' h1, #pane-'+id+' h2'); if(hd){ hd.setAttribute('tabindex','-1'); hd.focus({preventScroll:true}); } } }
    });
  }
  function route(hash){
    const id=(hash||'').replace('#','');
    if(!id || id==='top'){ showPane('home'); return; }
    if(['home','machines','about'].includes(id)){ showPane(id, null, true); return; }
    const el=document.getElementById(id); const p=el && el.closest('.pane');
    if(p) showPane(p.dataset.pane, el);
  }
  document.addEventListener('click', e=>{
    const a=e.target.closest('a[href^="#"]'); if(!a) return;
    if(a.hasAttribute('data-skip')){ e.preventDefault(); const mn=document.getElementById('top'); const p=mn.querySelector('.pane:not([hidden])'); (p&&p.querySelector('h1,h2')||mn).setAttribute('tabindex','-1'); (p&&p.querySelector('h1,h2')||mn).focus(); return; }
    const h=a.getAttribute('href'); if(h==='#') return;
    e.preventDefault(); route(h);
    try{ history.replaceState(null,'',h) }catch(_){}
  });
  if(location.hash) route(location.hash);
  addEventListener('hashchange',()=>route(location.hash));

  /* ---------- hero machine ---------- */
  const m = document.getElementById('machine'), peek = document.getElementById('peek'), peekLabel = document.getElementById('peekLabel');
  let settleT;
  function setOpen(open){
    m.classList.toggle('is-open', open);
    m.setAttribute('aria-pressed', open);
    m.style.setProperty('--mw', m.offsetWidth + 'px');
    m.classList.remove('settled'); clearTimeout(settleT);
    settleT = setTimeout(()=>m.classList.add('settled'), 800);
    peekLabel.textContent = open ? (hoverable ? 'Stocked and ready' : 'Tap to close') : (hoverable ? 'Hover to look inside' : 'Tap to look inside');
  }
  peekLabel.textContent = hoverable ? 'Hover to look inside' : 'Tap to look inside';
  if (hoverable){
    m.addEventListener('mouseenter', ()=>setOpen(true));
    m.addEventListener('mouseleave', ()=>setOpen(false));
    peek.addEventListener('mouseenter', ()=>setOpen(true));
    peek.addEventListener('mouseleave', ()=>setOpen(false));
  }
  m.addEventListener('click', ()=>setOpen(!m.classList.contains('is-open')));
  peek.addEventListener('click', ()=>setOpen(!m.classList.contains('is-open')));

  /* ---------- address suggestions (Photon / OpenStreetMap) ---------- */
  (function(){
    const inp=document.getElementById('f-addr'), list=document.getElementById('addrList'), city=document.getElementById('f-city');
    let items=[], idx=-1, t=null, ctrl=null;
    function close(){ list.hidden=true; inp.setAttribute('aria-expanded','false'); idx=-1; }
    function fmt(p){
      const street=[p.housenumber,p.street].filter(Boolean).join(' ');
      const line1 = p.name && p.name!==p.street ? (street? p.name+', '+street : p.name) : (street || p.name || '');
      const line2=[p.city||p.town||p.village||p.county, p.state, p.postcode].filter(Boolean).join(', ');
      return {line1,line2,full:[line1,line2].filter(Boolean).join(', '),city:p.city||p.town||p.village||''};
    }
    function render(){
      list.innerHTML='';
      items.forEach((it,i)=>{
        const li=document.createElement('li'); li.role='option'; li.id='addr-'+i; li.setAttribute('aria-selected',i===idx);
        const b=document.createElement('b'); b.textContent=it.line1; const sp=document.createElement('span'); sp.textContent=it.line2;
        li.append(b,sp); li.addEventListener('mousedown',e=>{e.preventDefault(); pick(i)}); list.appendChild(li);
      });
      const c=document.createElement('li'); c.className='credit'; c.textContent='Suggestions © OpenStreetMap contributors'; list.appendChild(c);
      list.hidden=!items.length; inp.setAttribute('aria-expanded',String(!!items.length));
      if(idx>=0) inp.setAttribute('aria-activedescendant','addr-'+idx); else inp.removeAttribute('aria-activedescendant');
    }
    function pick(i){ const it=items[i]; if(!it) return; inp.value=it.full; if(city && it.city && !city.value) city.value=it.city; close(); }
    async function search(q){
      if(ctrl) ctrl.abort(); ctrl=new AbortController();
      try{
        const r=await fetch('https://photon.komoot.io/api/?limit=6&lang=en&q='+encodeURIComponent(q),{signal:ctrl.signal});
        const j=await r.json();
        const seen=new Set();
        items=(j.features||[]).map(f=>f.properties).filter(p=>p.countrycode==='US').map(fmt).filter(it=>it.line1 && !seen.has(it.full) && seen.add(it.full)).slice(0,5);
        idx=-1; render();
      }catch(_){ /* offline or blocked: the box works as a normal text field */ }
    }
    inp.addEventListener('input',()=>{ clearTimeout(t); const q=inp.value.trim(); if(q.length<4){ items=[]; close(); return; } t=setTimeout(()=>search(q),250); });
    inp.addEventListener('keydown',e=>{
      if(list.hidden) return;
      if(e.key==='ArrowDown'){ e.preventDefault(); idx=(idx+1)%items.length; render(); }
      else if(e.key==='ArrowUp'){ e.preventDefault(); idx=(idx-1+items.length)%items.length; render(); }
      else if(e.key==='Enter' && idx>=0){ e.preventDefault(); pick(idx); }
      else if(e.key==='Escape'){ close(); }
    });
    inp.addEventListener('blur',()=>setTimeout(close,120));
  
})();

  /* ---------- screen themes ---------- */
  const sV=document.getElementById('scrVape'), sP=document.getElementById('scrPoke');
  let poke=false, scrTimer=null;
  function setScreen(p){ poke=p; m.classList.toggle('show-poke',p); sV.setAttribute('aria-pressed',!p); sP.setAttribute('aria-pressed',p); }
  addEventListener('stash:pause',()=>clearInterval(scrTimer));
  function cycle(){ clearInterval(scrTimer); if(!reduce) scrTimer=setInterval(()=>{ if(!m.classList.contains('is-open')) setScreen(!poke) },4000); }
  sV.addEventListener('click',()=>{setScreen(false);cycle()}); sP.addEventListener('click',()=>{setScreen(true);cycle()});
  cycle();

  /* ---------- brush-stroke hero canvas ---------- */
  const cv = document.getElementById('strokes'), cx = cv.getContext('2d');
  let strokes = [], W = 0, H = 0, t0 = performance.now();
  function rand(a,b){return a + Math.random()*(b-a)}
  function build(){
    const dpr = Math.min(devicePixelRatio||1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W*dpr; cv.height = H*dpr; cx.setTransform(dpr,0,0,dpr,0,0);
    const n = Math.round(Math.max(14, W/55));
    strokes = Array.from({length:n}, (_,i)=>({
      x: rand(-0.2,1.1)*W, y: rand(-0.1,1.1)*H,
      len: rand(120, 420), w: rand(10, 46),
      ang: rand(-1.05,-0.75), a: rand(.12,.5),
      hue: Math.random()<.25 ? '#6f9bff' : (Math.random()<.5 ? '#2d6bff' : '#1b3fbf'),
      sp: rand(.08,.3), ph: rand(0,6.28)
    }));
  }
  function drawStroke(s, dx, dy){
    const cos = Math.cos(s.ang), sin = Math.sin(s.ang);
    const x0 = s.x+dx, y0 = s.y+dy;
    cx.save(); cx.translate(x0,y0); cx.rotate(s.ang);
    cx.globalAlpha = s.a; cx.fillStyle = s.hue;
    // dry-brush: several bristle lines with ragged ends
    const bristles = Math.max(4, Math.round(s.w/3));
    for (let b=0;b<bristles;b++){
      const off = (b/bristles - .5)*s.w;
      const start = (Math.sin(b*12.9+s.ph)*.5+.5)*s.len*.12;
      const end = s.len - (Math.cos(b*7.3+s.ph)*.5+.5)*s.len*.22;
      cx.fillRect(start, off, end-start, s.w/bristles*1.1);
    }
    cx.restore();
  }
  function frame(now){
    const t = (now - t0)/1000;
    cx.clearRect(0,0,W,H);
    for (const s of strokes){
      const drift = reduce ? 0 : Math.sin(t*s.sp + s.ph)*14;
      drawStroke(s, drift, -drift*.6);
    }
    if (!reduce) requestAnimationFrame(frame);
  }
  build(); requestAnimationFrame(frame);
  let rt; addEventListener('resize', ()=>{clearTimeout(rt); rt=setTimeout(()=>{build(); if(reduce) frame(performance.now());},150)});

  /* ---------- locations ---------- */
  const pin = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 6l6 6-6 6"/></svg>';
  const LOCS = [
    {k:'Hotels', why:'Guests forget things. A charger, a toothbrush, a power bank for tomorrow\'s flight. STASH turns the lobby into a 24/7 travel shop.', mix:[['Chargers & cables','Phone, USB-C, Lightning'],['Power banks','Grab-and-go'],['Travel essentials','Toothbrush, razors, mini kits'],['Hygiene','Personal-care basics']], m:'Custom mix'},
    {k:'Apartments', why:'A resident needs a charger at midnight and doesn\'t want to drive for one item. STASH becomes the amenity downstairs.', mix:[['Electronics','Chargers, earbuds, batteries'],['Personal care','Beauty & hygiene basics'],['Late-night needs','The stuff you ran out of'],['Collectibles','Cards for residents who rip']], m:'Custom mix'},
    {k:'Arcades', why:'Players are already in collecting mode. Booster packs and mystery items sell themselves between games.', mix:[['Pokémon TCG','Booster packs & tins'],['Sports cards','Hobby & retail packs'],['Mystery slabs','Graded surprise pulls'],['Electronics','Controllers & accessories']], m:'Trading cards'},
    {k:'Bars & nightlife', why:'A completely different crowd at 1 a.m. Adult-only machines with the products people step outside for.', mix:[['Disposable vapes','21+ only'],['Nicotine pouches','21+ only'],['Chargers','Dead phone, no ride home'],['Essentials','Gum, mints & more']], m:'Vapes', age:true},
    {k:'Gyms', why:'Members come in forgetting headphones, charging cables and personal-care items. We stock what your members reach for.', mix:[['Earbuds','Wired & wireless'],['Chargers','Quick top-ups'],['Personal care','Deodorant, hygiene'],['Drinks','Where permitted']], m:'Custom mix'},
    {k:'Offices & hospitals', why:'Long shifts, visitors waiting, no time to leave the building. STASH is open when the gift shop isn\'t.', mix:[['Phone chargers','The #1 forgotten item'],['Personal care','Travel-size basics'],['Electronics','Cables & batteries'],['Comfort items','For long waits']], m:'Custom mix'}
  ];
  const tabs = document.getElementById('locTabs'), panel = document.getElementById('locPanel');
  function renderLoc(i){
    [...tabs.children].forEach((b,j)=>{b.setAttribute('aria-selected', i===j); b.tabIndex = i===j?0:-1});
    const L = LOCS[i];
    panel.innerHTML = `<p class="eyebrow">Suggested machine: ${L.m}${L.age?' · 21+':''}</p><h3>${L.k}</h3><p class="why">${L.why}</p><div class="mix">${L.mix.map(x=>`<div><b>${x[0]}</b><span>${x[1]}</span></div>`).join('')}</div><p class="loc-note">Starting mix only. We tune every machine to what actually sells at your location.</p>`;
  }
  LOCS.forEach((L,i)=>{
    const b = document.createElement('button'); b.type='button'; b.role='tab'; b.id='tab-'+i;
    b.className='loc-tab'; b.innerHTML = `<span>${L.k}</span>${pin}`;
    b.addEventListener('click', ()=>renderLoc(i));
    b.addEventListener('keydown', e=>{ if(e.key==='ArrowDown'||e.key==='ArrowRight'){e.preventDefault(); const n=(i+1)%LOCS.length; renderLoc(n); tabs.children[n].focus()} if(e.key==='ArrowUp'||e.key==='ArrowLeft'){e.preventDefault(); const n=(i-1+LOCS.length)%LOCS.length; renderLoc(n); tabs.children[n].focus()} });
    tabs.appendChild(b);
  });
  renderLoc(0);

  /* ---------- lineup ---------- */
  const LU = [
    {n:'STASH Tower', s:'Touchscreen vending tower', img:'assets/img/machines/stash-tower-vape.webp', d:'Our flagship. An edge-lit touchscreen tower with eight shelves behind the door, built for trading cards, vapes and nicotine pouches.', c:['Touchscreen','Card & tap to pay','ID check for 21+','Arcades · Bars · Lounges']},
    {n:'STASH Kiosk', s:'Tech & travel essentials', img:'assets/img/machines/mini-wall-white.webp', d:'A compact touchscreen kiosk with a pickup bay. Earbuds, power banks, cables, travel and grooming kits, snacks and hydration.', c:['Touchscreen','Tap to pay','Pickup bay','Hotels · Offices · Gyms · Nightlife']},
    {n:'STASH Smart Fridge', s:'Tap, open, grab, close', img:'assets/img/machines/smart-fridge.webp', d:'A single-door smart fridge. Tap your card, open the door, grab what you want and close it. You are charged only for what you take.', c:['Tap card to unlock','Refrigerated','5 shelves','Apartments · Offices']},
    {n:'STASH Smart Market', s:'Double-door grab-and-go', img:'assets/img/machines/smart-market.webp', d:'Two refrigerated doors and one kiosk: a full grab-and-go market for lobbies and break rooms. Drinks, dairy, snacks and fresh items.', c:['Two doors','Refrigerated','Kiosk checkout','Lobbies · Break rooms']}
  ];
  const luList=document.getElementById('luList'), luImgs=document.getElementById('luImgs'), luInfo=document.getElementById('luInfo');
  let luCur=0, luTimer=null, luAuto=!reduce;
  addEventListener('stash:pause',()=>{ luAuto=false; clearTimeout(luTimer); document.querySelectorAll('.lu-btn .bar').forEach(b=>b.classList.remove('run')); });
  LU.forEach((x,i)=>{
    const im=document.createElement('img'); im.src=x.img; im.alt=x.n+' render'; luImgs.appendChild(im);
    const b=document.createElement('button'); b.type='button'; b.className='lu-btn';
    b.innerHTML=`<span class="th"><img src="${x.img}" alt=""></span><span><b>${x.n}</b><small>${x.s}</small></span><span class="bar"></span>`;
    b.addEventListener('click',()=>{luAuto=false; luShow(i)});
    luList.appendChild(b);
  });
  function luShow(i){
    luCur=i;
    [...luImgs.children].forEach((im,j)=>im.classList.toggle('on',j===i));
    [...luList.children].forEach((b,j)=>{b.setAttribute('aria-pressed',j===i); const bar=b.querySelector('.bar'); bar.classList.remove('run'); if(j===i&&luAuto){void bar.offsetWidth; bar.classList.add('run')}});
    const x=LU[i];
    luInfo.innerHTML=`<h3>${x.n}</h3><p>${x.d}</p><div class="lu-chips">${x.c.map(c=>`<span>${c}</span>`).join('')}</div>`;
    clearTimeout(luTimer); if(luAuto) luTimer=setTimeout(()=>luShow((luCur+1)%LU.length),6000);
  }
  luShow(0);

  /* ---------- STASH map (illustrative) ---------- */
  (function(){
    const box=document.getElementById('mapx'); if(!box) return;
    const mc=document.getElementById('mapCanvas'), mx=mc.getContext('2d');
    const pinsEl=document.getElementById('mxPins'), card=document.getElementById('mxCard'), qEl=document.getElementById('mxQuery');
    const GX=12, GY=10, MAJ_X=[3,6,9], MAJ_Y=[3,6,8];
    const YOU={gx:7,gy:5};
    const ICON={
      cards:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="5" y="3" width="11" height="15" rx="2"/><path d="M9 21h9a2 2 0 0 0 2-2V8"/></svg>',
      vapes:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="8" y="7" width="8" height="14" rx="2.5"/><path d="M10 7V3h4v4M12 12v3"/></svg>',
      mix:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L5 13h6l-1 9 8-11h-6z"/></svg>'
    };
    const PINS=[
      {gx:3,gy:3,t:'cards',name:'Level Up Arcade',kind:'Arcade',r:'4.8',n:'412',items:['Pokémon packs','Mystery packs','Sports cards']},
      {gx:10,gy:5,t:'vapes',name:'The Corner Lounge',kind:'Bar & lounge',r:'4.6',n:'287',items:['Disposable vapes','Nicotine pouches','Chargers'],age:1},
      {gx:4,gy:8,t:'mix',name:'QuickFuel Gas & Go',kind:'Gas station',r:'4.4',n:'198',items:['Phone chargers','Power banks','Pokémon packs']},
      {gx:9,gy:3,t:'cards',name:'Pixel Pit Game Room',kind:'Arcade',r:'4.7',n:'156',items:['Pokémon packs','Booster boxes']},
      {gx:10,gy:8,t:'mix',name:'Parkside Residences',kind:'Apartments',r:'4.5',n:'91',items:['Chargers','Earbuds','Travel kits']},
      {gx:2,gy:5,t:'vapes',name:'Neon Nights Club',kind:'Nightclub',r:'4.3',n:'530',items:['Disposable vapes','Nicotine pouches'],age:1},
      {gx:7,gy:2,t:'mix',name:'Harbor Hotel',kind:'Hotel',r:'4.6',n:'1,204',items:['Chargers','Power banks','Travel essentials']},
      {gx:11,gy:8,t:'cards',name:'Iron Mile Gym',kind:'Gym',r:'4.5',n:'233',items:['Pokémon packs','Power banks']}
    ];
    const QUERIES=[{q:'pokémon cards near me',t:['cards','mix'],pref:'cards'},{q:'vape shop open now',t:['vapes'],pref:'vapes'},{q:'phone charger near me',t:['mix'],pref:'mix'}];
    let W=0,H=0,base=null,sel=null,routeStart=0,active=QUERIES[0];
    const X=g=>g/GX*W, Y=g=>g/GY*H;
    function rnd(seed){ return ()=>{ seed=(seed*16807)%2147483647; return (seed-1)/2147483646; }; }
    function paintBase(){
      const dpr=Math.min(devicePixelRatio||1,2); W=box.clientWidth; H=box.clientHeight;
      if(!W||!H){ base=null; return; }
      mc.width=Math.round(W*dpr); mc.height=Math.round(H*dpr);
      base=document.createElement('canvas'); base.width=mc.width; base.height=mc.height;
      const c=base.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0);
      c.fillStyle='#070d27'; c.fillRect(0,0,W,H);
      const r=rnd(7), sw=Math.max(6,W/70);
      // blocks + buildings
      for(let i=0;i<GX;i++) for(let j=0;j<GY;j++){
        const x0=X(i)+sw/2, y0=Y(j)+sw/2, x1=X(i+1)-sw/2, y1=Y(j+1)-sw/2;
        c.fillStyle='#0b1435'; c.fillRect(x0,y0,x1-x0,y1-y0);
        const n=2+Math.floor(r()*3);
        for(let k=0;k<n;k++){
          const bw=(x1-x0)*(.25+r()*.35), bh=(y1-y0)*(.25+r()*.35);
          const bx=x0+2+r()*(x1-x0-bw-4), by=y0+2+r()*(y1-y0-bh-4);
          c.fillStyle=r()<.5?'#111d48':'#0f1a41'; c.fillRect(bx,by,bw,bh);
        }
      }
      // parks
      c.fillStyle='#0b2a33';
      [[4,3,6,5],[10,5,12,6]].forEach(([a,b,cc,d])=>{ c.fillRect(X(a)+sw/2,Y(b)+sw/2,X(cc)-X(a)-sw,Y(d)-Y(b)-sw); });
      c.fillStyle='#0f3a3f';
      for(let k=0;k<26;k++){ c.beginPath(); c.arc(X(4)+sw+r()*(X(6)-X(4)-2*sw),Y(3)+sw+r()*(Y(5)-Y(3)-2*sw),1.5+r()*2.5,0,7); c.fill(); }
      // minor streets
      c.strokeStyle='#18255e'; c.lineWidth=sw*.55;
      for(let i=1;i<GX;i++){ c.beginPath(); c.moveTo(X(i),0); c.lineTo(X(i),H); c.stroke(); }
      for(let j=1;j<GY;j++){ c.beginPath(); c.moveTo(0,Y(j)); c.lineTo(W,Y(j)); c.stroke(); }
      // water: lake + river
      c.fillStyle='#0a2458';
      c.beginPath(); c.ellipse(X(1.1),Y(1.3),X(1.5),Y(1.55),.3,0,7); c.fill();
      c.beginPath(); c.moveTo(0,Y(9.15)); c.bezierCurveTo(X(3),Y(8.7),X(6),Y(9.8),X(12.5),Y(9.2)); c.lineTo(W,H); c.lineTo(0,H); c.closePath(); c.fill();
      c.strokeStyle='rgba(111,155,255,.12)'; c.lineWidth=1;
      for(let k=0;k<3;k++){ c.beginPath(); c.ellipse(X(1.1),Y(1.3),X(1.5)-6-k*7,Y(1.55)-6-k*7,.3,0,7); c.stroke(); }
      // major streets (bridges over water)
      c.lineCap='round';
      MAJ_X.forEach(i=>{ c.strokeStyle='#0a1233'; c.lineWidth=sw*1.35; c.beginPath(); c.moveTo(X(i),0); c.lineTo(X(i),H); c.stroke(); c.strokeStyle='#26398c'; c.lineWidth=sw; c.stroke(); });
      MAJ_Y.forEach(j=>{ c.strokeStyle='#0a1233'; c.lineWidth=sw*1.35; c.beginPath(); c.moveTo(0,Y(j)); c.lineTo(W,Y(j)); c.stroke(); c.strokeStyle='#26398c'; c.lineWidth=sw; c.stroke(); });
      // expressway
      const hw=()=>{ c.beginPath(); c.moveTo(W+20,Y(.6)); c.bezierCurveTo(X(9),Y(2.2),X(8.2),Y(4.5),X(5),Y(7)); c.bezierCurveTo(X(3.4),Y(8.2),X(2),Y(9),X(-.5),Y(10.6)); };
      c.strokeStyle='#0a1233'; c.lineWidth=sw*2.3; hw(); c.stroke();
      c.strokeStyle='#2c4bb3'; c.lineWidth=sw*1.7; hw(); c.stroke();
      c.strokeStyle='rgba(242,245,255,.35)'; c.lineWidth=1; c.setLineDash([6,8]); hw(); c.stroke(); c.setLineDash([]);
      // labels
      c.font='600 '+Math.max(10,W/48)+'px "Barlow Condensed","Arial Narrow",sans-serif'; c.textBaseline='middle';
      const lab=(txt,x,y,rot)=>{ c.save(); c.translate(x,y); if(rot) c.rotate(rot); c.lineWidth=3; c.strokeStyle='#070d27'; c.strokeText(txt,0,0); c.fillStyle='#7f8bb3'; c.fillText(txt,0,0); c.restore(); };
      c.textAlign='left';
      lab('MAIN ST',X(.4),Y(3)); lab('CENTRAL AVE',X(9.3),Y(6)); lab('MARKET ST',X(6.3),Y(8));
      lab('PARK BLVD',X(3),Y(.6),Math.PI/2); lab('5TH ST',X(9),Y(2.4),Math.PI/2);
      c.textAlign='center'; c.fillStyle='#3f9a8f'; c.font='italic 600 '+Math.max(10,W/50)+'px "Barlow",Arial,sans-serif'; c.fillText('Lakeview Park',X(5),Y(4));
      c.fillStyle='#4f79d8'; c.fillText('Mirror Lake',X(1.2),Y(1.4));
      // scale bar
      c.textAlign='left'; c.fillStyle='#9aa6cc'; c.font='600 10px "Barlow Condensed",Arial,sans-serif';
      const sbx=W-96, sby=H-44; c.strokeStyle='#9aa6cc'; c.lineWidth=2; c.beginPath(); c.moveTo(sbx,sby); c.lineTo(sbx+X(1),sby); c.stroke();
    }
    function routePts(p){ return [[X(YOU.gx),Y(YOU.gy)],[X(p.gx),Y(YOU.gy)],[X(p.gx),Y(p.gy)]]; }
    function frame(now){
      if(!base || !W){ if(!reduce) requestAnimationFrame(frame); return; }
      mx.setTransform(1,0,0,1,0,0); mx.drawImage(base,0,0);
      const dpr=mc.width/W; mx.setTransform(dpr,0,0,dpr,0,0);
      if(sel){
        const pts=routePts(sel); let total=0; const seg=[];
        for(let i=1;i<pts.length;i++){ const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]); seg.push(d); total+=d; }
        const prog=reduce?1:Math.min(1,(now-routeStart)/900); let left=total*prog;
        mx.lineCap='round'; mx.lineJoin='round';
        [['rgba(86,220,255,.25)',9],['#56dcff',4]].forEach(([col,lw])=>{
          mx.strokeStyle=col; mx.lineWidth=lw; mx.beginPath(); mx.moveTo(pts[0][0],pts[0][1]); let rem=left;
          for(let i=1;i<pts.length && rem>0;i++){ const f=Math.min(1,rem/seg[i-1]); mx.lineTo(pts[i-1][0]+(pts[i][0]-pts[i-1][0])*f,pts[i-1][1]+(pts[i][1]-pts[i-1][1])*f); rem-=seg[i-1]; }
          mx.stroke();
        });
      }
      const yx=X(YOU.gx), yy=Y(YOU.gy), ph=reduce?0:((now/1400)%1);
      mx.fillStyle=`rgba(45,107,255,${.35*(1-ph)})`; mx.beginPath(); mx.arc(yx,yy,8+ph*22,0,7); mx.fill();
      mx.fillStyle='#fff'; mx.beginPath(); mx.arc(yx,yy,9,0,7); mx.fill();
      mx.fillStyle='#2d6bff'; mx.beginPath(); mx.arc(yx,yy,6,0,7); mx.fill();
      if(!reduce) requestAnimationFrame(frame);
    }
    const pinBtns=PINS.map((p,i)=>{
      const b=document.createElement('button'); b.type='button'; b.className='mx-pin';
      b.style.left=(p.gx/GX*100)+'%'; b.style.top=(p.gy/GY*100)+'%'; b.style.setProperty('--c','var(--pin-'+p.t+')');
      b.innerHTML=ICON[p.t]; b.setAttribute('aria-label',p.name+', '+p.kind);
      b.addEventListener('click',()=>{ stopAuto(); select(p,true); });
      pinsEl.appendChild(b); return b;
    });
    function miles(p){ const d=(Math.abs(p.gx-YOU.gx)+Math.abs(p.gy-YOU.gy))*.18; return d; }
    function select(p,userPick){
      sel=p; routeStart=performance.now();
      pinBtns.forEach((b,i)=>{ b.classList.toggle('on',PINS[i]===p); b.classList.toggle('dim',!userPick && !active.t.includes(PINS[i].t)); if(userPick) b.classList.remove('dim'); });
      const d=miles(p), min=Math.max(1,Math.round(d*4));
      card.classList.add('swap');
      setTimeout(()=>{
        card.innerHTML=`<div class="top"><div><p class="mx-name"></p><div class="sub"><span class="stars">★★★★★</span> ${p.r} (${p.n}) · <span class="k"></span></div></div><div class="dist">${d.toFixed(1)} mi · ${min} min</div></div>
          <span class="badge-in"><b>STASH</b> Machine inside · Open 24/7${p.age?' · 21+':''}</span>
          <div class="chips">${p.items.map(()=>'<span></span>').join('')}</div>
          <div class="acts" aria-hidden="true"><span>Directions</span><span>Call</span></div>`;
        card.querySelector('.mx-name').textContent=p.name; card.querySelector('.k').textContent=p.kind;
        card.querySelectorAll('.chips span').forEach((s,i)=>s.textContent=p.items[i]);
        card.classList.remove('swap');
      },reduce?0:220);
      if(reduce) requestAnimationFrame(frame);
    }
    let qi=0, timers=[], auto=true;
    addEventListener('stash:pause',()=>{ if(auto){ auto=false; timers.forEach(clearTimeout); timers=[]; } requestAnimationFrame(frame); });
    function stopAuto(){ auto=false; timers.forEach(clearTimeout); timers=[]; qEl.textContent='STASH near me'; }
    function nearest(q){ return PINS.filter(p=>p.t===q.pref).sort((a,b)=>miles(a)-miles(b))[0]; }
    function runQuery(){
      if(!auto) return;
      active=QUERIES[qi%QUERIES.length]; qi++;
      qEl.textContent=''; let k=0;
      const type=()=>{ if(!auto) return; qEl.textContent=active.q.slice(0,++k); if(k<active.q.length) timers.push(setTimeout(type,55)); else timers.push(setTimeout(()=>{ select(nearest(active),false); timers.push(setTimeout(runQuery,4200)); },350)); };
      type();
    }
    function init(){ paintBase(); if(reduce){ qEl.textContent=QUERIES[0].q; select(nearest(QUERIES[0]),false); frame(0); } }
    init();
    if(!reduce){ requestAnimationFrame(frame); runQuery(); }
    let rt; addEventListener('resize',()=>{ clearTimeout(rt); rt=setTimeout(()=>{ if(box.clientWidth){ paintBase(); if(reduce) frame(0); } },120); });
    // repaint when the About tab becomes visible (canvas has no size while hidden)
    new ResizeObserver(()=>{ if(box.clientWidth && Math.round(box.clientWidth)!==Math.round(W)){ paintBase(); if(reduce) frame(0); } }).observe(box);
  })();

  /* ---------- copy + toast ---------- */
  const toast = document.getElementById('toast');
  function say(msg){toast.textContent=msg; toast.classList.add('show'); clearTimeout(say.t); say.t=setTimeout(()=>toast.classList.remove('show'),1800)}
  function copyText(txt, el){
    const done=()=>say('Copied');
    try{ navigator.clipboard.writeText(txt).then(done, ()=>selectFallback(el)); }catch(e){ selectFallback(el); }
  }
  function selectFallback(el){ if(!el) return; const r=document.createRange(); r.selectNodeContents(el); const s=getSelection(); s.removeAllRanges(); s.addRange(r); say('Selected, press copy'); }
  document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',()=>copyText(b.dataset.copy, b.previousElementSibling.querySelector('a'))));

  /* ---------- form ---------- */
  const form = document.getElementById('hostForm'), err = document.getElementById('formErr'), ready = document.getElementById('ready'), readyText = document.getElementById('readyText'), mail = document.getElementById('mailLink');
  /* Google Sheet endpoint (Apps Script web app URL). Leave empty to use the email fallback only. */
  const SHEET_URL = 'https://script.google.com/macros/s/AKfycbxXMjL8WNMTSB23HwUAIYIGv1TAciJGAym11j9x8leO4l2wN7rBl1Y9pycEO5Nr6s7zaw/exec';
  const sent = document.getElementById('sent'), submitBtn = form.querySelector('button[type="submit"]');
  form.addEventListener('submit', async e=>{
    e.preventDefault();
    const f = new FormData(form), g = k=>(f.get(k)||'').toString().trim();
    if(g('website')) return; // spam trap
    const missing = [];
    if(!g('name')) missing.push('your name');
    if(!g('biz')) missing.push('your business or property');
    if(!g('type')) missing.push('a property type');
    if(!g('city')) missing.push('your city');
    if(!/^\S+@\S+\.\S+$/.test(g('email'))) missing.push('a valid email');
    const phoneOk = g('phone').replace(/\D/g,'').length >= 10;
    if(!phoneOk) missing.push('a phone number with area code');
    if(!g('consent')) missing.push('your agreement to be contacted');
    const bad={name:!g('name'),biz:!g('biz'),type:!g('type'),city:!g('city'),email:!/^\S+@\S+\.\S+$/.test(g('email')),phone:!phoneOk,consent:!g('consent')};
    const ids={name:'f-name',biz:'f-biz',type:'f-type',city:'f-city',email:'f-email',phone:'f-phone',consent:'f-consent'};
    Object.keys(ids).forEach(k=>{ const el=document.getElementById(ids[k]); if(bad[k]) el.setAttribute('aria-invalid','true'); else el.removeAttribute('aria-invalid'); });
    if(missing.length){ err.textContent = 'Please add ' + missing.join(', ') + '.'; err.hidden=false; const first=Object.keys(ids).find(k=>bad[k]); if(first) document.getElementById(ids[first]).focus(); return; }
    err.hidden = true;
    const body = `Machine: ${g('machine')}\nName: ${g('name')}\nBusiness / property: ${g('biz')}\nAddress: ${g('address')||'—'}\nProperty type: ${g('type')}\nCity: ${g('city')||'—'}\nEmail: ${g('email')}\nPhone: ${g('phone')||'—'}\n\n${g('msg')||''}`.trim();
    if(SHEET_URL && SHEET_URL.indexOf('script.google.com')>-1){
      submitBtn.disabled = true; submitBtn.firstChild.textContent = 'Sending… ';
      try{
        const data = new URLSearchParams({machine:g('machine'),name:g('name'),business:g('biz'),address:g('address'),type:g('type'),city:g('city'),email:g('email'),phone:g('phone'),message:g('msg'),page:(location.hostname||'site')+' | consent v1 '+new Date().toISOString().slice(0,10)});
        await fetch(SHEET_URL,{method:'POST',mode:'no-cors',body:data});
        form.querySelectorAll('input:not([type=radio]):not([type=checkbox]),textarea').forEach(i=>i.value=''); document.getElementById('f-consent').checked=false;
        ready.hidden = true; sent.hidden = false;
        sent.scrollIntoView({behavior: reduce?'auto':'smooth', block:'nearest'});
        return;
      }catch(_){ /* fall through to email */ }
      finally{ submitBtn.disabled = false; submitBtn.firstChild.textContent = 'Request a machine '; }
    }
    readyText.textContent = body;
    mail.href = 'mailto:stashretailgroup@gmail.com?subject=' + encodeURIComponent('Host a STASH: ' + g('biz')) + '&body=' + encodeURIComponent(body);
    sent.hidden = true; ready.hidden = false;
    ready.scrollIntoView({behavior: reduce?'auto':'smooth', block:'nearest'});
  });
  document.getElementById('copyReq').addEventListener('click', ()=>copyText('To: stashretailgroup@gmail.com\n\n' + readyText.textContent, readyText));
})();
