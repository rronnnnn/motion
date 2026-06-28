/* ============================================================
   Threads — self-contained WebGL animated Perlin-noise threads.
   Ported from the React/OGL component to raw WebGL. No modules.
   Usage: new Threads(containerEl, { color, amplitude, distance, enableMouseInteraction })
   ============================================================ */
(function () {
  'use strict';

  var VERT = [
    'attribute vec2 position;',
    'attribute vec2 uv;',
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = vec4(position, 0.0, 1.0);',
    '}'
  ].join('\n');

  /* Fragment shader — copied verbatim from the spec. Do not rewrite. */
  var FRAG = [
    'precision highp float;',
    'uniform float iTime;',
    'uniform vec3 iResolution;',
    'uniform vec3 uColor;',
    'uniform float uAmplitude;',
    'uniform float uDistance;',
    'uniform vec2 uMouse;',
    '#define PI 3.1415926538',
    'const int u_line_count = 20;',
    'const float u_line_width = 7.0;',
    'const float u_line_blur = 10.0;',
    'float Perlin2D(vec2 P) {',
    '  vec2 Pi = floor(P);',
    '  vec4 Pf_Pfmin1 = P.xyxy - vec4(Pi, Pi + 1.0);',
    '  vec4 Pt = vec4(Pi.xy, Pi.xy + 1.0);',
    '  Pt = Pt - floor(Pt * (1.0 / 71.0)) * 71.0;',
    '  Pt += vec2(26.0, 161.0).xyxy;',
    '  Pt *= Pt;',
    '  Pt = Pt.xzxz * Pt.yyww;',
    '  vec4 hash_x = fract(Pt * (1.0 / 951.135664));',
    '  vec4 hash_y = fract(Pt * (1.0 / 642.949883));',
    '  vec4 grad_x = hash_x - 0.49999;',
    '  vec4 grad_y = hash_y - 0.49999;',
    '  vec4 grad_results = inversesqrt(grad_x * grad_x + grad_y * grad_y)',
    '    * (grad_x * Pf_Pfmin1.xzxz + grad_y * Pf_Pfmin1.yyww);',
    '  grad_results *= 1.4142135623730950;',
    '  vec2 blend = Pf_Pfmin1.xy * Pf_Pfmin1.xy * Pf_Pfmin1.xy',
    '    * (Pf_Pfmin1.xy * (Pf_Pfmin1.xy * 6.0 - 15.0) + 10.0);',
    '  vec4 blend2 = vec4(blend, vec2(1.0 - blend));',
    '  return dot(grad_results, blend2.zxzx * blend2.wwyy);',
    '}',
    'float pixel(float count, vec2 resolution) {',
    '  return (1.0 / max(resolution.x, resolution.y)) * count;',
    '}',
    'float lineFn(vec2 st, float width, float perc, float offset, vec2 mouse, float time, float amplitude, float distance) {',
    '  float split_offset = (perc * 0.4);',
    '  float split_point = 0.1 + split_offset;',
    '  float amplitude_normal = smoothstep(split_point, 0.7, st.x);',
    '  float amplitude_strength = 0.5;',
    '  float finalAmplitude = amplitude_normal * amplitude_strength * amplitude * (1.0 + (mouse.y - 0.5) * 0.2);',
    '  float time_scaled = time / 10.0 + (mouse.x - 0.5) * 1.0;',
    '  float blur = smoothstep(split_point, split_point + 0.05, st.x) * perc;',
    '  float xnoise = mix(',
    '    Perlin2D(vec2(time_scaled, st.x + perc) * 2.5),',
    '    Perlin2D(vec2(time_scaled, st.x + time_scaled) * 3.5) / 1.5,',
    '    st.x * 0.3',
    '  );',
    '  float y = 0.5 + (perc - 0.5) * distance + xnoise / 2.0 * finalAmplitude;',
    '  float line_start = smoothstep(',
    '    y + (width / 2.0) + (u_line_blur * pixel(1.0, iResolution.xy) * blur),',
    '    y, st.y',
    '  );',
    '  float line_end = smoothstep(',
    '    y,',
    '    y - (width / 2.0) - (u_line_blur * pixel(1.0, iResolution.xy) * blur),',
    '    st.y',
    '  );',
    '  return clamp((line_start - line_end) * (1.0 - smoothstep(0.0, 1.0, pow(perc, 0.3))), 0.0, 1.0);',
    '}',
    'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
    '  vec2 uv = fragCoord / iResolution.xy;',
    '  float line_strength = 1.0;',
    '  for (int i = 0; i < u_line_count; i++) {',
    '    float p = float(i) / float(u_line_count);',
    '    line_strength *= (1.0 - lineFn(uv, u_line_width * pixel(1.0, iResolution.xy) * (1.0 - p), p, (PI * 1.0) * p, uMouse, iTime, uAmplitude, uDistance));',
    '  }',
    '  float colorVal = 1.0 - line_strength;',
    '  fragColor = vec4(uColor * colorVal, colorVal);',
    '}',
    'void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }'
  ].join('\n');

  var MAX_DIM = 1280;

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('Threads shader compile error:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function Threads(container, options) {
    options = options || {};
    this.container = container;
    this.color = options.color || [0.788, 0.663, 0.431];
    this.amplitude = options.amplitude != null ? options.amplitude : 1;
    this.distance = options.distance != null ? options.distance : 0;
    this.enableMouseInteraction = !!options.enableMouseInteraction;

    this.mouse = [0.5, 0.5];
    this.targetMouse = [0.5, 0.5];
    this.raf = null;
    this.startTime = performance.now();
    this.lastFrame = 0;
    this.isVisible = true;
    this._destroyed = false;

    // --- Canvas ---
    var canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    this.canvas = canvas;
    container.appendChild(canvas);

    var gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: true
    }) || canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false });

    if (!gl) {
      console.warn('Threads: WebGL not available.');
      this._noGl = true;
      return;
    }
    this.gl = gl;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // --- Program ---
    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Threads program link error:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);
    this.program = prog;

    // --- Geometry: fullscreen quad (two triangles covering clip space) ---
    var positions = new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
    ]);
    var uvs = new Float32Array([
      0, 0, 1, 0, 0, 1,
      0, 1, 1, 0, 1, 1
    ]);

    this.posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    this.posLoc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(this.posLoc);
    gl.vertexAttribPointer(this.posLoc, 2, gl.FLOAT, false, 0, 0);

    this.uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
    this.uvLoc = gl.getAttribLocation(prog, 'uv');
    if (this.uvLoc !== -1) {
      gl.enableVertexAttribArray(this.uvLoc);
      gl.vertexAttribPointer(this.uvLoc, 2, gl.FLOAT, false, 0, 0);
    }

    // --- Uniforms ---
    this.u = {
      iTime: gl.getUniformLocation(prog, 'iTime'),
      iResolution: gl.getUniformLocation(prog, 'iResolution'),
      uColor: gl.getUniformLocation(prog, 'uColor'),
      uAmplitude: gl.getUniformLocation(prog, 'uAmplitude'),
      uDistance: gl.getUniformLocation(prog, 'uDistance'),
      uMouse: gl.getUniformLocation(prog, 'uMouse')
    };
    gl.uniform3f(this.u.uColor, this.color[0], this.color[1], this.color[2]);
    gl.uniform1f(this.u.uAmplitude, this.amplitude);
    gl.uniform1f(this.u.uDistance, this.distance);
    gl.uniform2f(this.u.uMouse, this.mouse[0], this.mouse[1]);

    this.resize();

    // --- Observers ---
    this._ro = new ResizeObserver(this.resize.bind(this));
    this._ro.observe(container);

    this._io = new IntersectionObserver(function (entries) {
      this.isVisible = !!(entries[0] && entries[0].isIntersecting);
      if (this.isVisible) this.play();
      else this.stop();
    }.bind(this), { threshold: 0 });
    this._io.observe(container);

    // --- Mouse ---
    if (this.enableMouseInteraction) {
      this._onMove = this._onMove.bind(this);
      this._onLeave = this._onLeave.bind(this);
      container.addEventListener('mousemove', this._onMove);
      container.addEventListener('mouseleave', this._onLeave);
    }

    this.play();
  }

  Threads.prototype.resize = function () {
    if (this._destroyed || !this.gl) return;
    var gl = this.gl;
    var dpr = Math.min(window.devicePixelRatio || 1, 1);
    var cw = this.container.clientWidth || 1;
    var ch = this.container.clientHeight || 1;
    var rw = Math.max(1, Math.floor(cw * dpr));
    var rh = Math.max(1, Math.floor(ch * dpr));
    // Cap maximum render dimension at 1920px.
    var scale = Math.min(1, MAX_DIM / Math.max(rw, rh));
    rw = Math.max(1, Math.floor(rw * scale));
    rh = Math.max(1, Math.floor(rh * scale));
    this.canvas.width = rw;
    this.canvas.height = rh;
    gl.viewport(0, 0, rw, rh);
    if (this.u && this.u.iResolution) {
      gl.uniform3f(this.u.iResolution, rw, rh, 1);
    }
  };

  Threads.prototype._onMove = function (e) {
    var rect = this.container.getBoundingClientRect();
    var x = (e.clientX - rect.left) / rect.width;
    var y = 1.0 - (e.clientY - rect.top) / rect.height;
    this.targetMouse = [x, y];
  };

  Threads.prototype._onLeave = function () {
    this.targetMouse = [0.5, 0.5];
  };

  Threads.prototype._frame = function () {
    if (this._destroyed || !this.gl) return;
    this.raf = requestAnimationFrame(this._frame.bind(this));

    // Skip all work while off-screen (isVisible is driven by the IntersectionObserver).
    if (!this.isVisible) return;

    // Throttle to ~30fps.
    var t = performance.now();
    if (t - this.lastFrame < 32) return;
    this.lastFrame = t;

    var gl = this.gl;

    // Mouse smoothing: lerp toward target at 0.05 per frame.
    if (this.enableMouseInteraction) {
      this.mouse[0] += (this.targetMouse[0] - this.mouse[0]) * 0.05;
      this.mouse[1] += (this.targetMouse[1] - this.mouse[1]) * 0.05;
      gl.uniform2f(this.u.uMouse, this.mouse[0], this.mouse[1]);
    }

    gl.uniform1f(this.u.iTime, (t - this.startTime) / 1000);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  Threads.prototype.play = function () {
    if (this._destroyed || this._noGl) return;
    if (!this.raf) this._frame();
  };

  Threads.prototype.stop = function () {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  };

  Threads.prototype.destroy = function () {
    this._destroyed = true;
    this.stop();
    if (this._ro) this._ro.disconnect();
    if (this._io) this._io.disconnect();
    if (this.enableMouseInteraction && this.container) {
      this.container.removeEventListener('mousemove', this._onMove);
      this.container.removeEventListener('mouseleave', this._onLeave);
    }
    var gl = this.gl;
    if (gl) {
      try {
        if (this.posBuf) gl.deleteBuffer(this.posBuf);
        if (this.uvBuf) gl.deleteBuffer(this.uvBuf);
        if (this.program) gl.deleteProgram(this.program);
        var ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      } catch (e) { /* noop */ }
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.gl = null;
  };

  window.Threads = Threads;
})();
