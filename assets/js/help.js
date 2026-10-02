/* STASH help page: machine number from the QR link, expanding panels, form delivery */
(function(){
  'use strict';
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbxXMjL8WNMTSB23HwUAIYIGv1TAciJGAym11j9x8leO4l2wN7rBl1Y9pycEO5Nr6s7zaw/exec';
  var EMAIL = 'stashretailgroup@gmail.com';
  var $ = function(id){ return document.getElementById(id); };

  /* ---- machine number from ?m=001 ---- */
  var machine = '';
  try{
    var raw = new URLSearchParams(location.search).get('m') || '';
    machine = raw.replace(/[^A-Za-z0-9-]/g,'').slice(0,12).toUpperCase();
  }catch(_){}
  if(machine){
    $('machineNo').textContent = machine;
    $('machineLine').hidden = false;
    /* the number is already known, so don't ask for it again */
    $('r-machine').value = machine; $('r-machine-wrap').hidden = true;
    $('s-machine').value = machine; $('s-machine-wrap').hidden = true;
  }
  function mailHref(subject, body){
    return 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + (body ? '&body=' + encodeURIComponent(body) : '');
  }
  $('mailLink').href = mailHref(machine ? 'STASH machine ' + machine : 'STASH support');

  /* ---- expanding panels ---- */
  function wire(btnId, panelId){
    var btn = $(btnId), panel = $(panelId);
    btn.addEventListener('click', function(){
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      panel.hidden = open;
      if(!open){
        var fields = panel.querySelectorAll('form:not([hidden]) input:not(.hp), form:not([hidden]) select, form:not([hidden]) textarea');
        var target = null;
        for(var i=0;i<fields.length;i++){ if(!fields[i].value && fields[i].offsetParent !== null){ target = fields[i]; break; } }
        if(target){ try{ target.focus({preventScroll:true}); }catch(_){ target.focus(); } }
        btn.scrollIntoView({block:'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
      }
    });
  }
  wire('problemBtn','problemPanel');
  wire('suggestBtn','suggestPanel');

  /* ---- date and time defaults to now ---- */
  var when = $('r-when');
  function localStamp(d){
    var p = function(n){ return String(n).padStart(2,'0'); };
    return d.getFullYear() + '-' + p(d.getMonth()+1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  var now = new Date();
  when.value = localStamp(now);
  when.max = localStamp(new Date(now.getTime() + 60000));

  /* ---- "Something else" asks for a short description ---- */
  var issue = $('r-issue'), detailsWrap = $('r-details-wrap'), details = $('r-details');
  function needsDetails(){ return issue.value === 'Something else'; }
  issue.addEventListener('change', function(){
    detailsWrap.hidden = !needsDetails();
    if(needsDetails()){ details.setAttribute('aria-required','true'); details.focus(); }
    else { details.removeAttribute('aria-required'); details.removeAttribute('aria-invalid'); }
  });

  /* ---- helpers ---- */
  var isEmail = function(v){ return /^\S+@\S+\.\S+$/.test(v); };
  var isPhone = function(v){ return v.replace(/\D/g,'').length >= 10 && !/[A-Za-z@]/.test(v); };
  function niceWhen(v){
    var d = new Date(v);
    if(isNaN(d)) return v;
    var tz = '';
    try{ tz = ' ' + (Intl.DateTimeFormat().resolvedOptions().timeZone || ''); }catch(_){}
    return d.toLocaleString('en-US', {year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}) + tz;
  }
  function mark(id, bad){ var el = $(id); if(bad) el.setAttribute('aria-invalid','true'); else el.removeAttribute('aria-invalid'); }
  function send(data){
    return fetch(ENDPOINT, {method:'POST', mode:'no-cors', body:new URLSearchParams(data)});
  }
  function finish(form, box){
    form.hidden = true; box.hidden = false;
    try{ box.focus({preventScroll:true}); }catch(_){ box.focus(); }
    box.scrollIntoView({block:'nearest'});
  }
  var source = (location.hostname || 'site') + ' | help' + (machine ? ' | m=' + machine : '');

  /* ---- problem form ---- */
  var pForm = $('problemForm'), pErr = $('problemErr');
  pForm.addEventListener('submit', function(e){
    e.preventDefault();
    var f = new FormData(pForm), g = function(k){ return (f.get(k) || '').toString().trim(); };
    if(g('website')) return; // spam trap
    var contact = g('contact'), other = needsDetails();
    var bad = {
      'r-machine': !g('machine'),
      'r-issue': !g('issue'),
      'r-details': other && !g('details'),
      'r-item': !g('item'),
      'r-when': !g('when') || isNaN(new Date(g('when')).getTime()),
      'r-contact': !(isEmail(contact) || isPhone(contact))
    };
    var words = {'r-machine':'the machine number','r-issue':'what happened','r-details':'a short description','r-item':'the item','r-when':'the date and time','r-contact':'an email or phone number we can reach you at'};
    var missing = [];
    Object.keys(bad).forEach(function(id){ mark(id, bad[id]); if(bad[id]) missing.push(words[id]); });
    if(missing.length){
      pErr.textContent = 'Please add ' + missing.join(', ') + '.';
      pErr.hidden = false;
      $(Object.keys(bad).filter(function(id){ return bad[id]; })[0]).focus();
      return;
    }
    pErr.hidden = true;
    var whenText = niceWhen(g('when')), detailText = other ? g('details') : '';
    var summary = [
      'STASH support request',
      'Machine: ' + g('machine'),
      'What happened: ' + g('issue'),
      'Item: ' + g('item'),
      'When: ' + whenText,
      'Contact: ' + contact,
      detailText ? '\n' + detailText : ''
    ].join('\n').trim();
    var btn = pForm.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Sending…';
    send({
      form:'support', kind:'Problem', machine:g('machine'), issue:g('issue'), item:g('item'),
      purchased:whenText, amount:'', last4:'', details:detailText, contact:contact, page:source
    }).then(function(){
      finish(pForm, $('problemDone'));
    }).catch(function(){
      $('problemMail').href = mailHref('STASH support: machine ' + g('machine'), summary);
      finish(pForm, $('problemFail'));
    }).then(function(){ btn.disabled = false; btn.textContent = 'Send'; });
  });

  /* ---- suggestion form ---- */
  var sForm = $('suggestForm'), sErr = $('suggestErr');
  sForm.addEventListener('submit', function(e){
    e.preventDefault();
    var f = new FormData(sForm), g = function(k){ return (f.get(k) || '').toString().trim(); };
    if(g('website')) return;
    var contact = g('contact');
    var noIdea = !g('idea'), badContact = !!contact && !(isEmail(contact) || isPhone(contact));
    mark('s-idea', noIdea); mark('s-contact', badContact);
    if(noIdea || badContact){
      sErr.textContent = noIdea ? 'Please tell us what you\'d like us to stock.' : 'Please check the email or phone number, or leave it blank.';
      sErr.hidden = false;
      $(noIdea ? 's-idea' : 's-contact').focus();
      return;
    }
    sErr.hidden = true;
    var summary = 'STASH product suggestion\nMachine: ' + (g('machine') || '-') + '\nContact: ' + (contact || '-') + '\n\n' + g('idea');
    var btn = sForm.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Sending…';
    send({
      form:'suggest', kind:'Product suggestion', machine:g('machine'), details:g('idea'), contact:contact, page:source
    }).then(function(){
      finish(sForm, $('suggestDone'));
    }).catch(function(){
      $('suggestMail').href = mailHref('STASH product suggestion', summary);
      finish(sForm, $('suggestFail'));
    }).then(function(){ btn.disabled = false; btn.textContent = 'Send'; });
  });
})();
