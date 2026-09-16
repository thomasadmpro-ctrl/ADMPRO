/* ==========================================================================
   ADMPHONE — partition de mouvement
   Lenis (défilement inertiel) + GSAP/ScrollTrigger.
   Règle de conduite : l'animation sert la lecture de l'image. Sous
   prefers-reduced-motion, tout est rendu dans son état final, sans exception.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined';

  /* Garde-fou : sans GSAP, la page reste entièrement lisible. */
  if (!hasGSAP) {
    document.documentElement.classList.remove('js');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(SplitText);

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------------- Lenis */
  var lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      touchMultiplier: 1.6
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    /* Ancres internes : on confie le déplacement à Lenis */
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -10, duration: 1.4 });
      });
    });
  }

  /* ------------------------------------------------- utilitaires communs */

  /* Découpe en lignes masquées, avec repli si SplitText est absent. */
  function splitLines(el) {
    if (!window.SplitText) {
      el.classList.add('no-split');
      return null;
    }
    return new SplitText(el, {
      type: 'lines',
      linesClass: 'line',
      /* chaque ligne est enveloppée : le masque vient du overflow:hidden */
      autoSplit: false
    });
  }

  function fadeIn(els, opts) {
    opts = opts || {};
    gsap.to(els, {
      opacity: 1,
      y: 0,
      duration: opts.duration || 0.9,
      stagger: opts.stagger || 0.08,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: opts.trigger || els,
        start: opts.start || 'top 88%',
        once: true
      }
    });
  }

  /* ============================================================== RÉDUIT */
  if (reduced) {
    gsap.set('[data-fade], [data-stagger]', { opacity: 1, y: 0 });
    initFolioStatic();
    initCountersStatic();   /* sans animation, les chiffres sont écrits d'emblée */
    initForm();
    initYear();
    initTilesFallback();
    return;
  }

  /* ========================================================== PROGRESSION */
  gsap.to('.progress__bar', {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.25 }
  });

  /* ================================================================= NAV */
  (function nav() {
    var el = $('[data-nav]');
    if (!el) return;
    var last = 0;
    ScrollTrigger.create({
      start: 'top -80',
      end: 99999,
      onUpdate: function (self) {
        var y = self.scroll();
        el.classList.toggle('is-solid', y > window.innerHeight * 0.85);
        /* masquage à la descente, réapparition à la remontée */
        el.classList.toggle('is-hidden', y > last && y > window.innerHeight && self.direction === 1);
        last = y;
      }
    });
  })();

  /* ================================================================ HÉROS */
  (function hero() {
    var section = $('.hero');
    if (!section) return;

    /* Titre : « développement photographique » — l'image monte, se dévoile
       et se stabilise, plutôt qu'un simple fondu. */
    var lines = $$('.hero__title .line > span');
    var tl = gsap.timeline({ delay: 0.15 });
    tl.set(lines, { opacity: 1 })
      .from(lines, {
        yPercent: 118,
        filter: 'blur(14px) brightness(2.2)',
        duration: 1.5,
        stagger: 0.09,
        ease: 'expo.out'
      })
      .to('.hero__copy [data-fade]', {
        opacity: 1, y: 0, duration: 1, stagger: 0.1, ease: 'power2.out'
      }, '-=1.05')
      .to('.hero__foot', { opacity: 1, duration: 1, ease: 'power1.out' }, '-=0.9')
      .to('.folio', { opacity: 1, duration: 0.8 }, '-=0.6');
    gsap.set('.hero__copy [data-fade]', { y: 14 });
    gsap.set('.hero__foot', { opacity: 0 });

    /* Séquence d'images : lente, discrète, jamais tape-à-l'œil. */
    var frames = $$('.hero__frame');
    if (frames.length > 1) {
      var idx = 0;
      setInterval(function () {
        var current = frames[idx];
        idx = (idx + 1) % frames.length;
        var next = frames[idx];
        gsap.to(next, { opacity: 1, duration: 2.4, ease: 'power1.inOut' });
        gsap.fromTo(next.querySelector('img'),
          { scale: 1.08 }, { scale: 1.02, duration: 9, ease: 'none' });
        gsap.to(current, { opacity: 0, duration: 2.4, ease: 'power1.inOut' });
        frames.forEach(function (f) { f.classList.remove('is-on'); });
        next.classList.add('is-on');
      }, 7000);
    }

    /* Parallaxe de sortie : l'image retient, le texte part plus vite. */
    gsap.to('.hero__media img', {
      yPercent: 16, scale: 1.06, ease: 'none',
      scrollTrigger: { trigger: section, start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to('.hero__copy', {
      yPercent: -14, opacity: 0.15, ease: 'none',
      scrollTrigger: { trigger: section, start: 'top top', end: 'bottom top', scrub: true }
    });
  })();

  /* ============================================================ MANIFESTE */
  (function manifesto() {
    var el = $('[data-reveal-words]');
    if (!el) return;

    var words;
    if (window.SplitText) {
      words = new SplitText(el, { type: 'words', wordsClass: 'w' }).words;
    } else {
      words = [el];
    }
    gsap.fromTo(words,
      { opacity: 0.12, filter: 'blur(3px)' },
      {
        opacity: 1, filter: 'blur(0px)',
        ease: 'none', stagger: 0.09,
        scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 55%', scrub: 0.6 }
      });

    fadeIn($$('.manifesto__sig'), { trigger: el });
  })();

  /* ====================================== PRODUITS — section épinglée */
  (function products() {
    var pin = $('[data-pin]');
    if (!pin) return;

    var figures = $$('.chapter', pin);
    var copies  = $$('.pchapter', pin);
    var current = 0;

    function show(i) {
      if (i === current) return;
      var outF = figures[current], inF = figures[i];
      var outC = copies[current],  inC = copies[i];
      current = i;

      gsap.to(outF, { opacity: 0, duration: 0.5, ease: 'power2.inOut' });
      gsap.set(inF, { clipPath: 'inset(100% 0% 0% 0%)', opacity: 1 });
      gsap.to(inF, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.05, ease: 'expo.inOut' });
      gsap.fromTo(inF.querySelector('img'),
        { scale: 1.12 }, { scale: 1, duration: 1.3, ease: 'expo.out' });

      figures.forEach(function (f, n) { f.setAttribute('aria-hidden', n === i ? 'false' : 'true'); });

      gsap.to(outC, { opacity: 0, y: -16, duration: 0.4, ease: 'power2.in' });
      outC.classList.remove('is-on');
      inC.classList.add('is-on');
      gsap.fromTo(inC, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.15, ease: 'power3.out' });
    }

    ScrollTrigger.create({
      trigger: pin,
      start: 'top top',
      end: '+=180%',
      pin: true,
      anticipatePin: 1,
      onUpdate: function (self) { show(self.progress > 0.46 ? 1 : 0); }
    });

    /* premier plan : révélation par masque à l'entrée */
    gsap.fromTo(figures[0],
      { clipPath: 'inset(100% 0% 0% 0%)' },
      {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.inOut',
        scrollTrigger: { trigger: pin, start: 'top 70%', once: true }
      });
  })();

  /* ============================================================= SERVICES */
  (function services() {
    $$('[data-reveal-lines]').forEach(function (h) {
      var split = splitLines(h);
      if (!split) { gsap.set(h, { opacity: 1 }); return; }
      split.lines.forEach(function (line) {
        var inner = document.createElement('span');
        while (line.firstChild) inner.appendChild(line.firstChild);
        line.appendChild(inner);
        line.style.overflow = 'hidden';
        line.style.display = 'block';
      });
      gsap.fromTo($$('.line > span', h),
        { yPercent: 108, opacity: 1 },
        {
          yPercent: 0, duration: 1.1, stagger: 0.08, ease: 'expo.out',
          scrollTrigger: { trigger: h, start: 'top 85%', once: true }
        });
    });

    $$('[data-stagger]').forEach(function (el) { gsap.set(el, { y: 22 }); });
    ['.services__grid', '.stats', '.quotes__list'].forEach(function (sel) {
      var wrap = $(sel);
      if (!wrap) return;
      fadeIn($$('[data-stagger]', wrap), { trigger: wrap, stagger: 0.07 });
    });

    $$('[data-fade]').forEach(function (el) {
      if (el.closest('.hero')) return;
      gsap.set(el, { y: 14 });
      fadeIn([el], { trigger: el, stagger: 0 });
    });
  })();

  /* ====================================== MARQUEE piloté par la vélocité */
  (function marquee() {
    var wrap = $('[data-marquee]');
    if (!wrap) return;
    var track = $('.marquee__track', wrap);

    /* duplication pour une boucle sans couture */
    track.innerHTML += track.innerHTML;
    var half = track.scrollWidth / 2;

    var loop = gsap.to(track, {
      x: -half, duration: 26, ease: 'none', repeat: -1,
      modifiers: { x: function (x) { return (parseFloat(x) % half) + 'px'; } }
    });

    /* La vitesse de défilement déforme et accélère le bandeau :
       le mouvement de la page devient lisible dans la typographie. */
    ScrollTrigger.create({
      trigger: wrap,
      start: 'top bottom', end: 'bottom top',
      onUpdate: function (self) {
        var v = gsap.utils.clamp(-18, 18, self.getVelocity() / 260);
        loop.timeScale(gsap.utils.clamp(0.3, 4, 1 + Math.abs(v) / 6));
        gsap.to(track, { skewX: -v * 0.5, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
      }
    });
  })();

  /* ============================================================== ATELIER */
  (function about() {
    var img = $('[data-parallax]');
    if (!img) return;
    gsap.fromTo(img, { yPercent: -7 }, {
      yPercent: 7, ease: 'none',
      scrollTrigger: { trigger: $('[data-parallax-wrap]'), start: 'top bottom', end: 'bottom top', scrub: true }
    });

    gsap.fromTo('[data-parallax-wrap]',
      { clipPath: 'inset(14% 8% 14% 8%)' },
      {
        clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
        scrollTrigger: { trigger: '[data-parallax-wrap]', start: 'top 92%', end: 'top 35%', scrub: 0.8 }
      });
  })();

  /* ============================================================ COMPTEURS */
  (function counters() {
    var fmt = new Intl.NumberFormat('fr-FR');
    $$('[data-count]').forEach(function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var suffix = el.getAttribute('data-suffix') || '';
      var obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: 2, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        onUpdate: function () {
          el.textContent = (dec
            ? obj.v.toFixed(dec).replace('.', ',')
            : fmt.format(Math.round(obj.v))) + suffix;
        }
      });
    });
  })();

  /* ============================================== FOLIO — repère de lecture */
  (function folio() {
    var idxEl = $('[data-folio-idx]');
    var nameEl = $('[data-folio-name]');
    if (!idxEl || !nameEl) return;

    var sections = $$('[data-section]');
    function roll(el, text) {
      if (el.textContent === text) return;
      gsap.to(el, {
        yPercent: -100, duration: 0.3, ease: 'power2.in',
        onComplete: function () {
          el.textContent = text;
          gsap.fromTo(el, { yPercent: 100 }, { yPercent: 0, duration: 0.45, ease: 'power3.out' });
        }
      });
    }

    sections.forEach(function (sec, i) {
      ScrollTrigger.create({
        trigger: sec, start: 'top 45%', end: 'bottom 45%',
        onToggle: function (self) {
          if (!self.isActive) return;
          roll(idxEl, String(i + 1).padStart(2, '0'));
          roll(nameEl, sec.getAttribute('data-section'));
        }
      });
    });
  })();

  /* ===================================== GALERIE — WebGL chargé à la demande */
  (function gallery() {
    var grid = $('.gallery__grid');
    if (!grid) { return; }

    var supportsGL = (function () {
      try {
        var c = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
      } catch (e) { return false; }
    })();

    /* En file:// (double-clic sur index.html), Chrome traite toute image locale
       comme cross-origin et refuse de la téléverser en texture. Inutile de
       tenter : on sert directement la version sans WebGL. */
    if (!supportsGL || location.protocol === 'file:') { initTilesFallback(); return; }

    /* Filet de sécurité : si gl.js constate que rien ne s'est dessiné (pilote
       refusé, contexte perdu), il le signale et la grille reprend la main. */
    document.addEventListener('admphone:gl-failed', function () { initTilesFallback(); }, { once: true });

    var loaded = false;
    function boot() {
      if (loaded) return;
      loaded = true;
      var s1 = document.createElement('script');
      s1.src = 'assets/vendor/three.min.js';
      s1.onload = function () {
        var s2 = document.createElement('script');
        s2.src = 'assets/js/gl.js';
        s2.onerror = initTilesFallback;
        document.body.appendChild(s2);
      };
      s1.onerror = initTilesFallback;
      document.body.appendChild(s1);
    }

    /* Chargement à l'approche. On s'appuie sur IntersectionObserver plutôt que
       sur un déclencheur de défilement : indépendant de Lenis et du sens de
       lecture, il se déclenche aussi si la page s'ouvre déjà sur la galerie. */
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { io.disconnect(); boot(); }
      }, { rootMargin: '600px 0px' });
      io.observe(grid);
    } else {
      boot();
    }
  })();

  initForm();
  initYear();

  /* Recalcul après chargement des images : les hauteurs changent. */
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });

  /* ------------------------------------------------------------ fonctions */

  /* Repli sans WebGL : survol = permutation avant/après en fondu CSS. */
  function initTilesFallback() {
    $$('[data-tile]').forEach(function (tile) {
      var img = tile.querySelector('img');
      var before = tile.getAttribute('data-before');
      var after = tile.getAttribute('data-after');
      if (!img || !after) return;
      var pre = new Image(); pre.src = after;
      var swap = function (src) {
        img.style.transition = 'opacity .28s ease';
        img.style.opacity = '0';
        setTimeout(function () { img.src = src; img.style.opacity = '1'; }, 180);
      };
      tile.addEventListener('mouseenter', function () { swap(after); });
      tile.addEventListener('mouseleave', function () { swap(before); });
      tile.addEventListener('focus', function () { swap(after); });
      tile.addEventListener('blur', function () { swap(before); });
    });
  }

  /* Valeur finale des compteurs, sans compte à rebours. */
  function initCountersStatic() {
    var fmt = new Intl.NumberFormat('fr-FR');
    $$('[data-count]').forEach(function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var suffix = el.getAttribute('data-suffix') || '';
      el.textContent = (dec ? target.toFixed(dec).replace('.', ',') : fmt.format(target)) + suffix;
    });
  }

  function initFolioStatic() {
    var f = $('.folio');
    if (f) f.style.display = 'none';
  }

  function initYear() {
    var y = $('[data-year]');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* Formulaire : validation côté client uniquement — voir README pour le
     branchement à un service d'envoi. */
  function initForm() {
    var form = $('[data-form]');
    if (!form) return;
    var note = $('[data-form-note]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      $$('select, input', form).forEach(function (f) {
        var valid = f.value.trim() !== '';
        f.parentElement.classList.toggle('is-invalid', !valid);
        if (!valid) ok = false;
      });
      if (!ok) {
        note.textContent = 'Merci de compléter les trois champs.';
        note.classList.remove('is-ok');
        return;
      }
      note.textContent = 'Demande enregistrée. Nous vous répondons sous une heure ouvrée.';
      note.classList.add('is-ok');
      form.reset();
    });
  }
})();
