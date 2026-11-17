/* Caca Portfolio — opening animation, cinematic 3D logistics (Three.js + GSAP), radial sidebar. Berdiri sendiri; tidak menyentuh script lama. */
(function () {
  'use strict';
  var W = window, d = document, root = d.documentElement, G = W.gsap, T = W.THREE;
  var $ = function (id) { return d.getElementById(id); };
  var RM = !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var LITE = (navigator.hardwareConcurrency || 4) <= 3 || (navigator.deviceMemory || 4) <= 2 ||
    !!(navigator.connection && navigator.connection.saveData) || W.innerWidth < 700;
  var CH = [
    ['Kedatangan Armada', 'Truk trailer bergerak memasuki kawasan industri dan distribusi.'],
    ['Kawasan Pergudangan', 'Kamera berpindah ke warehouse: rak penyimpanan, dock, dan area operasi.'],
    ['Warehouse Operations', 'Forklift mengambil pallet dari rak dan memindahkannya ke jalur proses.'],
    ['Material Handling', 'Karton bergerak di conveyor belt dari penyimpanan menuju pengiriman.'],
    ['Loading Dock', 'Barang masuk ke trailer di loading dock secara terorganisasi.'],
    ['Outbound Distribution', 'Truk membawa barang keluar dari gudang menuju jaringan distribusi.'],
    ['Supply Chain Network', 'Jaringan penyimpanan, transportasi, dan pelanggan yang saling terhubung.']
  ];
  var introDone = root.classList.contains('cc-skip'), hubApi = null;
  var inRoute = function () { return (W.location.hash || '').indexOf('#/') === 0; };

  /* ============ 1. OPENING ============ */
function initIntro() {
    var el = $('cc-intro');
    if (!el || introDone) {
      if (el) el.style.display = 'none';
      return;
    }

    var stage = $('cc-intro-stage');
    var subtitle = $('cc-intro-sub');
    var btn = $('cc-intro-btn');
    var portfolioWord = $('cc-portfolio-word');
    var signature = $('cc-caca-word');
    var underline = $('cc-caca-underline');
    var underlinePath = underline ? underline.querySelector('path') : null;
    var ornament = el.querySelector('.cc-intro-ornament');
    var wave = el.querySelector('.cc-intro-wave');
    var sweep = el.querySelector('.cc-sweep');
    var bk = $('cc-bokeh');
    var sparkles = [].slice.call(el.querySelectorAll('.cc-sparkle, .cc-ornament-star'));

    if (!btn || !stage || !portfolioWord || !signature) {
      el.style.display = 'none';
      root.classList.remove('cc-lock');
      introDone = true;
      return;
    }

    // Pecah PORTOFOLIO menjadi huruf agar dapat muncul dengan stagger yang halus.
    if (!portfolioWord.querySelector('.cc-letter')) {
      var titleText = portfolioWord.textContent.trim();
      portfolioWord.textContent = '';
      Array.from(titleText).forEach(function (character) {
        var letter = d.createElement('span');
        var inner = d.createElement('i');
        letter.className = 'cc-letter';
        inner.textContent = character === ' ' ? '\u00a0' : character;
        letter.appendChild(inner);
        portfolioWord.appendChild(letter);
      });
    }
    var letters = [].slice.call(portfolioWord.querySelectorAll('.cc-letter'));

    // Bokeh dekoratif dibuat ringan dan hanya dibuat satu kali.
    if (bk && !bk.childElementCount) {
      var particleCount = LITE ? 7 : 13;
      for (var i = 0; i < particleCount; i++) {
        var particle = d.createElement('b');
        var size = 24 + Math.random() * 62;
        particle.style.cssText =
          'left:' + (Math.random() * 100).toFixed(2) + '%;' +
          'top:' + (Math.random() * 100).toFixed(2) + '%;' +
          'width:' + size.toFixed(0) + 'px;' +
          'height:' + size.toFixed(0) + 'px;' +
          'opacity:' + (0.1 + Math.random() * 0.2).toFixed(2) + ';' +
          'animation-duration:' + (9 + Math.random() * 8).toFixed(1) + 's;' +
          'animation-delay:-' + (Math.random() * 9).toFixed(1) + 's';
        bk.appendChild(particle);
      }
    }

    var done = false;
    var introTimeline = null;

    function finish() {
      el.style.display = 'none';
      el.style.pointerEvents = '';
      el.style.opacity = '';
      el.style.filter = '';
      root.classList.remove('cc-lock');
      introDone = true;
      if (hubApi) hubApi.refresh();
    }

    // Explore Portfolio menutup opening dengan transisi sinematik yang singkat.
    function enter() {
      if (done) return;
      done = true;
      btn.disabled = true;

      try { sessionStorage.setItem('cc_intro', '1'); } catch (e) {}
      if (introTimeline) introTimeline.kill();

      if (G) {
        G.killTweensOf(stage);
        G.killTweensOf(el);
        G.killTweensOf(signature);
        G.killTweensOf(sparkles);
      }

      root.classList.remove('cc-lock');
      el.style.pointerEvents = 'none';
      W.scrollTo(0, 0);

      if (G && !RM) {
        G.timeline({ defaults: { overwrite: 'auto' }, onComplete: finish })
          .to(stage, {
            y: -18, rotationY: 0, rotationX: 0, scale: 1.025,
            opacity: 0, filter: 'blur(4px)', duration: 0.46, ease: 'power2.in'
          })
          .to(el, {
            opacity: 0, filter: 'blur(2px)', duration: 0.48, ease: 'power1.out'
          }, '-=0.12');
      } else if (RM) {
        finish();
      } else {
        el.style.transition = 'opacity 480ms cubic-bezier(0.22, 1, 0.36, 1), filter 480ms ease';
        W.requestAnimationFrame(function () {
          el.style.opacity = '0';
          el.style.filter = 'blur(2px)';
        });
        W.setTimeout(finish, 500);
      }
    }

    btn.addEventListener('click', enter);
    d.addEventListener('keydown', function (event) {
      if (!done && event.key === 'Escape') {
        event.preventDefault();
        enter();
      }
    });

    if (G && !RM) {
      var pathLength = 0;
      if (underlinePath && underlinePath.getTotalLength) {
        try {
          pathLength = underlinePath.getTotalLength();
          underlinePath.style.strokeDasharray = pathLength;
          underlinePath.style.strokeDashoffset = pathLength;
        } catch (e) { pathLength = 0; }
      }

      G.set(stage, {
        opacity: 1, rotationY: -2.5, rotationX: 1.2, y: 10,
        scale: 0.985, transformPerspective: 1300, transformOrigin: '50% 55%'
      });

      introTimeline = G.timeline({ defaults: { overwrite: 'auto' } });
      introTimeline
        .to(stage, {
          rotationY: 0, rotationX: 0, y: 0, scale: 1,
          duration: 1.35, ease: 'power3.out'
        }, 0)
        .from(ornament, {
          opacity: 0, y: -12, filter: 'blur(3px)',
          duration: 0.75, ease: 'power3.out'
        }, 0.12)
        .from(subtitle, {
          opacity: 0, y: 18, filter: 'blur(4px)',
          duration: 0.9, ease: 'power3.out'
        }, 0.25)
.from(letters, {
    opacity: 0,
    y: 22,
    rotateX: -6,
    stagger: 0.035,
    duration: 0.65,
    ease: 'power3.out'
}, 0.35)
.fromTo(signature,
    {
        opacity: 0,
        x: -14,
        y: 8
    },
    {
        opacity: 1,
        x: 0,
        y: 0,
        duration: 0.9,
        ease: 'power3.out'
    },
    0.85
);
if (underlinePath && pathLength > 0) {
    introTimeline.to(underlinePath, {
        strokeDashoffset: 0,
        duration: 0.85,
        ease: 'power2.out'
    }, 1.65);
}

if (sweep) {
  introTimeline.fromTo(sweep,
          { xPercent: -125, opacity: 0 },
          { xPercent: 260, opacity: 0.72, duration: 2.2, ease: 'power2.inOut' },
          0.15
        );
      }

      if (wave) {
        introTimeline.from(wave, {
          opacity: 0, y: 18, duration: 1.45, ease: 'power2.out'
        }, 0.55);
      }

      introTimeline.from(btn, {
        opacity: 0, y: 16, scale: 0.97,
        duration: 0.55, ease: 'power3.out',
        onComplete: function () { btn.focus({ preventScroll: true }); }
      }, 1.25);
      if (sparkles.length) {
        G.to(sparkles, {
          opacity: 1, scale: 1.16, duration: 1.25,
          repeat: -1, yoyo: true, stagger: 0.28, ease: 'sine.inOut', delay: 1.1
        });
      }
      // Gerak melayang yang sangat halus menjaga opening tetap hidup setelah reveal.
      G.to(stage, {
        y: -4, duration: 3.2, repeat: -1, yoyo: true,
        ease: 'sine.inOut', delay: 2.8
      });
        } else {
        // Jika animasi dinonaktifkan atau GSAP tidak tersedia
        W.requestAnimationFrame(function () {
            btn.focus({ preventScroll: true });
        });
    }
    // Tampilkan opening setelah animasi selesai disiapkan
    if (stage) {
        stage.style.visibility = 'visible';
    }
}
  /* ============ 2. RADIAL SIDEBAR ============ */
  function initHub() {
    var hub = $('cc-hub'); if (!hub) return;
    var btn = $('cc-hub-btn'), items = [].slice.call(hub.querySelectorAll('.cc-item')), ang = [135, 180, 225], R = 96, open = false;
    items.forEach(function (it, i) { var a = ang[i] * Math.PI / 180; it._x = Math.cos(a) * R; it._y = -Math.sin(a) * R; it.tabIndex = -1; });
    if (G) G.set(items, { x: 0, y: 0, scale: 0.3, opacity: 0 });
    function set(o) {
      open = o; hub.classList.toggle('open', o); btn.setAttribute('aria-expanded', String(o));
      items.forEach(function (it, i) {
        var x = o ? it._x : 0, y = o ? it._y : 0, sc = o ? 1 : 0.3, op = o ? 1 : 0;
        it.tabIndex = o ? 0 : -1;
        if (G && !RM) G.to(it, { x: x, y: y, scale: sc, opacity: op, duration: 0.5, delay: o ? i * 0.06 : 0, ease: o ? 'back.out(1.8)' : 'power2.in' });
        else { it.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + sc + ')'; it.style.opacity = op; }
      });
    }
    function go(id) {
      var run = function () { var t = $(id); if (t) t.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }); };
      if (inRoute() && W.Router) { W.Router.goHome(); setTimeout(run, 280); } else run();
    }
    var act = {
      cv: function () { if (W.CvService) W.CvService.downloadActiveCv(); },
      projects: function () { go('projects'); },
      contact: function () { go('contact'); }
    };
    btn.addEventListener('click', function () { set(!open); });
    items.forEach(function (it) { it.addEventListener('click', function () { act[it.getAttribute('data-act')](); set(false); }); });
    if (W.matchMedia && W.matchMedia('(hover: hover)').matches) {
      hub.addEventListener('mouseenter', function () { set(true); });
      hub.addEventListener('mouseleave', function () { set(false); });
    }
    d.addEventListener('click', function (e) { if (open && !hub.contains(e.target)) set(false); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) { set(false); btn.focus(); } });
    function refresh() { hub.classList.toggle('cc-hidden', !introDone || inRoute()); }
    W.addEventListener('hashchange', refresh);
    hubApi = { refresh: refresh }; refresh();
  }

  /* ============ 3. CINEMATIC 3D ============ */
  function fallback(sec) {
    sec.classList.add('cc-nogl');
    $('cc-cards').innerHTML = CH.map(function (c, i) { return '<div><small>0' + (i + 1) + '</small><h3>' + c[0] + '</h3>' + c[1] + '</div>'; }).join('');
  }

  function initScene() {
    var sec = $('cc-cinema'), cv = $('cc-canvas'); if (!sec || !cv) return;
    if (!T) return fallback(sec);
    var ren;
    try { ren = new T.WebGLRenderer({ canvas: cv, antialias: !LITE, powerPreference: 'high-performance' }); } catch (e) { return fallback(sec); }
    var STATIC = RM; if (STATIC) sec.classList.add('cc-static');
    ren.setPixelRatio(Math.min(W.devicePixelRatio || 1, LITE ? 1 : 1.75));
    ren.outputEncoding = T.sRGBEncoding; ren.toneMapping = T.ACESFilmicToneMapping; ren.toneMappingExposure = 1.1;
    ren.shadowMap.enabled = !LITE; ren.shadowMap.type = T.PCFSoftShadowMap;
    var sc = new T.Scene(); sc.background = new T.Color(0x160B2D); sc.fog = new T.Fog(0x160B2D, 45, 175);
    var cam = new T.PerspectiveCamera(46, 1, 0.1, 400), SH = !LITE;
    var GC = {}, MC = {};
    var geo = function (w, h, l) { var k = w + ',' + h + ',' + l; return GC[k] || (GC[k] = new T.BoxGeometry(w, h, l)); };
    var mat = function (c, r, m, e, ei) { var k = [c, r, m, e, ei].join(); return MC[k] || (MC[k] = new T.MeshStandardMaterial({ color: c, roughness: r == null ? 0.7 : r, metalness: m || 0, emissive: e || 0, emissiveIntensity: ei || 1 })); };
    var box = function (w, h, l, m, x, y, z, p) { var o = new T.Mesh(geo(w, h, l), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = SH; (p || sc).add(o); return o; };
    var cyl = function (r, h, m, x, y, z, p) { var o = new T.Mesh(new T.CylinderGeometry(r, r, h, 18), m); o.rotation.z = Math.PI / 2; o.position.set(x, y, z); o.castShadow = SH; (p || sc).add(o); return o; };
    var C = { dark: mat(0x120a22, 0.6, 0.3), steel: mat(0x3b2a63, 0.5, 0.5), wall: mat(0x2b1850, 0.9), wood: mat(0x8d6b45, 0.9), kraft: mat(0xb89466, 0.85),
      royal: mat(0x54218A, 0.45, 0.2), neon: mat(0xA83FEA, 0.4, 0, 0xA83FEA, 1.6), pink: mat(0xE65BFA, 0.4, 0, 0xE65BFA, 1.8), lav: mat(0xD9B5FF, 0.5, 0, 0xD9B5FF, 0.5), white: mat(0xE8DDF7, 0.45, 0.1) };
    var Y0 = 0.2;

    /* lighting */
    sc.add(new T.HemisphereLight(0xD9B5FF, 0x28104B, 0.75));
    var sun = new T.DirectionalLight(0xfff0ff, 0.95); sun.position.set(-30, 50, 40); sun.castShadow = SH;
    sun.shadow.mapSize.set(1024, 1024); var sc2 = sun.shadow.camera; sc2.left = -60; sc2.right = 60; sc2.top = 60; sc2.bottom = -60; sc2.far = 170; sc.add(sun);
    var pl1 = new T.PointLight(0xA83FEA, 1.5, 45); pl1.position.set(0, 8, -8); sc.add(pl1);
    var pl2 = new T.PointLight(0xE65BFA, 1.3, 28); pl2.position.set(10, 4, 2); sc.add(pl2);

    /* ground, road, yard */
    var g = new T.Mesh(new T.PlaneGeometry(500, 500), mat(0x1b0f35, 1)); g.rotation.x = -Math.PI / 2; g.receiveShadow = SH; sc.add(g);
    box(44, 0.1, 30, mat(0x2a1a4a, 0.9), 0, 0.05, 2); box(500, 0.06, 8, mat(0x0d0719, 0.8), 0, 0.03, 17);
    box(500, 0.07, 0.15, C.neon, 0, 0.05, 13); box(500, 0.07, 0.15, C.neon, 0, 0.05, 21);
    for (var i = -20; i < 20; i++) box(2.4, 0.07, 0.2, C.lav, i * 6, 0.06, 17);

    /* warehouse (cutaway) */
    box(32, 0.2, 20, mat(0x23134a, 0.35, 0.1), 0, 0.1, -10);
    box(32, 10, 0.4, C.wall, 0, 5, -20); box(0.4, 10, 20, C.wall, -16, 5, -10); box(0.4, 10, 20, C.wall, 16, 5, -10);
    box(30, 0.15, 0.12, C.pink, 0, 8.6, -19.7); box(32, 1.2, 0.5, C.steel, 0, 9.4, 0); box(30, 0.1, 0.12, C.neon, 0, 8.7, 0.3);
    [-16, 0, 7.5, 12.5, 16].forEach(function (x) { box(0.5, 10, 0.5, C.steel, x, 5, 0); });
    for (i = 0; i < 6; i++) box(32, 0.3, 0.5, C.steel, 0, 10, -2 - i * 3.6);
    /* dock platform + dock door lights */
    box(6, 1.0, 3.4, mat(0x33205c, 0.7), 10, 0.55, 1.5); box(5.6, 0.06, 0.1, C.pink, 10, 1.1, 3.1);

    /* pallet builder */
    function pallet() {
      var p = new T.Group(); box(1.2, 0.15, 1, C.wood, 0, 0, 0, p);
      [[-0.28, -0.22], [0.28, -0.22], [-0.28, 0.24], [0.28, 0.24]].forEach(function (q) { box(0.52, 0.5, 0.45, C.kraft, q[0], 0.32, q[1], p); });
      sc.add(p); return p;
    }
    /* racks */
    var LV = [1.85, 3.65, 5.45], BX = [-12.7, -10.1, -7.5, -4.9], rows = LITE ? [-12] : [-12, -16];
    rows.forEach(function (rz) {
      for (var u = 0; u < 5; u++) { var ux = -14 + u * 2.6; box(0.15, 6.2, 0.15, C.steel, ux, 3.1, rz - 0.55); box(0.15, 6.2, 0.15, C.steel, ux, 3.1, rz + 0.55); }
      LV.forEach(function (ly, li) {
        box(10.4, 0.15, 0.1, C.pink, -9.3, ly - 0.15, rz - 0.55); box(10.4, 0.15, 0.1, C.pink, -9.3, ly - 0.15, rz + 0.55);
        BX.forEach(function (bx, bi) { if (rz === -12 && bi === 1 && li === 0) return; var p = pallet(); p.position.set(bx, ly, rz); });
      });
    });
    var carried = pallet(); carried.position.set(-10.1, LV[0], -12);

    /* belt texture + conveyor (L-shape: A along x, B along z) */
    var bc = d.createElement('canvas'); bc.width = 64; bc.height = 16; var cx = bc.getContext('2d');
    cx.fillStyle = '#1a0f30'; cx.fillRect(0, 0, 64, 16); cx.fillStyle = '#54218A'; for (i = 0; i < 4; i++) cx.fillRect(i * 16, 0, 5, 16);
    var bt = new T.CanvasTexture(bc); bt.wrapS = bt.wrapT = T.RepeatWrapping; bt.repeat.set(14, 1);
    var beltA = box(11.2, 0.12, 1, new T.MeshStandardMaterial({ map: bt, roughness: 0.6 }), 4.4, 1.0, -5);
    var bt2 = bt.clone(); bt2.needsUpdate = true; bt2.repeat.set(10, 1);
    var beltB = box(1, 0.12, 8.2, new T.MeshStandardMaterial({ map: bt2, roughness: 0.6 }), 10, 1.0, -0.9);
    box(11.2, 0.22, 0.08, C.lav, 4.4, 1.05, -5.55); box(11.2, 0.22, 0.08, C.lav, 4.4, 1.05, -4.45);
    box(0.08, 0.22, 8.2, C.lav, 9.45, 1.05, -0.9); box(0.08, 0.22, 8.2, C.lav, 10.55, 1.05, -0.9);
    for (i = 0; i < 5; i++) { box(0.12, 0.9, 0.9, C.steel, -0.5 + i * 2.6, 0.55, -5); } for (i = 0; i < 3; i++) box(0.9, 0.9, 0.12, C.steel, 10, 0.55, -3.2 + i * 2.8);
    var CTN = [], L = 11.2 + 8.2; for (i = 0; i < 8; i++) { var cb = box(0.7, 0.5, 0.6, C.kraft, 0, 1.31, -5); cb.visible = false; CTN.push(cb); }

    /* vehicles */
    function sideTex() {
      var c = d.createElement('canvas'); c.width = 512; c.height = 128; var x = c.getContext('2d'); x.fillStyle = 'rgba(0,0,0,0)'; x.fillRect(0, 0, 512, 128);
      x.fillStyle = '#54218A'; x.font = 'bold 54px "Times New Roman",serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('CACA LOGISTICS', 256, 64);
      var t = new T.CanvasTexture(c); return new T.MeshBasicMaterial({ map: t, transparent: true });
    }
    function wheel(par, x, y, z, r) {
      var w = new T.Group(); w.position.set(x, y, z); par.add(w);
      cyl(r, 0.4, C.dark, 0, 0, 0, w); cyl(r * 0.5, 0.42, C.lav, 0, 0, 0, w); return w;
    }
    function truck() {
      var t = new T.Group(), ws = [], lab = sideTex();
      box(2.6, 3, 9.4, C.white, 0, 2.6, -1.3, t); box(2.4, 0.35, 9.6, C.dark, 0, 0.95, -1.2, t);
      box(2.62, 0.14, 9.4, C.neon, 0, 1.75, -1.3, t); box(2.62, 0.08, 9.4, C.pink, 0, 1.9, -1.3, t);
      [1.31, -1.31].forEach(function (sx) { var p = new T.Mesh(new T.PlaneGeometry(5.4, 1.35), lab); p.position.set(sx, 3.15, -1.3); p.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2; t.add(p); });
      box(2.5, 2.4, 2.4, C.royal, 0, 1.9, 4.9, t); box(2.2, 0.9, 0.06, mat(0x0a0518, 0.1, 0.8, 0x3a1d6e, 0.6), 0, 2.45, 6.12, t);
      box(2.55, 0.3, 0.3, C.dark, 0, 0.8, 6.05, t); box(0.4, 0.2, 0.06, mat(0xffffff, 0.2, 0, 0xffffff, 2), -0.8, 1.2, 6.14, t); box(0.4, 0.2, 0.06, mat(0xffffff, 0.2, 0, 0xffffff, 2), 0.8, 1.2, 6.14, t);
      [5.0, 1.8, -3.0, -4.2].forEach(function (z) { ws.push(wheel(t, 1.2, 0.5, z, 0.5), wheel(t, -1.2, 0.5, z, 0.5)); });
      t.userData.ws = ws; sc.add(t); return t;
    }
    var truck1 = truck(), truck2 = truck();
    function forklift() {
      var f = new T.Group(), ws = [];
      box(1.1, 0.9, 1.8, C.royal, 0, 0.75, -0.2, f); box(1.1, 0.7, 0.5, C.dark, 0, 0.75, -1.1, f); box(0.9, 0.12, 0.6, C.pink, 0, 1.25, -0.2, f);
      [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.3], [0.5, 0.3]].forEach(function (q) { box(0.06, 1, 0.06, C.dark, q[0], 1.7, q[1], f); });
      box(1.2, 0.06, 1.0, C.dark, 0, 2.2, -0.1, f); box(0.08, 2.8, 0.08, C.steel, -0.35, 1.5, 1.0, f); box(0.08, 2.8, 0.08, C.steel, 0.35, 1.5, 1.0, f);
      var car = new T.Group(); f.add(car); box(1.0, 0.5, 0.06, C.steel, 0, 0.2, 1.05, car); box(0.12, 0.06, 1.3, C.dark, -0.3, -0.03, 1.7, car); box(0.12, 0.06, 1.3, C.dark, 0.3, -0.03, 1.7, car);
      ws.push(wheel(f, 0.6, 0.32, 0.35, 0.32), wheel(f, -0.6, 0.32, 0.35, 0.32), wheel(f, 0.55, 0.25, -0.95, 0.25), wheel(f, -0.55, 0.25, -0.95, 0.25));
      f.userData.ws = ws; f.userData.car = car; sc.add(f); return f;
    }
    var fk = forklift();

    /* city blocks (depth/parallax) */
    var nB = LITE ? 40 : 90, im = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), mat(0x24134a, 0.9, 0, 0x1a0c33, 0.8), nB), dm = new T.Object3D(), k = 0;
    while (k < nB) {
      var bx = (Math.random() - 0.5) * 230, bz = (Math.random() - 0.5) * 230;
      if (Math.abs(bx) < 34 && bz > -28 && bz < 30) continue; if (Math.abs(bz - 17) < 7) continue;
      var bh = 3 + Math.random() * 16; dm.position.set(bx, bh / 2, bz); dm.scale.set(4 + Math.random() * 6, bh, 4 + Math.random() * 6); dm.updateMatrix(); im.setMatrixAt(k++, dm.matrix);
    }
    sc.add(im);

    /* supply-chain network */
    var net = new T.Group(), netMats = [], HUB = new T.Vector3(10, 0.4, 8), pulses = [], curves = [];
    var NODES = [[-58, 46], [64, 52], [-72, -42], [58, -58], [4, 80]];
    function nm(c, o) { var m = new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }); netMats.push([m, o]); return m; }
    NODES.forEach(function (n, idx) {
      var e = new T.Vector3(n[0], 0.4, n[1]), mid = new T.Vector3((HUB.x + e.x) / 2, 22, (HUB.z + e.z) / 2), cu = new T.QuadraticBezierCurve3(HUB, mid, e);
      curves.push(cu); net.add(new T.Mesh(new T.TubeGeometry(cu, 48, 0.2, 6, false), nm(0xE65BFA, 0.85)));
      var r = new T.Mesh(new T.TorusGeometry(2.6, 0.18, 8, 32), nm(0xA83FEA, 0.95)); r.rotation.x = Math.PI / 2; r.position.copy(e); r.position.y = 0.5; net.add(r);
      var bm = new T.Mesh(new T.CylinderGeometry(0.35, 0.35, 16, 10, 1, true), nm(0xD9B5FF, 0.4)); bm.position.set(e.x, 8, e.z); net.add(bm);
      for (var q = 0; q < 2; q++) { var pu = new T.Mesh(new T.SphereGeometry(0.7, 10, 10), nm(0xffffff, 1)); pu.userData = { c: cu, o: q * 0.5 + idx * 0.13 }; pulses.push(pu); net.add(pu); }
    });
    var hr = new T.Mesh(new T.TorusGeometry(4, 0.22, 8, 40), nm(0xE65BFA, 0.95)); hr.rotation.x = Math.PI / 2; hr.position.set(HUB.x, 0.5, HUB.z); net.add(hr);
    sc.add(net);

    /* floating particles */
    var PN = LITE ? 120 : 320, pp = new Float32Array(PN * 3);
    for (i = 0; i < PN; i++) { pp[i * 3] = (Math.random() - 0.5) * 140; pp[i * 3 + 1] = Math.random() * 28; pp[i * 3 + 2] = (Math.random() - 0.5) * 100; }
    var pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pp, 3));
    var pts = new T.Points(pg, new T.PointsMaterial({ color: 0xD9B5FF, size: 0.4, transparent: true, opacity: 0.7, blending: T.AdditiveBlending, depthWrite: false })); sc.add(pts);

    /* camera path: 8 keyframes = 7 chapters */
    var V = function (a) { return new T.Vector3(a[0], a[1], a[2]); };
    var cpos = new T.CatmullRomCurve3([[-40, 4.5, 27], [-22, 6, 30], [-4, 5, 6], [-2, 4.5, 4], [18, 4.5, 6], [22, 5, 16], [35, 14, 45], [70, 58, 78]].map(V));
    var clook = new T.CatmullRomCurve3([[-30, 2.2, 17], [-8, 3, 8], [-10, 1.5, -8], [0, 1.2, -5], [10, 1.5, -1], [10, 2.5, 5], [20, 0, 10], [2, 0, 0]].map(V));

    /* helpers */
    var cl = function (x) { return Math.max(0, Math.min(1, x)); }, ss = function (x) { x = cl(x); return x * x * (3 - 2 * x); };
    var FK = [[0, -10.1, -4, Math.PI, 0.15], [0.25, -10.1, -10.3, Math.PI, 0.15], [0.4, -10.1, -10.3, Math.PI, 1.57], [0.5, -10.1, -10.3, Math.PI, 1.57],
      [0.62, -10.1, -6.5, Math.PI, 0.45], [0.78, -10.1, -5, Math.PI / 2, 0.45], [1, -3.3, -5, Math.PI / 2, 1.2]];
    function fkAt(f) {
      for (var j = 0; j < FK.length - 1; j++) if (f <= FK[j + 1][0]) { var a = FK[j], b = FK[j + 1], t = ss((f - a[0]) / (b[0] - a[0])); return a.map(function (v, n) { return n ? v + (b[n] - v) * t : v; }); }
      return FK[FK.length - 1];
    }
    var last = { f: null, t1: null, t2: null };
    function spin(o, x, z, key) {
      var p = last[key]; if (p) { var dx = x - p[0], dz = z - p[1], s = Math.sqrt(dx * dx + dz * dz) * (dx * Math.sin(o.rotation.y) + dz * Math.cos(o.rotation.y) >= 0 ? 1 : -1);
        o.userData.ws.forEach(function (w) { w.rotation.x += s / 0.5; }); } last[key] = [x, z];
    }
    var ease = function (x) { return 1 - Math.pow(1 - cl(x), 3); };
    var nCh = -1, lookV = new T.Vector3(), mx = 0, my = 0, P = 0, target = 0, sway = 0;

    function setCh(i) {
      if (i === nCh) return; nCh = i;
      var up = function () { $('cc-step').textContent = '0' + (i + 1) + ' / 07'; $('cc-title').textContent = CH[i][0]; $('cc-text').textContent = CH[i][1]; };
      if (G && !STATIC) G.timeline().to('.cc-cap', { opacity: 0, y: 8, duration: 0.18, onComplete: up }).to('.cc-cap', { opacity: 1, y: 0, duration: 0.45 }); else up();
    }

    function update(p, tm) {
      /* truck 1: tiba di kawasan industri */
      var x1 = -60 + 44 * ease(p / 0.14); truck1.position.set(x1, 0, 17); truck1.rotation.y = Math.PI / 2; spin(truck1, x1, 17, 't1');
      /* forklift & pallet */
      var f = cl((p - 0.2) / 0.229), a = fkAt(f);
      fk.position.set(a[1], Y0, a[2]); fk.rotation.y = a[3]; fk.userData.car.position.y = a[4]; spin(fk, a[1], a[2], 'f');
      if (f >= 0.4 && f < 1) carried.position.set(a[1] + Math.sin(a[3]) * 1.7, Y0 + a[4] + 0.08, a[2] + Math.cos(a[3]) * 1.7);
      else if (f < 0.4) carried.position.set(-10.1, LV[0], -12);
      carried.visible = f < 1;
      /* conveyor -> dock loading */
      var fl = cl((p - 0.429) / 0.285), run = fl > 0 && fl < 1;
      bt.offset.x = -fl * 40; bt2.offset.x = -fl * 40;
      CTN.forEach(function (c, n) {
        var s = fl * (L + 22.5) - n * 3, v = fl > 0 && fl < 1 && s >= 0 && s < L + 1; c.visible = v;
        if (v) { if (s < 11.2) c.position.set(-1.2 + s, 1.31, -5); else c.position.set(10, 1.31, -5 + (s - 11.2)); }
      });
      /* truck 2: keluar dari gudang */
      var tt = cl((p - 0.714) / 0.143), x2, z2, y2;
      if (tt < 0.35) { var u = ss(tt / 0.35); x2 = 10; z2 = 9 + 8 * u; y2 = Math.PI / 2 * u; } else { x2 = 10 + (tt - 0.35) / 0.65 * 90; z2 = 17; y2 = Math.PI / 2; }
      truck2.position.set(x2, 0, z2); truck2.rotation.y = y2; spin(truck2, x2, z2, 't2');
      /* network */
      var na = ss((p - 0.8) / 0.15); net.visible = na > 0.01;
      netMats.forEach(function (m) { m[0].opacity = m[1] * na; });
      pulses.forEach(function (q) { q.position.copy(q.userData.c.getPoint((tm * 0.12 + q.userData.o) % 1)); });
      pl2.intensity = 1.1 + Math.sin(tm * 3) * 0.3;
      /* particles */
      for (var i2 = 0; i2 < PN; i2++) { var yy = pp[i2 * 3 + 1] + 0.004; pp[i2 * 3 + 1] = yy > 28 ? 0 : yy; } pg.attributes.position.needsUpdate = true;
      /* camera */
      cam.position.copy(cpos.getPoint(p)); lookV.copy(clook.getPoint(p));
      cam.position.x += mx * 1.4; cam.position.y += -my * 0.7 + Math.sin(tm * 0.6) * 0.12; cam.lookAt(lookV);
      $('cc-bar').style.width = (p * 100).toFixed(1) + '%'; setCh(Math.min(6, Math.floor(p * 7)));
    }

    function rs() {
      var st = cv.parentNode, w = st.clientWidth || 1, h = st.clientHeight || 1;
      ren.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < 1 ? 64 : 46; cam.updateProjectionMatrix();
    }
    W.addEventListener('resize', function () { rs(); if (STATIC) { update(0.97, 0); ren.render(sc, cam); } });
    rs();

    /* progress dari scroll (GSAP ScrollTrigger; fallback manual) */
    if (!STATIC) {
      if (G && W.ScrollTrigger) { G.registerPlugin(W.ScrollTrigger); W.ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', onUpdate: function (s) { target = s.progress; } }); }
      else W.addEventListener('scroll', function () { var r = sec.getBoundingClientRect(); target = cl(-r.top / (r.height - W.innerHeight)); }, { passive: true });
      d.addEventListener('pointermove', function (e) { mx = e.clientX / W.innerWidth - 0.5; my = e.clientY / W.innerHeight - 0.5; }, { passive: true });
    }
    $('cc-skip').addEventListener('click', function () { var h = $('home'); if (h) h.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }); });

    if (STATIC) { update(0.97, 0); ren.render(sc, cam); return; }
    var vis = true, prev = performance.now();
    if ('IntersectionObserver' in W) new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }).observe(sec);
    (function loop(now) {
      requestAnimationFrame(loop);
      var dt = Math.min(0.1, (now - prev) / 1000); prev = now;
      if (!vis || d.hidden) return;
      P += (target - P) * (1 - Math.exp(-dt * 5));
      update(P, now / 1000); ren.render(sc, cam);
    })(prev);
  }

 function boot() {
    initIntro();
    initHub();

    var sceneStarted = false;

    function startScene() {
        if (sceneStarted) return;
        sceneStarted = true;

        try {
            initScene();
        } catch (err) {
            console.warn('3D scene dinonaktifkan:', err);
            var s = $('cc-cinema');
            if (s) fallback(s);
        }
    }

    var cinema = $('cc-cinema');

    if (cinema && 'IntersectionObserver' in W) {
        var sceneObserver = new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting) {
                sceneObserver.disconnect();
                startScene();
            }
        }, {
            rootMargin: '350px 0px'
        });

        sceneObserver.observe(cinema);
    } else {
        W.setTimeout(startScene, 2500);
    }
}

if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}

})();