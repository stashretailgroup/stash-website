/* STASH landing pages: machine-format carousel (scroll-snap track, arrows, dots, gentle auto-advance) */
(function(){
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-mc]').forEach(function(mc){
    var track = mc.querySelector('.mc-track');
    var slides = [].slice.call(track.children);
    var dots = [].slice.call(mc.querySelectorAll('.mc-dot'));
    var cur = 0, timer = null, auto = !reduce && slides.length > 1;
    function go(i, smooth){
      cur = (i + slides.length) % slides.length;
      track.scrollTo({left: slides[cur].offsetLeft - track.offsetLeft, behavior: (smooth && !reduce) ? 'smooth' : 'auto'});
      mark();
    }
    function mark(){ dots.forEach(function(d, j){ if(j === cur) d.setAttribute('aria-current','true'); else d.removeAttribute('aria-current'); }); }
    function stop(){ auto = false; clearInterval(timer); }
    mc.querySelector('[data-mc-prev]').addEventListener('click', function(){ stop(); go(cur - 1, true); });
    mc.querySelector('[data-mc-next]').addEventListener('click', function(){ stop(); go(cur + 1, true); });
    dots.forEach(function(d, j){ d.addEventListener('click', function(){ stop(); go(j, true); }); });
    var t;
    track.addEventListener('scroll', function(){
      clearTimeout(t);
      t = setTimeout(function(){
        var w = track.clientWidth || 1;
        cur = Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / w)));
        mark();
      }, 80);
    }, {passive: true});
    ['pointerdown','touchstart','keydown','wheel','focusin'].forEach(function(ev){ track.addEventListener(ev, stop, {passive: true}); });
    if(auto){
      var hover = false;
      mc.addEventListener('mouseenter', function(){ hover = true; });
      mc.addEventListener('mouseleave', function(){ hover = false; });
      timer = setInterval(function(){ if(auto && !hover && !document.hidden) go(cur + 1, true); }, 4500);
    }
  });
})();
