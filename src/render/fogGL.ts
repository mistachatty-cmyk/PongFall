// Physics fog as a fragment shader. Domain-warped fbm noise, advected by the wind and the fall,
// sheared by the arena's motion, stirred by impacts, and lit by the eyes' glow. Render-only.
// Falls back to null (the Canvas blob fog is used) when WebGL is unavailable.

export interface Stir { x: number; y: number; s: number }
export interface Glow { x: number; y: number; r: number; k: number }
export interface FogPass {
  view: [number, number]; zoom: number; cam: [number, number]
  time: number; scroll: number; wind: number; speed: number
  par: number; density: number; scale: number
  arena: [number, number]; arenaV: [number, number]; arenaHalf: [number, number]; clear: number
  tint: [number, number, number]
  stirs: Stir[]; glows: Glow[]
}
export interface FogGL { render(p: FogPass): HTMLCanvasElement; destroy(): void }

const VERT = `attribute vec2 aPos; varying vec2 vUv; void main(){ vUv = aPos*0.5+0.5; vUv.y = 1.0 - vUv.y; gl_Position = vec4(aPos,0.0,1.0); }`
const FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec2 uView; uniform float uZoom; uniform vec2 uCam;
uniform float uTime, uScroll, uWind, uSpeed, uPar, uDensity, uScale, uClear;
uniform vec2 uArena, uArenaV, uArenaHalf;
uniform vec3 uTint;
uniform vec3 uStir[6];
uniform vec4 uGlow[3];
float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.03+vec2(17.1,9.7); a*=0.5; } return s; }
void main(){
  vec2 px = vUv * uView;
  vec2 w = (px - uView*0.5)/uZoom + uCam;
  vec2 p = w;
  p.y += uScroll * uPar;
  p.x += uWind * (0.35 + uPar*0.6);
  vec2 d = w - uArena;
  p -= uArenaV * exp(-dot(d,d)/(520.0*520.0)) * 0.7;
  for(int i=0;i<6;i++){
    vec2 s = w - uStir[i].xy; float k = exp(-dot(s,s)/(300.0*300.0));
    p -= normalize(s + vec2(0.001)) * uStir[i].z * k;
  }
  vec2 q = p * (0.0034 * uScale);
  q.y *= 1.0 / (1.0 + uSpeed*1.1);                       // streaked along the fall
  vec2 warp = vec2(fbm(q*1.6 + uTime*0.035), fbm(q*1.3 - uTime*0.028 + 7.7));
  float n = fbm(q + warp*0.9);
  float dens = smoothstep(0.36, 0.86, n);
  float vy = clamp(px.y/uView.y, 0.0, 1.0);
  dens *= (0.5 + 0.8*vy) * uDensity;
  vec2 a = abs(w - uArena) / uArenaHalf;                  // keep the arena readable
  dens *= 1.0 - uClear * (1.0 - smoothstep(0.85, 1.35, max(a.x, a.y)));
  float glow = 0.0;
  for(int i=0;i<3;i++){ vec2 g = w - uGlow[i].xy; glow += uGlow[i].w * exp(-dot(g,g)/(uGlow[i].z*uGlow[i].z)); }
  vec3 col = mix(uTint*0.65, uTint*1.2, n) + vec3(0.25,0.7,1.0)*glow*0.9;
  float alpha = clamp(dens + glow*0.35, 0.0, 0.92);
  gl_FragColor = vec4(col*alpha, alpha);
}`

export function createFogGL(): FogGL | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  const gl = (canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: false }) ?? null) as WebGLRenderingContext | null
  if (!gl) return null
  const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null }
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) return null
  const prog = gl.createProgram()!
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  gl.useProgram(prog)
  const buf = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const aPos = gl.getAttribLocation(prog, 'aPos')
  gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
  const U = (n: string) => gl.getUniformLocation(prog, n)
  const loc = { view: U('uView'), zoom: U('uZoom'), cam: U('uCam'), time: U('uTime'), scroll: U('uScroll'), wind: U('uWind'), speed: U('uSpeed'), par: U('uPar'), density: U('uDensity'), scale: U('uScale'), clear: U('uClear'), arena: U('uArena'), arenaV: U('uArenaV'), arenaHalf: U('uArenaHalf'), tint: U('uTint'), stir: U('uStir'), glow: U('uGlow') }
  const stirBuf = new Float32Array(18), glowBuf = new Float32Array(12)
  const RES = 0.4

  return {
    render(p) {
      const W = Math.max(2, Math.round(p.view[0] * RES)), H = Math.max(2, Math.round(p.view[1] * RES))
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H }
      gl.viewport(0, 0, W, H)
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(loc.view, p.view[0], p.view[1]); gl.uniform1f(loc.zoom, p.zoom); gl.uniform2f(loc.cam, p.cam[0], p.cam[1])
      gl.uniform1f(loc.time, p.time); gl.uniform1f(loc.scroll, p.scroll); gl.uniform1f(loc.wind, p.wind); gl.uniform1f(loc.speed, p.speed)
      gl.uniform1f(loc.par, p.par); gl.uniform1f(loc.density, p.density); gl.uniform1f(loc.scale, p.scale); gl.uniform1f(loc.clear, p.clear)
      gl.uniform2f(loc.arena, p.arena[0], p.arena[1]); gl.uniform2f(loc.arenaV, p.arenaV[0], p.arenaV[1]); gl.uniform2f(loc.arenaHalf, Math.max(1, p.arenaHalf[0]), Math.max(1, p.arenaHalf[1]))
      gl.uniform3f(loc.tint, p.tint[0], p.tint[1], p.tint[2])
      stirBuf.fill(0); p.stirs.slice(0, 6).forEach((s, i) => { stirBuf[i * 3] = s.x; stirBuf[i * 3 + 1] = s.y; stirBuf[i * 3 + 2] = s.s })
      gl.uniform3fv(loc.stir, stirBuf)
      glowBuf.fill(0); glowBuf[2] = glowBuf[6] = glowBuf[10] = 1
      p.glows.slice(0, 3).forEach((g, i) => { glowBuf[i * 4] = g.x; glowBuf[i * 4 + 1] = g.y; glowBuf[i * 4 + 2] = Math.max(1, g.r); glowBuf[i * 4 + 3] = g.k })
      gl.uniform4fv(loc.glow, glowBuf)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      return canvas
    },
    destroy() { gl.getExtension('WEBGL_lose_context')?.loseContext() },
  }
}
