import * as pc from 'playcanvas';
import './style.css';

const canvas = document.querySelector('#scene');
const loading = document.querySelector('#loading');
const loadingText = document.querySelector('#loading-text');
const SCENE_TURN = new pc.Quat().setFromEulerAngles(0, 0, 180);
const phoenixUrl = new URL('../Chinise City 2nd Project/3D Model Phoenix GLB.glb', import.meta.url).href;

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

  const phoenixLight = new pc.Entity('Phoenix daylight');
  phoenixLight.addComponent('light', {
    type: 'directional',
    color: new pc.Color(1, 0.94, 0.84),
    intensity: 1.7,
    castShadows: false
  });
  phoenixLight.setEulerAngles(35, 25, 0);
  app.root.addChild(phoenixLight);

  const sceneryAsset = new pc.Asset('Chinese scenery', 'gsplat', { url: '/scenery.sog' });
  const phoenixAsset = new pc.Asset('Phoenix', 'container', { url: phoenixUrl });
  await Promise.all([loadAsset(app, sceneryAsset), loadAsset(app, phoenixAsset)]);

  const scenery = new pc.Entity('Chinese scenery');
  scenery.addComponent('gsplat', { asset: sceneryAsset });
  scenery.setRotation(SCENE_TURN);
  app.root.addChild(scenery);

  const phoenix = new pc.Entity('Sky Phoenix');
  const phoenixModel = phoenixAsset.resource.instantiateRenderEntity({ castShadows: false });
  phoenixModel.setLocalScale(4, 4, 4);
  const phoenixLayer = new pc.Layer({ name: 'Sky Phoenix' });
  app.scene.layers.push(phoenixLayer);
  camera.camera.layers = [...camera.camera.layers, phoenixLayer.id];
  phoenixModel.findComponents('render').forEach(render => {
    render.layers = [phoenixLayer.id];
  });
  phoenix.addChild(phoenixModel);
  app.root.addChild(phoenix);

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
  const pointerTarget = { x: 0, y: 0 };
  const pointerCurrent = { x: 0, y: 0 };

  canvas.addEventListener('pointermove', event => {
    const rect = canvas.getBoundingClientRect();
    pointerTarget.x = pc.math.clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1);
    pointerTarget.y = pc.math.clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1);
  });
  canvas.addEventListener('pointerleave', () => {
    pointerTarget.x = 0;
    pointerTarget.y = 0;
  });

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
    // Hover changes where the camera looks, without moving it off the river.
    localLookAhead.set(x - 12, pointerCurrent.y * 2.5, 4 + pointerCurrent.x * 6);
    transform.transformPoint(localPosition, worldPosition);
    transform.transformPoint(localLookAhead, worldLookAhead);
    camera.setPosition(worldPosition);
    camera.lookAt(worldLookAhead);
  }

  function placePhoenix() {
    const position = camera.getPosition().clone()
      .add(camera.forward.clone().mulScalar(18))
      .add(camera.up.clone().mulScalar(7 - pointerCurrent.y))
      .add(camera.right.clone().mulScalar(-pointerCurrent.x * 5));
    phoenix.setPosition(position);
    phoenix.lookAt(camera.getPosition());
    phoenix.rotateLocal(0, pointerCurrent.x * 12, -pointerCurrent.x * 16);
  }

  placeCamera(0);
  placePhoenix();
  app.on('update', () => {
    const now = performance.now();
    const dt = (now - previousFrame) / 1000;
    previousFrame = now;
    const pointerBlend = 1 - Math.exp(-dt * 4);
    pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * pointerBlend;
    pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * pointerBlend;
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
    placePhoenix();
  });

  requestAnimationFrame(() => loading.classList.add('ready'));
}

start().catch(showError);
