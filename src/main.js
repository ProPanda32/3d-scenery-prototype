import * as pc from 'playcanvas';
import './style.css';

const canvas = document.querySelector('#scene');
const loading = document.querySelector('#loading');
const loadingText = document.querySelector('#loading-text');
const SCENE_TURN = new pc.Quat().setFromEulerAngles(0, 180, 0);

function showError(error) {
  console.error(error);
  loading.classList.add('error');
  loadingText.textContent = `Unable to load the scenery. ${String(error)}`;
}

const loadAsset = (app, asset) => new Promise((resolve, reject) => {
  asset.once('load', resolve);
  asset.once('error', reject);
  app.assets.add(asset);
  app.assets.load(asset);
});

async function start() {
  const app = new pc.Application(canvas, {
    graphicsDeviceOptions: { antialias: false, alpha: false, powerPreference: 'high-performance' }
  });
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  window.addEventListener('resize', () => app.resizeCanvas());
  app.scene.ambientLight = new pc.Color(0.55, 0.58, 0.62);
  app.start();

  const camera = new pc.Entity('Scenery camera');
  camera.addComponent('camera', {
    clearColor: new pc.Color(0, 0, 0),
    fov: 68,
    nearClip: 0.05,
    farClip: 100000
  });
  app.root.addChild(camera);

  const sceneryAsset = new pc.Asset('Chinese scenery', 'gsplat', { url: '/scenery.sog' });
  await loadAsset(app, sceneryAsset);

  const scenery = new pc.Entity('Chinese scenery');
  scenery.addComponent('gsplat', { asset: sceneryAsset });
  scenery.setRotation(SCENE_TURN);
  app.root.addChild(scenery);

  const bounds = sceneryAsset.resource.aabb;
  const localTarget = bounds.center.clone();
  // Start well inside the splat's measured bounds, looking horizontally through
  // its center toward the valley. Keep this deliberately independent of input.
  const localCamera = localTarget.clone().add(new pc.Vec3(0, 0, -8));
  const localAim = localTarget.clone().add(new pc.Vec3(0, -4, 0));
  const transform = scenery.getWorldTransform();
  const pivot = transform.transformPoint(localAim);
  const initialPosition = transform.transformPoint(localCamera);
  camera.setPosition(initialPosition);
  camera.lookAt(pivot);
  const initialAngles = camera.getEulerAngles();
  camera.setEulerAngles(initialAngles.x, initialAngles.y, 180);
  const state = { pivot: pivot.clone(), yaw: initialAngles.y, pitch: initialAngles.x, distance: initialPosition.distance(pivot) };
  const current = { pivot: pivot.clone(), yaw: state.yaw, pitch: state.pitch, distance: state.distance };
  const pointers = new Map();
  let lastPinch = 0;
  canvas.tabIndex = 0;
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  canvas.addEventListener('pointerdown', event => {
    canvas.focus();
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, button: event.button });
    lastPinch = 0;
  });
  canvas.addEventListener('pointermove', event => {
    const pointer = pointers.get(event.pointerId);
    if (!pointer) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const pinch = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastPinch) state.distance *= Math.exp((lastPinch - pinch) * 0.004);
      lastPinch = pinch;
    } else if (pointer.button === 2 || event.shiftKey) {
      const scale = state.distance * 0.0015;
      state.pivot.add(camera.right.clone().mulScalar(-dx * scale));
      state.pivot.add(camera.up.clone().mulScalar(dy * scale));
    } else {
      state.yaw -= dx * 0.18;
      state.pitch = pc.math.clamp(state.pitch - dy * 0.18, -89, 89);
    }
  });
  const releasePointer = event => {
    pointers.delete(event.pointerId);
    lastPinch = 0;
  };
  canvas.addEventListener('pointerup', releasePointer);
  canvas.addEventListener('pointercancel', releasePointer);
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    state.distance = Math.max(0.1, state.distance * Math.exp(event.deltaY * 0.001));
  }, { passive: false });

  app.on('update', dt => {
    const blend = 1 - Math.exp(-dt * 10);
    current.pivot.lerp(current.pivot, state.pivot, blend);
    current.yaw += (state.yaw - current.yaw) * blend;
    current.pitch += (state.pitch - current.pitch) * blend;
    current.distance += (state.distance - current.distance) * blend;
    camera.setEulerAngles(current.pitch, current.yaw, 180);
    camera.setPosition(current.pivot.clone().sub(camera.forward.clone().mulScalar(current.distance)));
  });

  requestAnimationFrame(() => loading.classList.add('ready'));
}

start().catch(showError);
