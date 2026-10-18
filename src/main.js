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
  loadingText.textContent = `Unable to load the flight scene. ${String(error)}`;
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

  const camera = new pc.Entity('Follow camera');
  camera.addComponent('camera', {
    clearColor: new pc.Color(0, 0, 0),
    fov: 68,
    nearClip: 0.05,
    farClip: 100000
  });
  app.root.addChild(camera);

  const phoenixLight = new pc.Entity('Soft daylight');
  phoenixLight.addComponent('light', {
    type: 'directional',
    color: new pc.Color(1, 0.92, 0.78),
    intensity: 1.4,
    castShadows: false
  });
  phoenixLight.setEulerAngles(38, 25, 0);
  app.root.addChild(phoenixLight);

  const sceneryAsset = new pc.Asset('Chinese scenery', 'gsplat', { url: '/scenery.sog' });
  const phoenixAsset = new pc.Asset('Phoenix', 'container', { url: phoenixUrl });
  await Promise.all([loadAsset(app, sceneryAsset), loadAsset(app, phoenixAsset)]);

  const scenery = new pc.Entity('Chinese scenery');
  scenery.addComponent('gsplat', { asset: sceneryAsset });
  scenery.setRotation(SCENE_TURN);
  app.root.addChild(scenery);

  const phoenix = new pc.Entity('Phoenix flight rig');
  const phoenixModel = phoenixAsset.resource.instantiateRenderEntity({ castShadows: false });
  phoenixModel.setLocalScale(2.4, 2.4, 2.4);
  const phoenixLayer = new pc.Layer({ name: 'Phoenix player' });
  app.scene.layers.push(phoenixLayer);
  camera.camera.layers = [...camera.camera.layers, phoenixLayer.id];
  phoenixModel.findComponents('render').forEach(render => {
    render.layers = [phoenixLayer.id];
    render.meshInstances.forEach(meshInstance => {
      meshInstance.material = meshInstance.material.clone();
      meshInstance.material.depthTest = false;
      meshInstance.material.depthWrite = false;
      meshInstance.material.update();
    });
  });
  phoenix.addChild(phoenixModel);
  app.root.addChild(phoenix);

  const toWorld = local => SCENE_TURN.transformVector(local);
  const route = {
    radiusX: 4,
    radiusZ: 2.5,
    centerZ: 9,
    height: -8.3
  };
  const routePoint = phase => toWorld(new pc.Vec3(
    -route.radiusX * (1 - Math.cos(phase)),
    route.height + 0.18 * Math.sin(phase * 2),
    route.centerZ - route.radiusZ * Math.sin(phase)
  ));
  const routeTangent = phase => routePoint(phase + 0.001).sub(routePoint(phase - 0.001)).normalize();

  let phase = 0;
  let speed = 1.35;
  let lateralOffset = 0;
  let lateralVelocity = 0;
  const keys = new Set();
  const keyCodes = new Set(['KeyW', 'ArrowUp', 'KeyS', 'ArrowDown', 'KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight']);
  window.addEventListener('keydown', event => {
    if (keyCodes.has(event.code)) event.preventDefault();
    if (!event.repeat) keys.add(event.code);
  });
  window.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  const playerPosition = routePoint(phase);
  const forward = routeTangent(phase);
  const cameraPosition = playerPosition.clone().sub(forward.clone().mulScalar(4.5));
  const cameraTarget = playerPosition.clone().add(forward.clone().mulScalar(5.5)).sub(pc.Vec3.UP.clone().mulScalar(1.5));
  phoenix.setPosition(playerPosition);
  phoenix.setEulerAngles(0, 0, 0);
  camera.setPosition(cameraPosition);
  camera.lookAt(cameraTarget);

  app.on('update', rawDt => {
    const dt = Math.min(rawDt, 0.05);
    const forwardInput = Number(keys.has('KeyW') || keys.has('ArrowUp'));
    const reverseInput = Number(keys.has('KeyS') || keys.has('ArrowDown'));
    const steerInput = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));

    // The route keeps moving at cruise speed; throttle and steering ease in/out.
    const targetSpeed = pc.math.clamp(1.35 + forwardInput * 2.8 - reverseInput * 2.7, -1.35, 4.4);
    speed += (targetSpeed - speed) * (1 - Math.exp(-1.8 * dt));
    phase += speed * dt / 6.2;

    const spring = 8;
    const damping = 5.5;
    lateralVelocity += (steerInput * 2.6 - lateralOffset) * spring * dt - lateralVelocity * damping * dt;
    lateralOffset = pc.math.clamp(lateralOffset + lateralVelocity * dt, -3, 3);

    const centerline = routePoint(phase);
    const routeForward = routeTangent(phase);
    const routeRight = new pc.Vec3(routeForward.z, 0, -routeForward.x).normalize();
    const travelForward = routeForward.clone().mulScalar(Math.sign(speed || 1));
    const playerTarget = centerline.add(routeRight.mulScalar(lateralOffset));
    const blend = 1 - Math.exp(-5 * dt);
    playerPosition.lerp(playerPosition, playerTarget, blend);
    forward.lerp(forward, travelForward, 1 - Math.exp(-4 * dt)).normalize();

    phoenix.setPosition(playerPosition);
    const yaw = Math.atan2(forward.x, forward.z) * pc.math.RAD_TO_DEG;
    phoenix.setEulerAngles(0, yaw, -steerInput * 7);

    const cameraDesired = playerPosition.clone()
      .sub(forward.clone().mulScalar(4.5));
    const lookDesired = playerPosition.clone()
      .add(forward.clone().mulScalar(5.5))
      .sub(pc.Vec3.UP.clone().mulScalar(1.5));
    cameraPosition.lerp(cameraPosition, cameraDesired, 1 - Math.exp(-3.2 * dt));
    cameraTarget.lerp(cameraTarget, lookDesired, 1 - Math.exp(-4.2 * dt));
    camera.setPosition(cameraPosition);
    camera.lookAt(cameraTarget);
  });

  requestAnimationFrame(() => loading.classList.add('ready'));
}

start().catch(showError);
