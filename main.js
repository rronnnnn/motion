/* ============================================================
   MOTION — shared behaviors (nav, menu, scroll, GSAP, widgets)
   Requires GSAP + ScrollTrigger from CDN (loaded before this file).
   threads.js is loaded only on pages that render a .threads canvas.
   ============================================================ */
(function () {
  'use strict';

  var hasGSAP = typeof window.gsap !== 'undefined';
  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  var motionOK = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;

  /* ---------------- Threads init ---------------- */
  function initThreads() {
    if (typeof window.Threads === 'undefined') return;
    var nodes = document.querySelectorAll('.threads');
    window.__threads = [];
    nodes.forEach(function (el) {
      var color = el.getAttribute('data-color');
      var parsed = color ? color.split(',').map(Number) : [0.788, 0.663, 0.431];
      var t = new window.Threads(el, {
        color: parsed,
        amplitude: parseFloat(el.getAttribute('data-amplitude')) || 1,
        distance: parseFloat(el.getAttribute('data-distance')) || 0,
        enableMouseInteraction: el.getAttribute('data-mouse') === 'true'
      });
      window.__threads.push(t);
    });
  }

  /* ---------------- Nav scroll state ---------------- */
  function initNav() {
    var nav = document.getElementById('nav');
    if (!nav) return;
    var onScroll = function () {
      if (window.scrollY > 24) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------------- Mobile menu ---------------- */
  function initMenu() {
    var burger = document.getElementById('burger');
    var menu = document.getElementById('mobileMenu');
    if (!burger || !menu) return;
    var toggle = function (open) {
      menu.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', function () {
      toggle(!menu.classList.contains('open'));
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { toggle(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) toggle(false);
    });
  }

  /* ---------------- Hero headline reveal ---------------- */
  function initHeroReveal() {
    var words = document.querySelectorAll('.hero-title .word');
    if (!words.length) return;
    if (!hasGSAP || !motionOK) { return; }
    gsap.set(words, { yPercent: 120 });
    gsap.to(words, {
      yPercent: 0, ease: 'expo.out', duration: 1.1, stagger: 0.08, delay: 0.2
    });
    var sub = document.querySelector('[data-hero-fade]');
    if (sub) {
      gsap.from(sub, { opacity: 0, y: 18, duration: 0.7, ease: 'power2.out', delay: 0.7 });
    }
    var ctas = document.querySelector('.hero__ctas');
    if (ctas) {
      gsap.from(ctas, { opacity: 0, y: 18, duration: 0.7, ease: 'power2.out', delay: 0.9 });
    }
  }

  /* ---------------- Section reveals ---------------- */
  function initReveals() {
    if (!hasGSAP || !window.ScrollTrigger || !motionOK) return;
    gsap.utils.toArray('.reveal').forEach(function (el) {
      gsap.from(el, {
        y: 20, opacity: 0, duration: 0.7, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%' }
      });
    });
    gsap.utils.toArray('[data-reveal-group]').forEach(function (group) {
      var kids = group.children;
      gsap.from(kids, {
        y: 20, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08,
        scrollTrigger: { trigger: group, start: 'top 85%' }
      });
    });
  }

  /* ---------------- Stats count-up ---------------- */
  function formatNum(v, decimals) {
    var n = decimals ? v.toFixed(decimals) : Math.round(v).toString();
    var parts = n.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }
  function initCountUp() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    els.forEach(function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var prefix = el.getAttribute('data-prefix') || '';
      var suffix = el.getAttribute('data-suffix') || '';
      var setVal = function (v) { el.textContent = prefix + formatNum(v, decimals) + suffix; };
      if (!hasGSAP || !window.ScrollTrigger || !motionOK) { setVal(target); return; }
      var obj = { v: 0 };
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: function () {
          gsap.to(obj, {
            v: target, duration: 1.4, ease: 'power2.out',
            onUpdate: function () { setVal(obj.v); },
            onComplete: function () { setVal(target); }
          });
        }
      });
    });
  }

  /* ---------------- Footer wordmark horizontal scrub ---------------- */
  function initFooterWordmark() {
    var fw = document.getElementById('footerWordmark');
    if (!fw || !hasGSAP || !window.ScrollTrigger || !motionOK) return;
    var compute = function () {
      var overflow = Math.max(0, fw.scrollWidth - window.innerWidth);
      if (overflow <= 0) return;
      gsap.fromTo(fw, { x: 0 }, {
        x: -overflow, ease: 'none',
        scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: 0.5 }
      });
    };
    compute();
  }

  /* ---------------- Workout filters + save buttons ---------------- */
  function initFilters() {
    var filters = document.querySelectorAll('.filter');
    var cards = document.querySelectorAll('[data-category]');
    if (filters.length) {
      filters.forEach(function (f) {
        f.addEventListener('click', function () {
          filters.forEach(function (x) { x.classList.remove('active'); });
          f.classList.add('active');
          var cat = f.getAttribute('data-filter');
          cards.forEach(function (c) {
            var show = cat === 'all' || c.getAttribute('data-category') === cat;
            c.style.display = show ? '' : 'none';
          });
        });
      });
    }
    document.querySelectorAll('.lcard__save').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var on = btn.classList.toggle('saved');
        btn.textContent = on ? '✓' : '+';
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
    var loadBtn = document.getElementById('loadMore');
    if (loadBtn) {
      loadBtn.addEventListener('click', function () {
        loadBtn.textContent = "You've reached the end of the library";
        loadBtn.disabled = true;
        loadBtn.style.opacity = '0.55';
        loadBtn.style.cursor = 'default';
      });
    }
  }

  /* ---------------- Pricing toggle ---------------- */
  function initPricingToggle() {
    var monthly = document.getElementById('billMonthly');
    var annual = document.getElementById('billAnnual');
    if (!monthly || !annual) return;
    monthly.addEventListener('click', function () { document.body.classList.remove('annual'); });
    annual.addEventListener('click', function () { document.body.classList.add('annual'); });
  }

  /* ---------------- FAQ accordion ---------------- */
  function initFAQ() {
    var faqs = document.querySelectorAll('.faq');
    faqs.forEach(function (faq) {
      var q = faq.querySelector('.faq__q');
      var a = faq.querySelector('.faq__a');
      if (!q || !a) return;
      q.addEventListener('click', function () {
        var open = faq.classList.toggle('open');
        q.setAttribute('aria-expanded', open ? 'true' : 'false');
        a.style.maxHeight = open ? a.scrollHeight + 'px' : '0px';
      });
    });
  }

  /* ---------------- Boot ---------------- */
  function boot() {
    initThreads();
    initNav();
    initMenu();
    initHeroReveal();
    initReveals();
    initCountUp();
    initFooterWordmark();
    initFilters();
    initPricingToggle();
    initFAQ();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
