import * as pc from 'playcanvas';
import './style.css';

const canvas = document.querySelector('#scene');
const loading = document.querySelector('#loading');
const loadingText = document.querySelector('#loading-text');
const SCENE_TURN = new pc.Quat().setFromEulerAngles(0, 0, 180);

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

  const transform = scenery.getWorldTransform();
  const localPosition = new pc.Vec3();
  const localLookAhead = new pc.Vec3();
  const worldPosition = new pc.Vec3();
  const worldLookAhead = new pc.Vec3();
  const journeySeconds = 24;
  let elapsed = 0;
  let transition = 'journey';
  let transitionTime = 0;
  let previousFrame = performance.now();

  // The river runs toward negative local X. These endpoints were checked in
  // the rendered capture; the camera stays over its open center corridor.
  function placeCamera(seconds) {
    // Two second acceleration and deceleration, with a steady pace between.
    const distance = seconds < 2
      ? seconds * seconds / 4
      : seconds <= journeySeconds - 2
        ? seconds - 1
        : journeySeconds - 2 - (journeySeconds - seconds) ** 2 / 4;
    const x = -12 * distance / (journeySeconds - 2);
    localPosition.set(x, 0, 0);
    localLookAhead.set(x - 12, 0, 4);
    transform.transformPoint(localPosition, worldPosition);
    transform.transformPoint(localLookAhead, worldLookAhead);
    camera.setPosition(worldPosition);
    camera.lookAt(worldLookAhead);
    const angles = camera.getEulerAngles();
    camera.setEulerAngles(angles.x, angles.y, 180);
  }

  placeCamera(0);
  app.on('update', () => {
    const now = performance.now();
    const dt = (now - previousFrame) / 1000;
    previousFrame = now;
    if (transition === 'journey') {
      elapsed = Math.min(elapsed + dt, journeySeconds);
      placeCamera(elapsed);
      if (elapsed === journeySeconds) {
        transition = 'fadeOut';
        transitionTime = 0;
        loading.classList.add('journey-reset');
        loading.classList.remove('ready');
      }
    } else {
      transitionTime += dt;
      if (transitionTime >= 0.75 && transition === 'fadeOut') {
        elapsed = 0;
        placeCamera(0);
        transition = 'fadeIn';
        transitionTime = 0;
        loading.classList.add('ready');
      } else if (transitionTime >= 0.75 && transition === 'fadeIn') {
        transition = 'journey';
        loading.classList.remove('journey-reset');
      }
    }
  });

  requestAnimationFrame(() => loading.classList.add('ready'));
}

start().catch(showError);
