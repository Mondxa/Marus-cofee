/* =========================================================
   Maru's Coffee — capa de animación (GSAP + ScrollTrigger).
   Todo es progresivo: si GSAP no carga o el usuario pidió
   "reducir movimiento", la página funciona sin estos efectos.
   ========================================================= */
(function () {
  if (!window.gsap || !window.ScrollTrigger) return;
  const { gsap } = window;
  gsap.registerPlugin(...[window.ScrollTrigger, window.ScrollToPlugin, window.SplitText, window.ScrambleTextPlugin].filter(Boolean));

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* Scroll animado que usa goTo() del script principal */
  if (window.ScrollToPlugin && !reduce) {
    /* getY se vuelve a medir al final por si el layout se movió durante el viaje */
    window.__smoothTo = (getY, duration) => {
      let tries = 0;
      const fix = () => {
        const y = getY();
        if (Math.abs(y - scrollY) > 2 && tries++ < 3) gsap.to(window, { scrollTo: { y, autoKill: false }, duration: .35, ease: 'power2.out', overwrite: true, onComplete: fix });
      };
      gsap.to(window, { scrollTo: { y: getY(), autoKill: false }, duration, ease: 'power3.inOut', overwrite: true, onComplete: fix });
    };
    /* Si la persona toca la rueda o la pantalla, se respeta su scroll */
    const stop = () => gsap.killTweensOf(window);
    addEventListener('wheel', stop, { passive: true });
    addEventListener('touchstart', stop, { passive: true });
  }

  if (reduce) return;
  document.documentElement.classList.add('motion');

  /* ---------- 1. Preloader: logo, contador y cortina ---------- */
  const loader = $('#loader');
  window.__preloader = !!loader;
  if (loader) {
    loader.style.animation = 'none';
    const b = $('.loader-logo b', loader);
    b.style.animation = 'none';
    const count = $('.loader-count', loader);
    let quick = false;
    try { quick = sessionStorage.getItem('marus-visto') === '1'; sessionStorage.setItem('marus-visto', '1'); } catch (e) {}
    document.documentElement.style.overflow = 'hidden';
    const n = { v: 0 };
    const tl = gsap.timeline({
      defaults: { ease: 'expo.inOut' },
      onComplete: () => { loader.remove(); ScrollTrigger.refresh(); }
    });
    tl.fromTo(b, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1 })
      .from('.loader-logo small', { y: 16, opacity: 0, duration: .5, ease: 'power3.out' }, .55)
      .from('.loader-tag', { opacity: 0, letterSpacing: '1em', duration: .8, ease: 'power3.out' }, .3)
      .to(n, { v: 100, duration: 1.2, ease: 'power2.inOut', onUpdate: () => count.textContent = Math.round(n.v) }, 0)
      .to('.loader-panel', { yPercent: -100, duration: .6 }, 1.15)
      .add(() => { document.documentElement.style.overflow = ''; heroIn(); }, 1.6)
      .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: .8 }, 1.6);
    if (quick) tl.timeScale(2.2);
    /* Seguro: si la pestaña está en segundo plano o lenta, nunca dejar el preloader pegado */
    setTimeout(() => { if (loader.isConnected) tl.progress(1); }, 6000);
  }

  /* ---------- 2. Hero: entrada, contadores, parallax y salida ---------- */
  function heroIn() {
    window.startHero && window.startHero();
    $$('.hero-meta strong').forEach(el => {
      const m = el.textContent.match(/^(\d+)(.*)$/); if (!m) return;
      const o = { v: 0 };
      gsap.to(o, { v: +m[1], duration: 1.8, delay: .6, ease: 'power3.out', onUpdate: () => el.textContent = Math.round(o.v) + m[2] });
    });
  }
  const heroArt = $('.hero-art');
  if (heroArt && fine) {
    const qx = gsap.quickTo(heroArt, '--px', { duration: .9, ease: 'power3' });
    const qy = gsap.quickTo(heroArt, '--py', { duration: .9, ease: 'power3' });
    $('.hero').addEventListener('pointermove', e => { qx(e.clientX / innerWidth * 2 - 1); qy(e.clientY / innerHeight * 2 - 1); });
    $('.hero').addEventListener('pointerleave', () => { qx(0); qy(0); });
  }
  gsap.to('.hero-art', { yPercent: 16, scale: .86, rotate: -6, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero .wrap > div:first-child', { yPercent: -14, opacity: .15, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });

  /* ---------- 3. Marquee que reacciona a la velocidad del scroll ---------- */
  const track = $('.marquee-track');
  if (track) {
    let x = 0, dir = 1, boost = 0, half = track.scrollWidth / 2;
    addEventListener('resize', () => half = track.scrollWidth / 2);
    const skew = gsap.quickTo(track, 'skewX', { duration: .5, ease: 'power3' });
    gsap.ticker.add((t, dt) => {
      x -= (0.07 + boost) * Math.min(dt, 50) * dir;
      x = gsap.utils.wrap(-half, 0, x);
      boost *= 0.92;
      gsap.set(track, { x });
    });
    ScrollTrigger.create({
      onUpdate: self => {
        dir = self.direction;
        const v = self.getVelocity();
        boost = Math.min(Math.abs(v) / 2500, 1.4);
        skew(gsap.utils.clamp(-12, 12, v / -250));
      }
    });
    ScrollTrigger.addEventListener('scrollEnd', () => skew(0));
  }

  /* ---------- 4. Títulos: letras que suben con rebote ---------- */
  const splitTitles = () => {
    if (!window.SplitText) return;
    $$('.sec-head h2, .shop-head h2, .about h2, .visit h2, .feature h2, .gal-intro h2').forEach(h => {
      const split = SplitText.create(h, { type: 'words,chars', mask: 'words' });
      gsap.from(split.chars, {
        yPercent: 110, rotate: 10, opacity: 0, duration: .9, ease: 'back.out(1.7)',
        stagger: { each: .025 },
        scrollTrigger: { trigger: h, start: 'top 88%' }
      });
    });
  };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(splitTitles);

  /* Eyebrows: efecto "scramble" al entrar */
  if (window.ScrambleTextPlugin) {
    $$('main .eyebrow').filter(el => !el.children.length).forEach(el => {
      const text = el.textContent;
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: () => gsap.to(el, { duration: 1.1, scrambleText: { text, chars: "MARUSCOFE·'", speed: .6 } })
      });
    });
  }

  /* ---------- 5. Animaciones que dependen del ancho ---------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    /* Galería horizontal fijada */
    const gTrack = $('.gal-track');
    if (gTrack) {
      const dist = () => Math.max(0, gTrack.scrollWidth - innerWidth);
      const move = gsap.to(gTrack, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: '.gallery', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 }
      });
      gsap.to('.gal-bg', { x: () => -dist() * .4, ease: 'none', scrollTrigger: { trigger: '.gallery', start: 'top top', end: () => '+=' + dist(), scrub: 1, invalidateOnRefresh: true } });
      $$('.gal-item').forEach((item, i) => {
        gsap.fromTo($('img', item), { xPercent: -15 }, { xPercent: 0, ease: 'none', scrollTrigger: { trigger: item, containerAnimation: move, start: 'left right', end: 'right left', scrub: true } });
        gsap.from(item, { y: i % 2 ? -90 : 90, rotate: i % 2 ? -7 : 7, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: item, containerAnimation: move, start: 'left 92%' } });
        gsap.from($('figcaption', item), { x: 40, opacity: 0, duration: .8, delay: .25, ease: 'power3.out', scrollTrigger: { trigger: item, containerAnimation: move, start: 'left 85%' } });
      });
    }

    /* Destacado: se fija y el plato gira mientras bajas */
    const tl = gsap.timeline({ scrollTrigger: { trigger: '#destacado', start: 'top top', end: '+=110%', pin: true, scrub: 1, anticipatePin: 1 } });
    tl.fromTo('.feature-stage .disc', { scale: .5, rotate: -50 }, { scale: 1, rotate: 0, ease: 'power2.out', duration: 1 })
      .fromTo('.feature-stage .disc-photo', { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(50% at 50% 50%)', ease: 'power2.out', duration: 1 }, 0)
      .from('#destacado .wrap > .reveal > *', { x: -70, opacity: 0, stagger: .15, duration: .6 }, .1)
      .to('.feature-stage .disc', { rotate: 18, scale: 1.04, ease: 'none', duration: .8 });
  });
  mm.add('(max-width: 900px)', () => {
    gsap.from('.feature-stage .disc', { scale: .6, rotate: -40, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.feature-stage', start: 'top 80%' } });
  });

  /* ---------- 6. Nosotros, visítanos y detalles ---------- */
  gsap.fromTo('.about-visual', { clipPath: 'inset(22% 22% 22% 22% round 200px)' }, {
    clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1.5, ease: 'expo.out', clearProps: 'clipPath',
    scrollTrigger: { trigger: '.about-visual', start: 'top 82%' }
  });
  gsap.to('.sign', { rotate: 28, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.perk', {
    y: 60, scale: .8, opacity: 0, duration: .8, ease: 'back.out(2)', stagger: .12, clearProps: 'all',
    onStart() { this.targets().forEach(t => t.style.transition = 'none'); },
    scrollTrigger: { trigger: '.perks', start: 'top 92%' }
  });
  gsap.from('.visit', { scale: .9, borderRadius: 90, ease: 'none', scrollTrigger: { trigger: '.visit', start: 'top bottom', end: 'top 35%', scrub: true } });
  gsap.from('#hours li', { x: 50, opacity: 0, stagger: .1, duration: .7, ease: 'power3.out', scrollTrigger: { trigger: '#hours', start: 'top 88%' } });
  gsap.from('.shop-steps .step span', { scale: 0, rotate: -180, stagger: .15, duration: .8, ease: 'back.out(2.5)', scrollTrigger: { trigger: '.shop-steps', start: 'top 92%' } });

  /* Barra de progreso */
  gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });

  /* Nav: marca la sección visible */
  const links = $$('#menu a');
  links.forEach(a => {
    const sec = $(a.getAttribute('href')); if (!sec) return;
    ScrollTrigger.create({
      trigger: sec, start: 'top 45%', end: 'bottom 45%',
      onToggle: self => { if (self.isActive) links.forEach(l => l.setAttribute('aria-current', l === a)); else a.setAttribute('aria-current', 'false'); }
    });
  });

  /* ---------- 7. Grilla de puntos estilo anime.js (footer) ---------- */
  const dotsEl = $('#dots');
  if (dotsEl) {
    let dots = [], cols = 0, rows = 6;
    const build = () => {
      const c = innerWidth < 901 ? 14 : 26;
      if (c === cols) return;
      cols = c;
      dotsEl.innerHTML = '<i></i>'.repeat(cols * rows);
      dots = $$('i', dotsEl);
    };
    build();
    addEventListener('resize', build);
    const ripple = from => {
      gsap.timeline()
        .to(dots, { scale: 2.2, y: -12, backgroundColor: '#9a5b3a', opacity: 1, duration: .35, ease: 'power2.out', stagger: { grid: [rows, cols], from, amount: .8 } })
        .to(dots, { scale: 1, y: 0, backgroundColor: '#1d4f55', opacity: .75, duration: .9, ease: 'elastic.out(1, .35)', stagger: { grid: [rows, cols], from, amount: .8 } }, .3);
    };
    dotsEl.addEventListener('pointerdown', e => { const i = dots.indexOf(e.target); if (i > -1) ripple(i); });
    if (fine) dotsEl.addEventListener('pointerover', e => {
      if (e.target.tagName !== 'I') return;
      gsap.fromTo(e.target, { scale: 1 }, { scale: 2.6, duration: .25, yoyo: true, repeat: 1, ease: 'power2.out', overwrite: 'auto' });
    });
    ScrollTrigger.create({ trigger: dotsEl, start: 'top 85%', once: true, onEnter: () => ripple('center') });
  }

  /* ---------- 8. Cursor propio + botones magnéticos (solo mouse) ---------- */
  if (fine) {
    document.body.classList.add('has-cursor', 'has-magnet');
    const ring = $('.cursor-ring'), label = $('span', ring);
    const [cRing, cDot] = $$('.cursor');
    const rx = gsap.quickTo(cRing, 'x', { duration: .45, ease: 'power3' }), ry = gsap.quickTo(cRing, 'y', { duration: .45, ease: 'power3' });
    const dx = gsap.quickTo(cDot, 'x', { duration: .1, ease: 'power3' }), dy = gsap.quickTo(cDot, 'y', { duration: .1, ease: 'power3' });
    addEventListener('pointermove', e => { rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY); ring.classList.remove('out'); }, { passive: true });
    document.addEventListener('pointerleave', () => ring.classList.add('out'));
    document.addEventListener('pointerover', e => {
      const t = e.target;
      const card = t.closest('.card');
      const act = t.closest('a,button,label,.chip,[role="tab"]');
      ring.classList.toggle('label', !!card);
      ring.classList.toggle('link', !card && !!act);
      ring.classList.toggle('dark', !!t.closest('.feature,.visit,.marquee,.drawer-bg,.modal-bg'));
      label.textContent = card ? 'Ver' : '';
    });

    const MAG = '.btn,.buy,.chip,.cart-btn';
    let cur = null;
    const release = el => gsap.to(el, { x: 0, y: 0, duration: .7, ease: 'elastic.out(1, .4)' });
    document.addEventListener('pointermove', e => {
      const el = e.target.closest(MAG);
      if (el !== cur) { cur && release(cur); cur = el; }
      if (!el) return;
      const r = el.getBoundingClientRect();
      gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * .3, y: (e.clientY - r.top - r.height / 2) * .4, duration: .4, ease: 'power3.out' });
    }, { passive: true });
  }

  /* ---------- 9. Recalcular posiciones cuando cambia el alto de la página ---------- */
  let rT;
  new ResizeObserver(() => { clearTimeout(rT); rT = setTimeout(() => ScrollTrigger.refresh(), 200); }).observe($('main'));
})();
