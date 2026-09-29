/* STASH website behavior: tabs, hero machine, lineup, address suggestions, inquiry form */
(function(){
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hoverable = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- tabs ---------- */
  const panes=[...document.querySelectorAll('.pane')], tabsEls=[...document.querySelectorAll('.tab')];
  function showPane(id, target){
    panes.forEach(p=>p.hidden = p.dataset.pane!==id);
    tabsEls.forEach(t=>t.setAttribute('aria-selected', t.dataset.go===id));
    dispatchEvent(new Event('resize'));
    requestAnimationFrame(()=>{
      if(target && target.closest('.pane')) target.scrollIntoView({behavior: reduce?'auto':'smooth', block:'start'});
      else scrollTo({top:0, behavior:'auto'});
    });
  }
  function route(hash){
    const id=(hash||'').replace('#','');
    if(!id || id==='top'){ showPane('home'); return; }
    if(['home','machines','about'].includes(id)){ showPane(id); return; }
    const el=document.getElementById(id); const p=el && el.closest('.pane');
    if(p) showPane(p.dataset.pane, el);
  }
  document.addEventListener('click', e=>{
    const a=e.target.closest('a[href^="#"]'); if(!a) return;
    const h=a.getAttribute('href'); if(h==='#') return;
    e.preventDefault(); route(h);
    try{ history.replaceState(null,'',h) }catch(_){}
  });
  if(location.hash) route(location.hash);

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
    {n:'STASH Kiosk', s:'Tech & travel essentials', img:'assets/img/machines/kiosk-blue.webp', d:'A compact touchscreen kiosk with a pickup bay. Earbuds, power banks, cables, travel and grooming kits, snacks and hydration.', c:['Touchscreen','Tap to pay','Pickup bay','Hotels · Offices · Gyms']},
    {n:'STASH Kiosk Street', s:'Same kiosk, street wrap', img:'assets/img/machines/kiosk-street.webp', d:'The kiosk in our black graffiti wrap. Made for nightlife, campuses and entertainment spaces that want something louder.', c:['Touchscreen','Tap to pay','Custom wrap','Campuses · Nightlife']},
    {n:'STASH Smart Fridge', s:'Tap, open, grab, close', img:'assets/img/machines/smart-fridge.webp', d:'A single-door smart fridge. Tap your card, open the door, grab what you want and close it. You are charged only for what you take.', c:['Tap card to unlock','Refrigerated','5 shelves','Apartments · Offices']},
    {n:'STASH Smart Market', s:'Double-door grab-and-go', img:'assets/img/machines/smart-market.webp', d:'Two refrigerated doors and one kiosk: a full grab-and-go market for lobbies and break rooms. Drinks, dairy, snacks and fresh items.', c:['Two doors','Refrigerated','Kiosk checkout','Lobbies · Break rooms']}
  ];
  const luList=document.getElementById('luList'), luImgs=document.getElementById('luImgs'), luInfo=document.getElementById('luInfo');
  let luCur=0, luTimer=null, luAuto=!reduce;
  LU.forEach((x,i)=>{
    const im=document.createElement('img'); im.src=x.img; im.alt=x.n+' render'; luImgs.appendChild(im);
    const b=document.createElement('button'); b.type='button'; b.role='tab'; b.className='lu-btn';
    b.innerHTML=`<span class="th"><img src="${x.img}" alt=""></span><span><b>${x.n}</b><small>${x.s}</small></span><span class="bar"></span>`;
    b.addEventListener('click',()=>{luAuto=false; luShow(i)});
    luList.appendChild(b);
  });
  function luShow(i){
    luCur=i;
    [...luImgs.children].forEach((im,j)=>im.classList.toggle('on',j===i));
    [...luList.children].forEach((b,j)=>{b.setAttribute('aria-selected',j===i); const bar=b.querySelector('.bar'); bar.classList.remove('run'); if(j===i&&luAuto){void bar.offsetWidth; bar.classList.add('run')}});
    const x=LU[i];
    luInfo.innerHTML=`<h3>${x.n}</h3><p>${x.d}</p><div class="lu-chips">${x.c.map(c=>`<span>${c}</span>`).join('')}</div>`;
    clearTimeout(luTimer); if(luAuto) luTimer=setTimeout(()=>luShow((luCur+1)%LU.length),6000);
  }
  luShow(0);

  /* ---------- map teaser ---------- */
  const mc = document.getElementById('mapCanvas'), mx = mc.getContext('2d');
  const pins = [[.46,.42],[.58,.36],[.52,.55],[.38,.6],[.66,.52],[.3,.34],[.72,.7],[.5,.72]];
  function drawMap(t){
    const dpr = Math.min(devicePixelRatio||1,2), w = mc.clientWidth, h = mc.clientHeight;
    if (mc.width !== Math.round(w*dpr)){ mc.width = w*dpr; mc.height = h*dpr; }
    mx.setTransform(dpr,0,0,dpr,0,0); mx.clearRect(0,0,w,h);
    mx.strokeStyle='#14225a'; mx.lineWidth=1;
    for(let x=0;x<w;x+=28){mx.beginPath();mx.moveTo(x,0);mx.lineTo(x,h);mx.stroke()}
    for(let y=0;y<h;y+=28){mx.beginPath();mx.moveTo(0,y);mx.lineTo(w,y);mx.stroke()}
    mx.strokeStyle='#1f3380'; mx.lineWidth=4; mx.lineCap='round';
    mx.beginPath(); mx.moveTo(w*.1,h*.2); mx.bezierCurveTo(w*.35,h*.35,w*.55,h*.3,w*.92,h*.62); mx.stroke();
    mx.beginPath(); mx.moveTo(w*.25,h*.95); mx.bezierCurveTo(w*.4,h*.6,w*.5,h*.5,w*.62,h*.08); mx.stroke();
    mx.fillStyle='#0f1d52'; mx.beginPath(); mx.ellipse(w*.2,h*.78,w*.08,h*.06,0,0,7); mx.fill();
    mx.beginPath(); mx.ellipse(w*.82,h*.25,w*.06,h*.08,.4,0,7); mx.fill();
    mx.fillStyle='#9aa6cc'; mx.font='700 12px "Barlow Condensed", Arial Narrow, sans-serif';
    pins.forEach((p,i)=>{
      const x=p[0]*w, y=p[1]*h, ph=((t/1000)+i*.37)%2;
      if(!reduce){ mx.beginPath(); mx.arc(x,y,6+ph*14,0,7); mx.strokeStyle=`rgba(86,220,255,${Math.max(0,.6-ph*.3)})`; mx.lineWidth=2; mx.stroke(); }
      mx.fillStyle='#2d6bff'; mx.beginPath(); mx.arc(x,y-12,9,Math.PI*.85,Math.PI*.15); mx.lineTo(x,y); mx.closePath(); mx.fill();
      mx.fillStyle='#fff'; mx.beginPath(); mx.arc(x,y-12,3.5,0,7); mx.fill();
    });
    if(!reduce) requestAnimationFrame(drawMap);
  }
  requestAnimationFrame(drawMap);
  addEventListener('resize',()=>{ if(reduce) requestAnimationFrame(()=>drawMap(0)); });

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
    if(!/^\S+@\S+\.\S+$/.test(g('email'))) missing.push('a valid email');
    if(missing.length){ err.textContent = 'Please add ' + missing.join(', ') + '.'; err.hidden=false; return; }
    err.hidden = true;
    const body = `Machine: ${g('machine')}\nName: ${g('name')}\nBusiness / property: ${g('biz')}\nAddress: ${g('address')||'—'}\nProperty type: ${g('type')}\nCity: ${g('city')||'—'}\nEmail: ${g('email')}\nPhone: ${g('phone')||'—'}\n\n${g('msg')||''}`.trim();
    if(SHEET_URL && SHEET_URL.indexOf('script.google.com')>-1){
      submitBtn.disabled = true; submitBtn.firstChild.textContent = 'Sending… ';
      try{
        const data = new URLSearchParams({machine:g('machine'),name:g('name'),business:g('biz'),address:g('address'),type:g('type'),city:g('city'),email:g('email'),phone:g('phone'),message:g('msg'),page:location.hostname||'site'});
        await fetch(SHEET_URL,{method:'POST',mode:'no-cors',body:data});
        form.querySelectorAll('input:not([type=radio]),textarea').forEach(i=>i.value='');
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
