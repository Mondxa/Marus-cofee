/* =========================================================
   Maru's Coffee — capa de animación (GSAP + ScrollTrigger).
   Tres momentos y nada más: la entrada de la portada, la
   galería horizontal y el plato del Croissant Lotus.
   Todo es progresivo: si GSAP no carga o el usuario pidió
   "reducir movimiento", la página funciona sin estos efectos.
   ========================================================= */
(function () {
  if (!window.gsap || !window.ScrollTrigger) return;
  const { gsap } = window;
  gsap.registerPlugin(...[window.ScrollTrigger, window.ScrollToPlugin].filter(Boolean));

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  /* Nav: marca la sección visible (funcional, también con movimiento reducido).
     Se crea después de las secciones fijadas para que cuente el espacio que agregan. */
  const navActive = () => {
    const links = $$('#menu a');
    links.forEach(a => {
      const sec = $(a.getAttribute('href')); if (!sec) return;
      ScrollTrigger.create({
        trigger: sec, start: 'top 45%', end: 'bottom 45%',
        onToggle: self => { if (self.isActive) links.forEach(l => l.setAttribute('aria-current', l === a)); else a.setAttribute('aria-current', 'false'); }
      });
    });
  };

  if (reduce) { navActive(); return; }
  document.documentElement.classList.add('motion');

  /* ---------- 1. Portada: el título sube palabra por palabra y el plato se asienta (CSS) ----------
     Al bajar, la foto se aleja un poco. */
  gsap.to('.hero-art', { yPercent: 10, scale: .94, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    /* ---------- 2. Galería horizontal: se fija y avanza de lado mientras bajas ---------- */
    const gTrack = $('.gal-track');
    if (gTrack) {
      const dist = () => Math.max(0, gTrack.scrollWidth - innerWidth);
      const move = gsap.to(gTrack, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: '.gallery', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 }
      });
      $$('.gal-item').forEach(item => {
        gsap.fromTo($('img', item), { xPercent: -15 }, { xPercent: 0, ease: 'none', scrollTrigger: { trigger: item, containerAnimation: move, start: 'left right', end: 'right left', scrub: true } });
      });
    }

    /* ---------- 3. Destacado: se fija y el plato del Lotus se abre ---------- */
    const tl = gsap.timeline({ scrollTrigger: { trigger: '#destacado', start: 'top top', end: '+=80%', pin: true, scrub: 1, anticipatePin: 1 } });
    tl.fromTo('.feature-stage .disc', { scale: .7 }, { scale: 1, ease: 'power2.out', duration: 1 })
      .fromTo('.feature-stage .disc-photo', { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(50% at 50% 50%)', ease: 'power2.out', duration: 1 }, 0);
  });

  navActive();

  /* Recalcular posiciones cuando cambia el alto de la página */
  let rT;
  new ResizeObserver(() => { clearTimeout(rT); rT = setTimeout(() => ScrollTrigger.refresh(), 200); }).observe($('main'));
})();
