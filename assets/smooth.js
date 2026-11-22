/* 里屋 · 跟手
   让面板和抽屉能“拉”：按住顶部往下（或往左）拖，跟手指走；松手看拖了多远，够了就关，不够就弹回去。
   不改原有逻辑：关的时候还是去点原来的退回按钮。 */

(function(){
  'use strict';

  function pull(el, handle, closeFn, axis){
    if (!el || !handle) return;

    var start = 0, dist = 0, on = false, t0 = 0;

    function prop(d){ return axis === 'x' ? 'translateX(' + d + 'px)' : 'translateY(' + d + 'px)'; }
    function raw(ev){ return axis === 'x' ? ev.clientX : ev.clientY; }

    handle.addEventListener('pointerdown', function(ev){
      on = true;
      start = raw(ev);
      dist = 0;
      t0 = Date.now();
      el.classList.remove('settling');
      el.classList.add('dragging');
      try{ handle.setPointerCapture(ev.pointerId); }catch(e){}
    });

    handle.addEventListener('pointermove', function(ev){
      if (!on) return;
      var d = raw(ev) - start;
      if (axis === 'x') d = Math.min(0, d);
      else d = Math.max(0, d);
      dist = d;
      el.style.transform = prop(d * 0.9);
    });

    function end(){
      if (!on) return;
      on = false;
      el.classList.remove('dragging');
      el.classList.add('settling');

      var speed = Math.abs(dist) / Math.max(1, Date.now() - t0);
      var far = axis === 'x' ? (-dist > 80 || speed > 0.5) : (dist > 80 || speed > 0.5);

      el.style.transform = '';
      setTimeout(function(){ el.classList.remove('settling'); }, 340);

      if (far && closeFn) closeFn();
      dist = 0;
    }

    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
    handle.addEventListener('pointerleave', function(){ if (on) end(); });
  }

  function boot(){
    var view = document.getElementById('view');
    var drawer = document.getElementById('drawer');

    pull(
      view,
      view ? view.querySelector('.view-top') : null,
      function(){ var b = document.getElementById('viewBack'); if (b) b.click(); },
      'y'
    );

    pull(
      drawer,
      drawer ? drawer.querySelector('.drawer-top') : null,
      function(){ var s = document.getElementById('scrim'); if (s) s.click(); },
      'x'
    );
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
