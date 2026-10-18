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
  phoenix.addChild(phoenixModel);
  app.root.addChild(phoenix);

  // Fly a straight river corridor through the captured volume. At the far end,
  // move the single splat back under the Phoenix so the scenery itself loops.
  const bounds = sceneryAsset.resource.aabb;
  const startZ = bounds.center.z - 2;
  const endZ = bounds.center.z + bounds.halfExtents.z - 4;
  const loopLength = endZ - startZ;
  const corridor = {
    x: bounds.center.x,
    y: bounds.center.y,
    startZ,
    endZ,
    length: loopLength
  };
  const sceneryOffset = new pc.Vec3();
  let distanceTravelled = 0;
  let lap = 0;
  let speed = 2.1;
  let lateralOffset = 0;
  let lateralVelocity = 0;
  let heading = SCENE_TURN.transformVector(new pc.Vec3(0, 0, 1)).normalize();
  const keys = new Set();
  const keyCodes = new Set(['KeyW', 'ArrowUp', 'KeyS', 'ArrowDown', 'KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight']);
  canvas.tabIndex = 0;
  canvas.addEventListener('pointerdown', () => canvas.focus());
  window.addEventListener('keydown', event => {
    if (keyCodes.has(event.code)) event.preventDefault();
    keys.add(event.code);
  });
  window.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  const localPlayerPosition = new pc.Vec3(corridor.x, corridor.y, corridor.startZ);
  const playerPosition = scenery.getWorldTransform().transformPoint(localPlayerPosition);
  const cameraPosition = playerPosition.clone().sub(heading.clone().mulScalar(4.5)).add(pc.Vec3.UP.clone().mulScalar(1.1));
  const cameraTarget = playerPosition.clone().add(heading.clone().mulScalar(3.5)).sub(pc.Vec3.UP.clone().mulScalar(0.4));
  phoenix.setPosition(playerPosition);
  phoenix.setEulerAngles(0, Math.atan2(heading.x, heading.z) * pc.math.RAD_TO_DEG, 0);
  camera.setPosition(cameraPosition);
  camera.lookAt(cameraTarget);

  app.on('update', rawDt => {
    const dt = rawDt;
    const forwardInput = Number(keys.has('KeyW') || keys.has('ArrowUp'));
    const reverseInput = Number(keys.has('KeyS') || keys.has('ArrowDown'));
    const steerInput = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));

    const targetSpeed = pc.math.clamp(2.1 + forwardInput * 3.4 - reverseInput * 2.1, 0, 6.2);
    speed += (targetSpeed - speed) * (1 - Math.exp(-3.2 * dt));
    distanceTravelled += speed * dt;

    const desiredLateralVelocity = steerInput * 4.2 - lateralOffset * 0.7;
    lateralVelocity += (desiredLateralVelocity - lateralVelocity) * (1 - Math.exp(-4.5 * dt));
    lateralOffset = pc.math.clamp(lateralOffset + lateralVelocity * dt, -6, 6);
    if (Math.abs(lateralOffset) >= 6) lateralVelocity = 0;

    const nextLap = Math.floor(distanceTravelled / loopLength);
    if (nextLap !== lap) {
      sceneryOffset.copy(SCENE_TURN.transformVector(new pc.Vec3(0, 0, nextLap * loopLength)));
      scenery.setPosition(sceneryOffset);
      lap = nextLap;
    }
    const localZ = corridor.startZ + (distanceTravelled % loopLength);
    localPlayerPosition.set(corridor.x + lateralOffset, corridor.y, localZ);
    const worldTransform = scenery.getWorldTransform();
    worldTransform.transformPoint(localPlayerPosition, playerPosition);

    const localFlightDirection = new pc.Vec3(lateralVelocity * Number(speed > 0.01), 0, Math.max(speed, 0.01)).normalize();
    const desiredHeading = SCENE_TURN.transformVector(localFlightDirection).normalize();
    heading.lerp(heading, desiredHeading, 1 - Math.exp(-2.8 * dt)).normalize();
    const yaw = Math.atan2(heading.x, heading.z) * pc.math.RAD_TO_DEG;
    phoenix.setPosition(playerPosition);
    phoenix.setEulerAngles(0, yaw, -steerInput * 8);

    const cameraDesired = playerPosition.clone()
      .sub(heading.clone().mulScalar(4.5))
      .add(pc.Vec3.UP.clone().mulScalar(1.1));
    const lookAhead = Math.min(3.5, Math.max(0.75, corridor.endZ - localZ - 0.5));
    const lookDesired = playerPosition.clone()
      .add(heading.clone().mulScalar(lookAhead))
      .sub(pc.Vec3.UP.clone().mulScalar(0.4));
    cameraPosition.lerp(cameraPosition, cameraDesired, 1 - Math.exp(-3.2 * dt));
    cameraTarget.lerp(cameraTarget, lookDesired, 1 - Math.exp(-4.2 * dt));
    camera.setPosition(cameraPosition);
    camera.lookAt(cameraTarget);
  });

  requestAnimationFrame(() => loading.classList.add('ready'));
}

start().catch(showError);
