import * as pc from 'playcanvas';
import './style.css';

const canvas = document.querySelector('#scene');
const loading = document.querySelector('#loading');
const loadingText = document.querySelector('#loading-text');

function showError(error) {
  console.error(error);
  loading.classList.add('error');
  loadingText.textContent = `Unable to load the scenery. ${String(error)}`;
}

async function start() {
  const app = new pc.Application(canvas, {
    graphicsDeviceOptions: { antialias: false, alpha: false, powerPreference: 'high-performance' }
  });
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  window.addEventListener('resize', () => app.resizeCanvas());
  app.start();

  const camera = new pc.Entity('Camera');
  camera.addComponent('camera', {
    clearColor: new pc.Color(0, 0, 0),
    fov: 72,
    nearClip: 0.01,
    farClip: 100000
  });
  app.root.addChild(camera);

  const asset = new pc.Asset('Chinese scenery', 'gsplat', { url: '/scenery.sog' });
  app.assets.add(asset);
  await new Promise((resolve, reject) => {
    asset.once('load', resolve);
    asset.once('error', reject);
    app.assets.load(asset);
  });

  const scenery = new pc.Entity('Scenery');
  scenery.addComponent('gsplat', { asset });
  scenery.setEulerAngles(0, 0, 180);
  app.root.addChild(scenery);

  const bounds = asset.resource?.aabb;
  const center = bounds?.center?.clone() ?? new pc.Vec3();
  const extent = bounds?.halfExtents;
  const radius = Math.max(extent?.x ?? 1, extent?.y ?? 1, extent?.z ?? 1, 0.1);
  // This capture's visible ground is around Y=1; the bounds extend far below it.
  center.y = 5;
  const state = {
    pivot: center.clone(),
    yaw: 180,
    pitch: -10,
    distance: radius * 0.75,
    speed: Math.max(radius * 0.8, 0.25)
  };
  const current = {
    pivot: center.clone(),
    yaw: state.yaw,
    pitch: state.pitch,
    distance: state.distance
  };
  const keys = new Set();
  const pointers = new Map();
  let previousPinch = 0;

  canvas.tabIndex = 0;
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  canvas.addEventListener('pointerdown', event => {
    canvas.focus();
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, button: event.button });
    previousPinch = 0;
  });
  canvas.addEventListener('pointermove', event => {
    const prior = pointers.get(event.pointerId);
    if (!prior) return;
    const dx = event.clientX - prior.x;
    const dy = event.clientY - prior.y;
    prior.x = event.clientX;
    prior.y = event.clientY;

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const pinch = Math.hypot(a.x - b.x, a.y - b.y);
      if (previousPinch) state.distance *= Math.exp((previousPinch - pinch) * 0.004);
      previousPinch = pinch;
    } else if (prior.button === 2 || event.shiftKey) {
      const scale = state.distance * 0.0015;
      state.pivot.add(camera.right.clone().mulScalar(-dx * scale));
      state.pivot.add(camera.up.clone().mulScalar(dy * scale));
    } else {
      state.yaw -= dx * 0.18;
      state.pitch = pc.math.clamp(state.pitch - dy * 0.18, -89, 89);
    }
  });
  const endPointer = event => {
    pointers.delete(event.pointerId);
    previousPinch = 0;
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    state.distance *= Math.exp(event.deltaY * 0.001);
    state.distance = Math.max(0.01, state.distance);
  }, { passive: false });
  window.addEventListener('keydown', event => keys.add(event.code));
  window.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  app.on('update', dt => {
    const move = new pc.Vec3();
    if (keys.has('KeyW') || keys.has('ArrowUp')) move.add(camera.forward);
    if (keys.has('KeyS') || keys.has('ArrowDown')) move.sub(camera.forward);
    if (keys.has('KeyD') || keys.has('ArrowRight')) move.add(camera.right);
    if (keys.has('KeyA') || keys.has('ArrowLeft')) move.sub(camera.right);
    if (keys.has('KeyE') || keys.has('Space')) move.add(pc.Vec3.UP);
    if (keys.has('KeyQ') || keys.has('ControlLeft')) move.sub(pc.Vec3.UP);
    if (move.lengthSq() > 0) {
      move.normalize().mulScalar(state.speed * dt * (keys.has('ShiftLeft') ? 3 : 1));
      state.pivot.add(move);
    }

    const blend = 1 - Math.exp(-dt * 12);
    current.pivot.lerp(current.pivot, state.pivot, blend);
    current.yaw += (state.yaw - current.yaw) * blend;
    current.pitch += (state.pitch - current.pitch) * blend;
    current.distance += (state.distance - current.distance) * blend;
    camera.setEulerAngles(current.pitch, current.yaw, 0);
    camera.setPosition(current.pivot.clone().sub(camera.forward.clone().mulScalar(current.distance)));
  });

  requestAnimationFrame(() => loading.classList.add('ready'));
}

start().catch(showError);
