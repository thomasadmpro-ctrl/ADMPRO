/* ==========================================================================
   ADMPHONE — vignettes WebGL (Three.js)
   Un plan, deux textures, une transition par déplacement radial partant du
   curseur. La distorsion culmine au milieu du morphing puis se résorbe : on
   ne voit pas l'effet, on voit le verre se réparer.
   Chargé à la demande, seulement si le WebGL est disponible et le mouvement
   autorisé. Sans lui, la grille reste une grille d'images.
   ========================================================================== */
(function () {
  'use strict';

  if (typeof THREE === 'undefined' || typeof gsap === 'undefined') return;

  var VERT = [
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D uTex0;',
    'uniform sampler2D uTex1;',
    'uniform vec2 uPlane;',
    'uniform vec2 uImage;',
    'uniform vec2 uMouse;',
    'uniform float uProgress;',
    'uniform float uHover;',
    'uniform float uTime;',

    /* cadrage « cover » : l'image n'est jamais déformée par le format */
    'vec2 cover(vec2 uv) {',
    '  float pa = uPlane.x / uPlane.y;',
    '  float ia = uImage.x / uImage.y;',
    '  vec2 r = vec2(min(pa / ia, 1.0), min(ia / pa, 1.0));',
    '  return vec2(uv.x * r.x + (1.0 - r.x) * 0.5, uv.y * r.y + (1.0 - r.y) * 0.5);',
    '}',

    'void main() {',
    '  vec2 uv = cover(vUv);',
    '  vec2 dir = vUv - uMouse;',
    '  float d = length(dir);',
    /* onde partant du point survolé */
    '  float ripple = smoothstep(0.75, 0.0, d);',
    /* amplitude maximale à mi-transition, nulle aux deux extrémités */
    '  float amp = uProgress * (1.0 - uProgress) * 4.0;',
    '  vec2 n = normalize(dir + vec2(1e-5));',
    /* respiration discrète tant que le curseur reste posé */
    '  float breathe = sin(uTime * 1.6 + d * 9.0) * 0.5 + 0.5;',
    '  vec2 off = n * ripple * (amp * 0.055 + uHover * breathe * 0.004);',
    '  vec4 a = texture2D(uTex0, uv + off * 0.75);',
    '  vec4 b = texture2D(uTex1, uv - off * 0.75);',
    '  float m = smoothstep(0.0, 1.0, uProgress);',
    '  vec4 col = mix(a, b, m);',
    /* éclat très léger sur la crête de l'onde — le verre attrape la lumière */
    '  col.rgb += ripple * amp * 0.10;',
    '  gl_FragColor = col;',
    '}'
  ].join('\n');

  /* On charge les images nous-mêmes plutôt que via TextureLoader : celui-ci
     demande les fichiers en CORS anonyme, ce qui échoue quand la page est
     ouverte en file:// (double-clic sur index.html). Les textures sont de
     même origine et on ne relit jamais leurs pixels : aucun CORS nécessaire. */
  function load(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () {
        var t = new THREE.Texture(img);
        t.colorSpace = THREE.SRGBColorSpace;
        t.minFilter = THREE.LinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
        t.needsUpdate = true;
        resolve(t);
      };
      img.onerror = function () { reject(new Error('texture: ' + url)); };
      img.src = url;
    });
  }

  function Tile(el) {
    this.el = el;
    this.hovered = false;
    this.dirty = true;
    this.ready = false;
    this.uniforms = null;
    this.init();
  }

  Tile.prototype.init = function () {
    var self = this;
    var before = this.el.getAttribute('data-before');
    var after = this.el.getAttribute('data-after');
    if (!before || !after) return;

    Promise.all([load(before), load(after)]).then(function (tex) {
      var rect = self.el.getBoundingClientRect();
      var w = Math.max(1, rect.width), h = Math.max(1, rect.height);

      self.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });
      self.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      self.renderer.setSize(w, h, false);

      var canvas = self.renderer.domElement;
      canvas.setAttribute('aria-hidden', 'true');
      self.el.appendChild(canvas);

      self.scene = new THREE.Scene();
      self.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 10);
      self.camera.position.z = 1;

      var img = tex[0].image;
      self.uniforms = {
        uTex0: { value: tex[0] },
        uTex1: { value: tex[1] },
        uPlane: { value: new THREE.Vector2(w, h) },
        uImage: { value: new THREE.Vector2(img.naturalWidth || 1200, img.naturalHeight || 1500) },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uProgress: { value: 0 },
        uHover: { value: 0 },
        uTime: { value: 0 }
      };

      var mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: self.uniforms })
      );
      self.scene.add(mesh);

      self.ready = true;
      self.el.classList.add('is-gl');
      self.bind();
      self.render();

      /* On ne fait confiance au rendu qu'une fois vérifié : les textures sont
         des JPEG opaques, un pixel transparent signifie que rien n'a été
         dessiné. Dans ce cas on rend la main à l'image du DOM. */
      if (!self.verify()) {
        self.ready = false;
        self.el.classList.remove('is-gl');
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        self.renderer.dispose();
        document.dispatchEvent(new CustomEvent('admphone:gl-failed'));
      }
    }).catch(function (err) {
      /* L'image du DOM reste affichée : la grille demeure lisible. On trace la
         cause en console plutôt que de l'avaler. */
      if (window.console && console.warn) console.warn('[admphone] vignette WebGL indisponible :', err);
    });
  };

  Tile.prototype.bind = function () {
    var self = this;

    function toUV(e) {
      var r = self.el.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) / r.width,
        y: 1.0 - (e.clientY - r.top) / r.height
      };
    }

    function enter(e) {
      if (e && e.clientX !== undefined) {
        var p = toUV(e);
        self.uniforms.uMouse.value.set(p.x, p.y);
      }
      self.hovered = true;
      gsap.to(self.uniforms.uProgress, { value: 1, duration: 1.1, ease: 'power2.inOut', onUpdate: function () { self.dirty = true; } });
      gsap.to(self.uniforms.uHover, { value: 1, duration: 0.6, onUpdate: function () { self.dirty = true; } });
      gsap.to(self.el, { scale: 1.012, duration: 0.9, ease: 'power3.out' });
    }

    function leave() {
      self.hovered = false;
      gsap.to(self.uniforms.uProgress, { value: 0, duration: 1.0, ease: 'power2.inOut', onUpdate: function () { self.dirty = true; } });
      gsap.to(self.uniforms.uHover, { value: 0, duration: 0.6, onUpdate: function () { self.dirty = true; } });
      gsap.to(self.el, { scale: 1, duration: 0.9, ease: 'power3.out' });
    }

    this.el.addEventListener('mouseenter', enter);
    this.el.addEventListener('mouseleave', leave);
    this.el.addEventListener('mousemove', function (e) {
      if (!self.hovered) return;
      var p = toUV(e);
      gsap.to(self.uniforms.uMouse.value, { x: p.x, y: p.y, duration: 0.6, ease: 'power2.out', onUpdate: function () { self.dirty = true; } });
    });

    /* clavier et tactile : même lecture, sans curseur */
    this.el.addEventListener('focus', function () { enter(); });
    this.el.addEventListener('blur', leave);
    this.el.addEventListener('touchstart', function () {
      self.uniforms.uProgress.value > 0.5 ? leave() : enter();
    }, { passive: true });

    /* redimensionnement */
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        var r = self.el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;
        self.renderer.setSize(r.width, r.height, false);
        self.uniforms.uPlane.value.set(r.width, r.height);
        self.dirty = true;
      }).observe(this.el);
    }

    /* on ne dessine pas ce qui est hors de l'écran */
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        self.visible = entries[0].isIntersecting;
      }, { rootMargin: '120px' }).observe(this.el);
    } else {
      self.visible = true;
    }
  };

  /* Le premier rendu a-t-il produit quelque chose d'opaque ? */
  Tile.prototype.verify = function () {
    try {
      var gl = this.renderer.getContext();
      var px = new Uint8Array(4);
      gl.readPixels(Math.floor(this.renderer.domElement.width / 2),
                    Math.floor(this.renderer.domElement.height / 2),
                    1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return px[3] > 8;
    } catch (e) { return false; }
  };

  Tile.prototype.render = function () {
    if (!this.ready) return;
    if (this.visible !== false && (this.dirty || this.hovered)) {
      this.uniforms.uTime.value = performance.now() / 1000;
      this.renderer.render(this.scene, this.camera);
      this.dirty = this.hovered;
    }
  };

  var tiles = Array.prototype.slice.call(document.querySelectorAll('[data-tile]')).map(function (el) {
    return new Tile(el);
  });

  gsap.ticker.add(function () {
    for (var i = 0; i < tiles.length; i++) tiles[i].render();
  });
})();
