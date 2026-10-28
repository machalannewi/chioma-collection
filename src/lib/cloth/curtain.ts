// The hero curtain: a cloth simulation (cloth.worker.ts) drawn with three.js
// in a pixel-space orthographic scene, lit like a stage from the upper left.
// Client-only.
import * as THREE from 'three';
import { makeFabric } from '../fabric';
import type { FromWorker, Grab, Shape, Stage, ToWorker } from './types';

// Shared with the page's timelines: GSAP tweens `open`, scroll drives `close`.
export const STAGE: Stage = { open: 1, close: 0, pointerX: -9999, pointerY: -9999, moveX: 0, moveY: 0 };
// GSAP tags tweened objects with its own (uncloneable) cache, so copy just the numbers.
const snapshot = (): Stage => {
  const { open, close, pointerX, pointerY, moveX, moveY } = STAGE;
  return { open, close, pointerX, pointerY, moveX, moveY };
};

const REPEAT = 104;        // px of cloth per texture tile
const CORD = 5.5;          // radius of the rolled leading hem
const CORD_SIDES = 10;
const GRAB = { catch: 36, hand: 90, reach: 320, hold: 260 };
const NO_GRAB: Grab = { index: -1, dx: 0, dy: 0, held: [] };

// Stitched hem along the leading edge: a doubled band, its turned-under ledge,
// a running stitch in cream thread, and a lit lip where the cloth folds over.
function hemShader(shader: { fragmentShader: string }) {
  shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
    {
      float fromEdge = vMapUv.x * ${REPEAT.toFixed(1)};
      float along = vMapUv.y * ${REPEAT.toFixed(1)};
      float band = 1.0 - smoothstep(15.5, 17.5, fromEdge);
      float ledge = exp(-pow((fromEdge - 18.0) / 1.3, 2.0));
      float stitchLine = exp(-pow((fromEdge - 12.0) / 0.6, 2.0));
      float dash = step(0.36, fract(along / 7.0));
      float lip = 1.0 - smoothstep(0.0, 3.5, fromEdge);
      diffuseColor.rgb *= 1.0 - 0.16 * band - 0.45 * ledge;
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.6 + 0.05, lip * 0.6);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.86, 0.68), stitchLine * dash * 0.85);
    }`);
}

interface ClothState {
  W: number; H: number; cols: number; rows: number; dy: number; restWidth: number;
  pos: Float32Array; grab: Grab;
}

export interface CurtainOptions { mobile?: boolean; still?: boolean }

export class Curtain {
  private readonly section: HTMLElement;
  private readonly still: boolean;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(0, 1, 0, -1, -4000, 4000);
  private readonly key = new THREE.DirectionalLight('#fff4e8', 3.2);
  private readonly rim = new THREE.DirectionalLight('#9fb4ff', 0.45); // cool bounce off the backdrop
  private readonly clothMat: THREE.MeshStandardMaterial;
  private readonly cordMat: THREE.MeshStandardMaterial;
  private readonly shape: Shape;
  private readonly cols: number;
  private readonly rows: number;
  private readonly frame = { t: new THREE.Vector3(), n: new THREE.Vector3(), b: new THREE.Vector3(), inward: new THREE.Vector3() };
  private readonly clock = new THREE.Clock();

  private cloth: ClothState | null = null;
  private mesh: THREE.Mesh | null = null;
  private cord: THREE.Mesh | null = null;
  private worker: Worker | null = null;
  private sim = { busy: true, fresh: false, shown: false, buf: null as Float32Array | null, pending: 0 };
  private visible = true;
  private raf = 0;
  private grabbing = false;
  private grabFrom: [number, number] = [0, 0];
  private pointerId: number | null = null;
  private holdTimer = 0;
  private touchAt: [number, number] | null = null;
  private resizeTimer = 0;
  private lastSize: [number, number];
  private readonly observer: IntersectionObserver;
  private readonly cleanups: (() => void)[] = [];

  constructor(section: HTMLElement, { mobile = false, still = false }: CurtainOptions = {}) {
    this.section = section;
    this.still = still;
    this.shape = { cover: mobile ? 0.7 : 1, closed: -0.03, phase: 0, tie: 0.42 };
    this.cols = mobile ? 34 : 60;
    this.rows = mobile ? 46 : 74;

    const holder = section.querySelector<HTMLElement>('.cu-canvas')!;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    holder.appendChild(this.renderer.domElement);

    this.camera.position.set(0, 0, 1000);
    const hemi = new THREE.HemisphereLight('#ffe6d8', '#000000', 0.5);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.bias = -0.0008;
    this.key.shadow.normalBias = 1.5;
    this.scene.add(hemi, this.key, this.key.target, this.rim);

    const { colour, relief } = makeFabric();
    const tex = (canvas: HTMLCanvasElement, srgb: boolean) => {
      const t = new THREE.CanvasTexture(canvas);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      return t;
    };
    const map = tex(colour, true);
    const bump = tex(relief, false);
    this.clothMat = new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 0.8, side: THREE.DoubleSide, roughness: 0.72 });
    this.clothMat.onBeforeCompile = hemShader;
    this.cordMat = new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 0.5, roughness: 0.62 });

    this.lastSize = [section.clientWidth, section.clientHeight];
    this.observer = new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; });
    this.observer.observe(section);

    this.bindPointer();
    this.build();
    this.tick();

    const onResize = () => {
      window.clearTimeout(this.resizeTimer);
      this.resizeTimer = window.setTimeout(() => {
        const W = section.clientWidth, H = section.clientHeight;
        // Mobile toolbars nudge the height while scrolling; only rebuild for real changes.
        if (W === this.lastSize[0] && Math.abs(H - this.lastSize[1]) < 120) return;
        this.lastSize = [W, H];
        this.build();
      }, 200);
    };
    this.listen(window, 'resize', onResize);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.clearTimeout(this.resizeTimer);
    window.clearTimeout(this.holdTimer);
    this.observer.disconnect();
    this.cleanups.forEach((off) => off());
    this.worker?.terminate();
    this.mesh?.geometry.dispose();
    this.cord?.geometry.dispose();
    this.clothMat.map?.dispose();
    this.clothMat.bumpMap?.dispose();
    this.clothMat.dispose();
    this.cordMat.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private listen<K extends keyof HTMLElementEventMap>(
    target: HTMLElement | Window, type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions,
  ) {
    target.addEventListener(type, fn as EventListener, opts);
    this.cleanups.push(() => target.removeEventListener(type, fn as EventListener, opts));
  }

  private build() {
    const { section, camera, key, rim, cols, rows, shape } = this;
    const W = section.clientWidth;
    const H = section.clientHeight;
    this.renderer.setSize(W, H);
    camera.left = 0; camera.right = W; camera.top = 0; camera.bottom = -H;
    camera.updateProjectionMatrix();

    // Light from the upper left, aimed at the middle of the drape.
    const tx = W * 0.75, ty = -H * 0.5;
    key.position.set(tx - 1700, ty + 900, 650);
    key.target.position.set(tx, ty, 0);
    key.target.updateMatrixWorld();
    const shadowCam = key.shadow.camera;
    shadowCam.left = -W; shadowCam.right = W; shadowCam.top = H; shadowCam.bottom = -H;
    shadowCam.updateProjectionMatrix();
    rim.position.set(tx + 900, ty - 200, 700);

    if (this.mesh && this.cord) {
      this.scene.remove(this.mesh, this.cord);
      this.mesh.geometry.dispose();
      this.cord.geometry.dispose();
    }
    this.worker?.terminate();

    const restWidth = (1.04 - shape.closed) * W;
    const dy = (H * 1.4 + 70) / (rows - 1);
    this.cloth = { W, H, cols, rows, dy, restWidth, pos: new Float32Array(cols * rows * 3), grab: NO_GRAB };

    // Cloth sheet. UVs are in tiles of REPEAT px so the weave keeps its size on any screen.
    const geo = new THREE.BufferGeometry();
    const uv = new Float32Array(cols * rows * 2);
    const index: number[] = [];
    const uMax = restWidth / REPEAT, vMax = dy * (rows - 1) / REPEAT;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        uv.set([c / (cols - 1) * uMax, (1 - r / (rows - 1)) * vMax], (r * cols + c) * 2);
        if (r < rows - 1 && c < cols - 1) {
          const i = r * cols + c;
          index.push(i, i + cols, i + 1, i + 1, i + cols, i + cols + 1);
        }
      }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cols * rows * 3), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(index);
    const mesh = new THREE.Mesh(geo, this.clothMat);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.visible = false;

    // Rolled hem: a tube that follows the leading column.
    const cgeo = new THREE.BufferGeometry();
    const ring = CORD_SIDES + 1;
    const cuv = new Float32Array(rows * ring * 2);
    const cindex: number[] = [];
    for (let r = 0; r < rows; r++) {
      for (let s = 0; s <= CORD_SIDES; s++) {
        cuv.set([s / CORD_SIDES * Math.PI * 2 * CORD / REPEAT, (1 - r / (rows - 1)) * vMax], (r * ring + s) * 2);
        if (r < rows - 1 && s < CORD_SIDES) {
          const i = r * ring + s, j = i + ring;
          cindex.push(i, i + 1, j, i + 1, j + 1, j);
        }
      }
    }
    cgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rows * ring * 3), 3));
    cgeo.setAttribute('uv', new THREE.BufferAttribute(cuv, 2));
    cgeo.setIndex(cindex);
    const cord = new THREE.Mesh(cgeo, this.cordMat);
    cord.castShadow = true;
    cord.frustumCulled = false;
    cord.visible = false;
    this.scene.add(mesh, cord);
    this.mesh = mesh;
    this.cord = cord;

    this.sim = { busy: true, fresh: false, shown: false, buf: null, pending: 0 };
    const worker = new Worker(new URL('./cloth.worker.ts', import.meta.url));
    worker.onmessage = (e: MessageEvent<FromWorker>) => {
      this.cloth?.pos.set(e.data.buf);
      Object.assign(this.sim, { buf: e.data.buf, busy: false, fresh: true });
    };
    const init: ToWorker = { type: 'init', W, H, cols, rows, shape, stage: snapshot() };
    worker.postMessage(init);
    this.worker = worker;
  }

  private syncGeometry() {
    const { cloth, mesh, cord, rows, cols } = this;
    if (!cloth || !mesh || !cord) return;
    const { pos } = cloth;
    const attr = mesh.geometry.attributes.position as THREE.BufferAttribute;
    (attr.array as Float32Array).set(pos);
    attr.needsUpdate = true;
    mesh.geometry.computeVertexNormals();

    // Build a frame per row along the leading edge and sweep a circle through it.
    const normals = mesh.geometry.attributes.normal.array as Float32Array;
    const out = cord.geometry.attributes.position.array as Float32Array;
    const { t, n, b, inward } = this.frame;
    for (let r = 0; r < rows; r++) {
      const i = r * cols * 3;
      const up = Math.max(0, r - 1) * cols * 3, down = Math.min(rows - 1, r + 1) * cols * 3;
      t.set(pos[down] - pos[up], pos[down + 1] - pos[up + 1], pos[down + 2] - pos[up + 2]).normalize();
      n.set(normals[i], normals[i + 1], normals[i + 2]);
      inward.set(pos[i] - pos[i + 3], pos[i + 1] - pos[i + 4], pos[i + 2] - pos[i + 5]);
      b.crossVectors(t, n).normalize();
      if (b.dot(inward) < 0) b.negate();
      n.crossVectors(b, t).normalize();
      const cx = pos[i] + b.x * CORD * 0.55, cy = pos[i + 1] + b.y * CORD * 0.55, cz = pos[i + 2] + b.z * CORD * 0.55;
      for (let s = 0; s <= CORD_SIDES; s++) {
        const a = s / CORD_SIDES * Math.PI * 2;
        const cs = Math.cos(a) * CORD, sn = Math.sin(a) * CORD;
        out.set([cx + n.x * cs + b.x * sn, cy + n.y * cs + b.y * sn, cz + n.z * cs + b.z * sn], (r * (CORD_SIDES + 1) + s) * 3);
      }
    }
    cord.geometry.attributes.position.needsUpdate = true;
    cord.geometry.computeVertexNormals();
  }

  // ---- Pointer: brush past, or press and hold to grab a handful of cloth.

  private nearest(x: number, y: number) {
    if (!this.cloth) return -1;
    const { pos, cols: C, rows: R } = this.cloth;
    let best = -1, bestD = GRAB.catch * GRAB.catch;
    for (let i = C; i < Math.floor(R * 0.82) * C; i++) {
      const d = (pos[i * 3] - x) ** 2 + (pos[i * 3 + 1] + y) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  private local(e: { clientX: number; clientY: number }): [number, number] {
    const rect = this.section.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  private startGrab(x: number, y: number) {
    const cloth = this.cloth;
    const hit = this.nearest(x, y);
    if (!cloth || hit < 0) return false;
    const { pos } = cloth;
    const held: Grab['held'] = [];
    for (let i = cloth.cols; i < Math.floor(cloth.rows * 0.82) * cloth.cols; i++) {
      const d = Math.hypot(pos[i * 3] - pos[hit * 3], pos[i * 3 + 1] - pos[hit * 3 + 1]);
      if (d < GRAB.hand) {
        const k = 1 - d / GRAB.hand;
        held.push({ p: i, x: pos[i * 3], y: pos[i * 3 + 1], z: pos[i * 3 + 2], w: k * k * (3 - 2 * k) });
      }
    }
    cloth.grab = { index: hit, dx: 0, dy: 0, held };
    this.grabFrom = [x, y];
    this.grabbing = true;
    this.section.classList.add('is-grabbing');
    this.section.dataset.cursor = 'pull';
    return true;
  }

  private moveGrab(x: number, y: number) {
    if (!this.cloth) return;
    let dx = x - this.grabFrom[0], dy = -(y - this.grabFrom[1]);
    const d = Math.hypot(dx, dy);
    if (d > GRAB.reach) { dx *= GRAB.reach / d; dy *= GRAB.reach / d; }
    this.cloth.grab = { ...this.cloth.grab, dx, dy };
  }

  private endGrab = () => {
    if (!this.grabbing) return;
    this.grabbing = false;
    if (this.cloth) this.cloth.grab = NO_GRAB;
    this.section.classList.remove('is-grabbing');
    delete this.section.dataset.cursor;
    if (this.pointerId !== null && this.section.hasPointerCapture(this.pointerId)) this.section.releasePointerCapture(this.pointerId);
    this.pointerId = null;
  };

  private bindPointer() {
    const { section } = this;
    this.listen(section, 'pointermove', (e) => {
      const [x, y] = this.local(e);
      if (STAGE.pointerX > -9000) { STAGE.moveX += x - STAGE.pointerX; STAGE.moveY += y - STAGE.pointerY; }
      STAGE.pointerX = x; STAGE.pointerY = y;
      if (this.grabbing) { this.moveGrab(x, y); return; }
      if (this.still || e.pointerType !== 'mouse') return;
      if (!(e.target as Element).closest('a, button') && this.nearest(x, y) >= 0) section.dataset.cursor = 'grab';
      else delete section.dataset.cursor;
    });
    this.listen(section, 'pointerleave', () => {
      STAGE.moveX = STAGE.moveY = 0;
      STAGE.pointerX = STAGE.pointerY = -9999;
      if (!this.grabbing) delete section.dataset.cursor;
    });
    this.listen(section, 'pointerdown', (e) => {
      if (this.still || e.pointerType !== 'mouse' || e.button !== 0 || (e.target as Element).closest('a, button')) return;
      const [x, y] = this.local(e);
      if (this.startGrab(x, y)) {
        e.preventDefault();
        this.pointerId = e.pointerId;
        section.setPointerCapture(e.pointerId);
      }
    });
    this.listen(window, 'pointerup', this.endGrab);
    this.listen(window, 'pointercancel', this.endGrab);
    this.listen(window, 'blur', this.endGrab);

    // Touch: press and hold to take hold of the cloth, otherwise let the page scroll.
    this.listen(section, 'touchstart', (e) => {
      if (this.still || e.touches.length !== 1) return;
      const t = e.touches[0];
      this.touchAt = [t.clientX, t.clientY];
      this.holdTimer = window.setTimeout(() => {
        if (!this.touchAt) return;
        const [x, y] = this.local({ clientX: this.touchAt[0], clientY: this.touchAt[1] });
        if (this.startGrab(x, y)) navigator.vibrate?.(8);
      }, GRAB.hold);
    }, { passive: true });
    this.listen(section, 'touchmove', (e) => {
      const t = e.touches[0];
      if (this.grabbing) {
        e.preventDefault();
        this.moveGrab(...this.local(t));
      } else if (this.touchAt && Math.hypot(t.clientX - this.touchAt[0], t.clientY - this.touchAt[1]) > 10) {
        window.clearTimeout(this.holdTimer);
        this.touchAt = null;
      }
    }, { passive: false });
    const touchEnd = () => { window.clearTimeout(this.holdTimer); this.touchAt = null; this.endGrab(); };
    this.listen(section, 'touchend', touchEnd);
    this.listen(section, 'touchcancel', touchEnd);
  }

  // ---- Loop: only while the hero is on screen.

  private tick = () => {
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(this.clock.getDelta(), 0.1);
    // Pointer velocity fades quickly, so a still mouse stops sweeping.
    const fade = Math.exp(-dt * 9);
    STAGE.moveX *= fade; STAGE.moveY *= fade;
    const { sim, cloth, worker } = this;
    if (!this.visible || !cloth || !worker) return;

    sim.pending += dt;
    if (!sim.busy && sim.buf) {
      const msg: ToWorker = {
        type: 'tick', dt: sim.pending, time: this.clock.elapsedTime, still: this.still,
        stage: snapshot(), grab: cloth.grab, buf: sim.buf,
      };
      worker.postMessage(msg, [sim.buf.buffer]);
      Object.assign(sim, { buf: null, busy: true, pending: 0 });
    }
    if (sim.fresh && this.mesh && this.cord) {
      sim.fresh = false;
      sim.shown = true;
      this.mesh.visible = this.cord.visible = true;
      this.syncGeometry();
    }
    if (sim.shown) this.renderer.render(this.scene, this.camera);
  };
}
