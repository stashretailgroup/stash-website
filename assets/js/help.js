/* STASH help page: machine number from the QR link, expanding panels, form delivery */
(function(){
  'use strict';
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbxXMjL8WNMTSB23HwUAIYIGv1TAciJGAym11j9x8leO4l2wN7rBl1Y9pycEO5Nr6s7zaw/exec';
  var PHONE = '+17864862722', EMAIL = 'stashretailgroup@gmail.com';
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
    $('r-machine').value = machine;
    $('s-machine').value = machine;
  }
  function smsHref(text){ return 'sms:' + PHONE + '?&body=' + encodeURIComponent(text); }
  $('smsLink').href = smsHref(machine ? 'STASH machine ' + machine + ': ' : 'STASH support: ');

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
        for(var i=0;i<fields.length;i++){ if(!fields[i].value){ target = fields[i]; break; } }
        if(target){ try{ target.focus({preventScroll:true}); }catch(_){ target.focus(); } }
        btn.scrollIntoView({block:'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
      }
    });
  }
  wire('refundBtn','refundPanel');
  wire('suggestBtn','suggestPanel');

  /* ---- purchase time: default to now, flag anything older than 7 days ---- */
  var when = $('r-when'), whenNote = $('r-when-note');
  function localStamp(d){
    var p = function(n){ return String(n).padStart(2,'0'); };
    return d.getFullYear() + '-' + p(d.getMonth()+1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  var now = new Date();
  when.value = localStamp(now);
  when.max = localStamp(new Date(now.getTime() + 60000));
  function checkWhen(){
    var t = when.value ? new Date(when.value).getTime() : NaN;
    whenNote.hidden = !(t && (Date.now() - t) > 7*24*60*60*1000);
  }
  when.addEventListener('change', checkWhen);
  when.addEventListener('input', checkWhen);

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

  /* ---- refund / problem form ---- */
  var rForm = $('refundForm'), rErr = $('refundErr');
  rForm.addEventListener('submit', function(e){
    e.preventDefault();
    var f = new FormData(rForm), g = function(k){ return (f.get(k) || '').toString().trim(); };
    if(g('website')) return; // spam trap
    var contact = g('contact');
    var bad = {
      'r-machine': !g('machine'),
      'r-issue': !g('issue'),
      'r-item': !g('item'),
      'r-when': !g('when') || isNaN(new Date(g('when')).getTime()),
      'r-contact': !(isEmail(contact) || isPhone(contact))
    };
    var words = {'r-machine':'the machine number','r-issue':'what happened','r-item':'the item','r-when':'the date and time','r-contact':'an email or phone number we can reach you at'};
    var missing = [];
    Object.keys(bad).forEach(function(id){ mark(id, bad[id]); if(bad[id]) missing.push(words[id]); });
    if(missing.length){
      rErr.textContent = 'Please add ' + missing.join(', ') + '.';
      rErr.hidden = false;
      $(Object.keys(bad).filter(function(id){ return bad[id]; })[0]).focus();
      return;
    }
    rErr.hidden = true;
    var whenText = niceWhen(g('when'));
    var summary = [
      'STASH support request',
      'Machine: ' + g('machine'),
      'What happened: ' + g('issue'),
      'Item: ' + g('item'),
      'Purchased: ' + whenText,
      'Amount: ' + (g('amount') || '-'),
      'Card last 4 / app: ' + (g('last4') || '-'),
      'Contact: ' + contact,
      g('details') ? '\n' + g('details') : ''
    ].join('\n').trim();
    var btn = rForm.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Sending…';
    send({
      form:'support', kind:'Refund / problem', machine:g('machine'), issue:g('issue'), item:g('item'),
      purchased:whenText, amount:g('amount'), last4:g('last4'), details:g('details'), contact:contact, page:source,
      /* also readable by the earlier version of the sheet script */
      name:contact, business:'SUPPORT: machine ' + g('machine'), email:isEmail(contact) ? contact : '', phone:isEmail(contact) ? '' : contact, message:summary
    }).then(function(){
      finish(rForm, $('refundDone'));
    }).catch(function(){
      $('refundMail').href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('STASH support: machine ' + g('machine')) + '&body=' + encodeURIComponent(summary);
      $('refundSms').href = smsHref(summary);
      finish(rForm, $('refundFail'));
    }).then(function(){ btn.disabled = false; btn.textContent = 'Send request'; });
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
      form:'suggest', kind:'Product suggestion', machine:g('machine'), details:g('idea'), contact:contact, page:source,
      name:contact || 'Customer', business:'SUGGESTION: machine ' + (g('machine') || '-'), email:isEmail(contact) ? contact : '', phone:(contact && !isEmail(contact)) ? contact : '', message:summary
    }).then(function(){
      finish(sForm, $('suggestDone'));
    }).catch(function(){
      $('suggestSms').href = smsHref(summary);
      finish(sForm, $('suggestFail'));
    }).then(function(){ btn.disabled = false; btn.textContent = 'Send suggestion'; });
  });
})();
