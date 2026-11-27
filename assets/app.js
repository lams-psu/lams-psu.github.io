(function () {
  var PORTAL_URL = 'https://lams-psu.github.io/';
  var root = document.documentElement;
  var portalFrame = document.getElementById('portalFrame');
  var ambientStage = document.getElementById('ambientStage');
  var ambientParallax = document.getElementById('ambientParallax');
  var cards = document.querySelectorAll('.service-card');

  var reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var finePointerQuery = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;
  var enterTimer = null;
  var kineticResetters = [];

  function registerBeamProperty() {
    if (!window.CSS || typeof window.CSS.registerProperty !== 'function') {
      root.classList.remove('has-conic-beam');
      return;
    }
    try {
      window.CSS.registerProperty({
        name: '--beam-angle',
        syntax: '<angle>',
        inherits: false,
        initialValue: '0deg'
      });
      root.classList.add('has-conic-beam');
    } catch (err) {
      if (err && err.name === 'InvalidModificationError') {
        root.classList.add('has-conic-beam');
      } else {
        root.classList.remove('has-conic-beam');
      }
    }
  }

  function isMotionEnabled() {
    return !(reduceQuery && reduceQuery.matches);
  }

  function resetAllKinetics() {
    kineticResetters.forEach(function (resetFn) {
      resetFn();
    });
  }

  function playEntrance() {
    if (!portalFrame) return;
    if (enterTimer) window.clearTimeout(enterTimer);
    portalFrame.classList.remove('is-entering');
    if (!isMotionEnabled()) return;
    void portalFrame.offsetWidth;
    portalFrame.classList.add('is-entering');
    enterTimer = window.setTimeout(function () {
      portalFrame.classList.remove('is-entering');
    }, 1080);
  }

  function spawnCardRipple(card, rippleLayer, e) {
    if (!isMotionEnabled() || !rippleLayer) return;
    if (typeof e.button === 'number' && e.button !== 0) return;

    var rect = card.getBoundingClientRect();
    var x = e.clientX ? e.clientX - rect.left : rect.width / 2;
    var y = e.clientY ? e.clientY - rect.top : rect.height / 2;
    var ripple = document.createElement('span');
    ripple.className = 'card-ripple';
    ripple.style.left = Math.round(x) + 'px';
    ripple.style.top = Math.round(y) + 'px';
    rippleLayer.appendChild(ripple);

    var cleaned = false;
    function removeRipple() {
      if (cleaned) return;
      cleaned = true;
      if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
    }
    ripple.addEventListener('animationend', removeRipple);
    window.setTimeout(removeRipple, 650);
  }

  function initAmbientParallax() {
    if (!portalFrame || !ambientParallax) return;
    var state = { tx: 0, ty: 0, cx: 0, cy: 0, rafId: 0, lastTime: 0 };

    function reset() {
      if (state.rafId) window.cancelAnimationFrame(state.rafId);
      state.rafId = 0;
      state.tx = 0;
      state.ty = 0;
      state.cx = 0;
      state.cy = 0;
      state.lastTime = 0;
      ambientParallax.style.transform = '';
      ambientParallax.style.willChange = 'auto';
    }

    function step(now) {
      state.rafId = 0;
      if (document.hidden || !isMotionEnabled()) {
        reset();
        return;
      }
      var dt = state.lastTime ? Math.min(48, now - state.lastTime) : 16;
      state.lastTime = now;
      var alpha = 1 - Math.exp(-dt / 95);
      state.cx += (state.tx - state.cx) * alpha;
      state.cy += (state.ty - state.cy) * alpha;

      var dist = Math.abs(state.tx - state.cx) + Math.abs(state.ty - state.cy);
      if (dist < 0.05 && state.tx === 0 && state.ty === 0) {
        reset();
        return;
      }
      ambientParallax.style.willChange = 'transform';
      ambientParallax.style.transform = 'translate3d(' + state.cx.toFixed(2) + 'px, ' + state.cy.toFixed(2) + 'px, 0)';
      if (dist >= 0.05) {
        state.rafId = window.requestAnimationFrame(step);
      }
    }

    function start() {
      if (!state.rafId) {
        state.lastTime = 0;
        state.rafId = window.requestAnimationFrame(step);
      }
    }

    function clear() {
      state.tx = 0;
      state.ty = 0;
      start();
    }

    kineticResetters.push(reset);
    portalFrame.addEventListener('pointermove', function (e) {
      if (!isMotionEnabled() || (finePointerQuery && !finePointerQuery.matches)) return;
      var rect = portalFrame.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      var ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      state.tx = Math.max(-12, Math.min(12, nx * 11));
      state.ty = Math.max(-12, Math.min(12, ny * 11));
      start();
    });
    portalFrame.addEventListener('pointerleave', clear);
    portalFrame.addEventListener('pointercancel', clear);
  }

  function computeCtaTargets(rect, e, localX, localY, ctaPill) {
    if (!ctaPill) return { x: 0, y: 0 };
    var insideDeadZone =
      localX >= 12 &&
      localY >= 12 &&
      rect.width - localX >= 12 &&
      rect.height - localY >= 12;
    if (!insideDeadZone) return { x: 0, y: 0 };
    var ctaRect = ctaPill.getBoundingClientRect();
    var dx = e.clientX - (ctaRect.left + ctaRect.width / 2);
    var dy = e.clientY - (ctaRect.top + ctaRect.height / 2);
    return {
      x: Math.max(-5, Math.min(5, dx * 0.085)),
      y: Math.max(-5, Math.min(5, dy * 0.085))
    };
  }

  function initCardKinetics(card) {
    var ctaPill = card.querySelector('.cta-pill');
    var rippleLayer = card.querySelector('.card-ripple-layer');
    var state = {
      tRx: 0, tRy: 0, tLift: 0, tScale: 1, tMagX: 0, tMagY: 0,
      cRx: 0, cRy: 0, cLift: 0, cScale: 1, cMagX: 0, cMagY: 0,
      mx: 130, my: 130, hovering: false, pressed: false, rafId: 0, lastTime: 0
    };

    function reset() {
      if (state.rafId) window.cancelAnimationFrame(state.rafId);
      state.rafId = 0;
      state.lastTime = 0;
      state.hovering = false;
      state.pressed = false;
      state.tRx = 0;
      state.tRy = 0;
      state.tLift = 0;
      state.tScale = 1;
      state.tMagX = 0;
      state.tMagY = 0;
      state.cRx = 0;
      state.cRy = 0;
      state.cLift = 0;
      state.cScale = 1;
      state.cMagX = 0;
      state.cMagY = 0;
      card.style.transform = '';
      card.style.willChange = 'auto';
      card.classList.remove('is-kinetic');
      if (ctaPill) {
        ctaPill.style.transform = '';
        ctaPill.style.willChange = 'auto';
        ctaPill.classList.remove('is-kinetic');
      }
    }

    function step(now) {
      state.rafId = 0;
      if (document.hidden || !isMotionEnabled()) {
        reset();
        return;
      }
      var dt = state.lastTime ? Math.min(48, now - state.lastTime) : 16;
      state.lastTime = now;
      var alpha = 1 - Math.exp(-dt / 90);

      state.cRx += (state.tRx - state.cRx) * alpha;
      state.cRy += (state.tRy - state.cRy) * alpha;
      state.cLift += (state.tLift - state.cLift) * alpha;
      state.cScale += (state.tScale - state.cScale) * alpha;
      state.cMagX += (state.tMagX - state.cMagX) * alpha;
      state.cMagY += (state.tMagY - state.cMagY) * alpha;

      card.style.setProperty('--mx', state.mx + 'px');
      card.style.setProperty('--my', state.my + 'px');

      var remaining =
        Math.abs(state.tRx - state.cRx) +
        Math.abs(state.tRy - state.cRy) +
        Math.abs(state.tLift - state.cLift) +
        Math.abs(state.tMagX - state.cMagX) +
        Math.abs(state.tMagY - state.cMagY) +
        Math.abs(state.tScale - state.cScale) * 100;

      var settledAtRest =
        !state.hovering && !state.pressed && state.tRx === 0 && state.tRy === 0 &&
        state.tLift === 0 && Math.abs(state.cRx) < 0.05 && Math.abs(state.cRy) < 0.05 &&
        Math.abs(state.cLift) < 0.05 && Math.abs(state.cMagX) < 0.05 &&
        Math.abs(state.cMagY) < 0.05 && Math.abs(1 - state.cScale) < 0.002;

      if (settledAtRest) {
        reset();
        return;
      }

      card.classList.add('is-kinetic');
      card.style.willChange = 'transform';
      card.style.transform =
        'perspective(1100px) translate3d(0, ' + state.cLift.toFixed(2) + 'px, 0) rotateX(' +
        state.cRx.toFixed(2) + 'deg) rotateY(' + state.cRy.toFixed(2) + 'deg) scale(' +
        state.cScale.toFixed(4) + ')';

      if (ctaPill) {
        ctaPill.classList.add('is-kinetic');
        ctaPill.style.willChange = 'transform';
        ctaPill.style.transform = 'translate3d(' + state.cMagX.toFixed(2) + 'px, ' + state.cMagY.toFixed(2) + 'px, 0)';
      }

      if (remaining >= 0.05) {
        state.rafId = window.requestAnimationFrame(step);
      }
    }

    function ensureRaf() {
      if (!state.rafId) {
        state.lastTime = 0;
        state.rafId = window.requestAnimationFrame(step);
      }
    }

    function releasePointer() {
      state.hovering = false;
      state.pressed = false;
      state.tRx = 0;
      state.tRy = 0;
      state.tLift = 0;
      state.tScale = 1;
      state.tMagX = 0;
      state.tMagY = 0;
      ensureRaf();
    }

    function releasePress() {
      if (!state.pressed) return;
      state.pressed = false;
      state.tScale = 1;
      ensureRaf();
    }

    kineticResetters.push(reset);
    card.addEventListener('pointermove', function (e) {
      if (!isMotionEnabled() || (finePointerQuery && !finePointerQuery.matches)) return;
      var rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      state.hovering = true;
      state.mx = Math.round(e.clientX - rect.left);
      state.my = Math.round(e.clientY - rect.top);
      var nx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width - 0.5) * 2));
      var ny = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height - 0.5) * 2));
      state.tRx = -ny * 3.5;
      state.tRy = nx * 3.5;
      state.tLift = -6;

      var mag = computeCtaTargets(rect, e, state.mx, state.my, ctaPill);
      state.tMagX = mag.x;
      state.tMagY = mag.y;
      ensureRaf();
    });
    card.addEventListener('pointerleave', releasePointer);
    card.addEventListener('pointercancel', releasePointer);
    card.addEventListener('pointerdown', function (e) {
      if (!isMotionEnabled()) return;
      if (typeof e.button === 'number' && e.button !== 0) return;
      spawnCardRipple(card, rippleLayer, e);
      if (finePointerQuery && finePointerQuery.matches) {
        state.pressed = true;
        state.tScale = 0.978;
        ensureRaf();
        window.addEventListener('pointerup', releasePress, { once: true });
        window.addEventListener('pointercancel', releasePress, { once: true });
      }
    });
  }

  function initWebviewCopy() {
    var webviewBanner = document.getElementById('webviewBanner');
    var copyBtn = document.getElementById('copyLinkBtn');
    var copyBtnText = document.getElementById('copyBtnText');
    var copyIconCopy = document.getElementById('copyIconCopy');
    var copyIconCheck = document.getElementById('copyIconCheck');
    var copyLiveStatus = document.getElementById('copyLiveStatus');
    var copyTimer = null;

    var isInAppUA = /Line|FBAN|FBAV|FB_IAB|Messenger|Instagram/i.test(navigator.userAgent || '');
    if (isInAppUA && webviewBanner) {
      webviewBanner.removeAttribute('hidden');
    }
    if (!copyBtn) return;

    function resetCopyUi() {
      copyBtn.classList.remove('is-copied');
      copyBtnText.textContent = 'คัดลอกลิงก์';
      copyIconCopy.removeAttribute('hidden');
      copyIconCheck.setAttribute('hidden', '');
    }

    function showCopiedFeedback() {
      if (copyTimer) window.clearTimeout(copyTimer);
      copyBtn.classList.add('is-copied');
      copyBtnText.textContent = 'คัดลอกลิงก์แล้ว';
      copyIconCopy.setAttribute('hidden', '');
      copyIconCheck.removeAttribute('hidden');
      copyLiveStatus.textContent = 'คัดลอกลิงก์ ' + PORTAL_URL + ' แล้ว นำไปวางในเบราว์เซอร์ได้เลย';
      copyTimer = window.setTimeout(resetCopyUi, 2400);
    }

    function showCopyFailedFeedback() {
      if (copyTimer) window.clearTimeout(copyTimer);
      resetCopyUi();
      copyBtnText.textContent = 'คัดลอกไม่สำเร็จ';
      copyLiveStatus.textContent = 'คัดลอกอัตโนมัติไม่สำเร็จ กรุณาคัดลอกลิงก์ ' + PORTAL_URL + ' จากแถบที่อยู่';
      copyTimer = window.setTimeout(resetCopyUi, 2600);
    }

    function fallbackCopy(text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var copied = false;
      try {
        copied = document.execCommand('copy') === true;
      } catch (err) {
        copied = false;
      }
      document.body.removeChild(ta);
      if (copied) {
        showCopiedFeedback();
      } else {
        showCopyFailedFeedback();
      }
    }

    copyBtn.addEventListener('click', function () {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(PORTAL_URL).then(showCopiedFeedback, function () {
          fallbackCopy(PORTAL_URL);
        });
      } else {
        fallbackCopy(PORTAL_URL);
      }
    });
  }

  function initLifecycleListeners() {
    document.addEventListener('visibilitychange', function () {
      if (ambientStage) ambientStage.classList.toggle('is-paused', document.hidden);
      if (document.hidden) {
        resetAllKinetics();
      }
    });
    window.addEventListener('blur', resetAllKinetics);
    if (reduceQuery && typeof reduceQuery.addEventListener === 'function') {
      reduceQuery.addEventListener('change', function () {
        if (!isMotionEnabled()) {
          resetAllKinetics();
          if (portalFrame) portalFrame.classList.remove('is-entering');
        }
      });
    }
  }

  registerBeamProperty();
  initAmbientParallax();
  cards.forEach(initCardKinetics);
  initWebviewCopy();
  initLifecycleListeners();
  playEntrance();
})();
