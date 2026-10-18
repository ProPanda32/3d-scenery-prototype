const SPACING = 11;
const INTERACTION_RADIUS = 145;

export function createParticleField(sceneCanvas, app) {
  const overlay = document.createElement('canvas');
  overlay.id = 'particles';
  overlay.setAttribute('aria-hidden', 'true');
  document.body.appendChild(overlay);

  const context = overlay.getContext('2d', { alpha: true });
  const sampleCanvas = document.createElement('canvas');
  const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });
  const pointer = { x: 0, y: 0, active: false, influence: 0 };
  let particles = [];
  let width = 0;
  let height = 0;
  let columns = 0;
  let rows = 0;
  let lastSample = 0;
  let lastDraw = 0;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    overlay.width = Math.round(width * ratio);
    overlay.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    columns = Math.ceil(width / SPACING);
    rows = Math.ceil(height / SPACING);
    sampleCanvas.width = columns;
    sampleCanvas.height = rows;
    particles = [];
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        // Stable variation keeps the field organic without flickering.
        const seed = (column * 127.1 + row * 311.7) * 0.017;
        const random = Math.abs(Math.sin(seed) * 43758.5453) % 1;
        const second = Math.abs(Math.sin(seed + 4.23) * 27564.2451) % 1;
        particles.push({
          x: (column + 0.5) * SPACING + (random - 0.5) * 8,
          y: (row + 0.5) * SPACING + (second - 0.5) * 8,
          radius: 1.5 + random * 2.6 + (row / rows) ** 2 * 1.4,
          color: 'rgba(220, 215, 200, 0.72)'
        });
      }
    }
  }

  sceneCanvas.addEventListener('pointermove', event => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  });
  sceneCanvas.addEventListener('pointerleave', () => {
    pointer.active = false;
  });
  window.addEventListener('resize', resize);
  resize();

  // Read the WebGL frame while it is still available, then color the dots
  // from the scenery beneath them. A small sample avoids a full-size readback.
  app.on('postrender', () => {
    const now = performance.now();
    if (now - lastSample < 300) return;
    lastSample = now;
    try {
      sampleContext.drawImage(sceneCanvas, 0, 0, columns, rows);
      const pixels = sampleContext.getImageData(0, 0, columns, rows).data;
      for (let i = 0; i < particles.length; i++) {
        const offset = i * 4;
        const red = Math.min(255, pixels[offset] * 1.12 + 12) | 0;
        const green = Math.min(255, pixels[offset + 1] * 1.12 + 12) | 0;
        const blue = Math.min(255, pixels[offset + 2] * 1.12 + 12) | 0;
        particles[i].color = `rgba(${red}, ${green}, ${blue}, 0.78)`;
      }
    } catch (error) {
      console.warn('Particle color sampling unavailable:', error);
    }
  });

  function draw(now) {
    requestAnimationFrame(draw);
    if (now - lastDraw < 33) return;
    const delta = Math.min((now - lastDraw) / 1000, 0.1);
    lastDraw = now;
    pointer.influence += ((pointer.active ? 1 : 0) - pointer.influence) * (1 - Math.exp(-delta * 6));
    context.clearRect(0, 0, width, height);
    for (const particle of particles) {
      const dx = particle.x - pointer.x;
      const dy = particle.y - pointer.y;
      const distance = Math.hypot(dx, dy);
      const proximity = pointer.influence * Math.max(0, 1 - distance / INTERACTION_RADIUS);
      const push = proximity * proximity * 34;
      const x = particle.x + (distance ? dx / distance * push : 0);
      const y = particle.y + (distance ? dy / distance * push : 0);
      context.beginPath();
      context.arc(x, y, particle.radius * (1 + proximity * 0.9), 0, Math.PI * 2);
      context.fillStyle = particle.color;
      context.fill();
    }
  }
  requestAnimationFrame(draw);
}
