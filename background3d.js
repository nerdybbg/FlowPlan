/**
 * FlowPlan OS — 60fps Hardware-Accelerated Three.js Kinetic Matrix Background
 * Engineered for zero main-thread scroll lag:
 * - Passive scroll & pointer tracking (zero DOM reflows in scroll listener)
 * - Damped lerp inside requestAnimationFrame
 * - Automatic GPU sleep when Schedule Studio or AI Fullscreen modal is open
 */

(function () {
  'use strict';

  const canvas = document.getElementById('three-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmallScreen = () => window.innerWidth < 768;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: !isSmallScreen(),
      powerPreference: 'high-performance'
    });
  } catch (e) {
    canvas.style.display = 'none';
    return;
  }

  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  const plannerSystem = new THREE.Group();
  scene.add(plannerSystem);

  const columns = 7;
  const rows = 8;
  const colWidth = 2.0;
  const rowHeight = 1.3;
  const gridTotalW = columns * colWidth;
  const gridTotalH = rows * rowHeight;

  function createTextSprite(text, colorHex = '#FFF2BA', fontSize = 44) {
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 192;
    textCanvas.height = 96;
    const ctx = textCanvas.getContext('2d');

    ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
    ctx.fillStyle = colorHex;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 96, 48);

    const texture = new THREE.CanvasTexture(textCanvas);
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.35, 0.68, 1.0);
    return sprite;
  }

  // 1. Single Batched LineSegments for Entire Grid (1 draw call instead of 17!)
  const linePoints = [];
  for (let c = 0; c <= columns; c++) {
    const x = c * colWidth - gridTotalW / 2;
    linePoints.push(new THREE.Vector3(x, gridTotalH / 2, 0), new THREE.Vector3(x, -gridTotalH / 2, 0));
  }
  for (let r = 0; r <= rows; r++) {
    const y = r * rowHeight - gridTotalH / 2;
    linePoints.push(new THREE.Vector3(-gridTotalW / 2, y, 0), new THREE.Vector3(gridTotalW / 2, y, 0));
  }
  const gridGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
  const gridMat = new THREE.LineBasicMaterial({ color: 0x567C8D, transparent: true, opacity: 0.24, depthWrite: false });
  const gridSegments = new THREE.LineSegments(gridGeo, gridMat);
  plannerSystem.add(gridSegments);

  // 2. Day & Hour Sprites
  const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const times = ['05:00', '07:00', '09:00', '11:00', '13:00', '16:00', '19:00', '21:00'];
  const labelsGroup = new THREE.Group();

  for (let c = 0; c < columns; c++) {
    const x = (c + 0.5) * colWidth - gridTotalW / 2;
    const y = gridTotalH / 2 + 0.55;
    const sprite = createTextSprite(dayNames[c], '#FFF2BA', 40);
    sprite.position.set(x, y, 0.1);
    labelsGroup.add(sprite);
  }

  for (let r = 0; r < rows; r++) {
    const x = -(gridTotalW / 2) - 0.9;
    const y = (rows - 1 - r + 0.5) * rowHeight - gridTotalH / 2;
    const sprite = createTextSprite(times[r], '#C8D9E6', 34);
    sprite.position.set(x, y, 0.1);
    labelsGroup.add(sprite);
  }
  plannerSystem.add(labelsGroup);

  // 3. Perimeter Border
  const borderMat = new THREE.LineBasicMaterial({ color: 0xFFF2BA, transparent: true, opacity: 0.35, depthWrite: false });
  const borderPoints = [
    new THREE.Vector3(-gridTotalW / 2, gridTotalH / 2, 0.05),
    new THREE.Vector3(gridTotalW / 2, gridTotalH / 2, 0.05),
    new THREE.Vector3(gridTotalW / 2, -gridTotalH / 2, 0.05),
    new THREE.Vector3(-gridTotalW / 2, -gridTotalH / 2, 0.05),
    new THREE.Vector3(-gridTotalW / 2, gridTotalH / 2, 0.05)
  ];
  plannerSystem.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(borderPoints), borderMat));

  // 4. Kinetic Task Blocks
  const taskBlocks = [];
  const blockConfigs = [
    { col: 0, row: 6, spanY: 2, color: 0x10B981 },
    { col: 1, row: 5, spanY: 2, color: 0xFFF2BA },
    { col: 1, row: 2, spanY: 1, color: 0x5B0D18 },
    { col: 2, row: 5, spanY: 2, color: 0x8A4E2A },
    { col: 3, row: 4, spanY: 3, color: 0x10B981 },
    { col: 3, row: 1, spanY: 1, color: 0x567C8D },
    { col: 4, row: 4, spanY: 2, color: 0xC8D9E6 },
    { col: 5, row: 5, spanY: 2, color: 0xFFF2BA }
  ];

  blockConfigs.forEach((cfg, idx) => {
    const blockW = colWidth * 0.88;
    const blockH = rowHeight * cfg.spanY * 0.88;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(blockW, blockH, 0.16),
      new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.72 })
    );

    const targetX = (cfg.col + 0.5) * colWidth - gridTotalW / 2;
    const targetY = (cfg.row + cfg.spanY / 2) * rowHeight - gridTotalH / 2;
    const targetZ = 0.08;

    const scatterX = targetX + Math.sin(idx * 2) * 6.0;
    const scatterY = targetY + Math.cos(idx * 2) * 6.0;
    const scatterZ = 1.8 + idx * 0.5;

    mesh.position.set(scatterX, scatterY, scatterZ);
    const origRotZ = (idx % 2 === 0 ? 1 : -1) * 0.35;
    const origRotX = (idx % 3 === 0 ? 1 : -1) * 0.3;
    mesh.rotation.set(origRotX, 0, origRotZ);

    plannerSystem.add(mesh);
    taskBlocks.push({
      mesh,
      targetX, targetY, targetZ,
      scatterX, scatterY, scatterZ,
      origRotZ, origRotX
    });
  });

  let maxScrollCached = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  let targetScrollProgress = 0;
  let smoothScrollProgress = 0;
  let targetMx = 0;
  let targetMy = 0;
  let smoothMx = 0;
  let smoothMy = 0;

  function updateCameraForViewport() {
    const mob = isSmallScreen();
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    maxScrollCached = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

    if (mob) {
      camera.position.z = 13.5;
      plannerSystem.position.set(0, -0.5, -3.0);
    } else {
      camera.position.z = 9.2;
      plannerSystem.position.set(2.2, 0.2, -3.0);
    }
  }
  updateCameraForViewport();

  // Passive listeners (zero layout thrashing during scroll)
  window.addEventListener('scroll', () => {
    targetScrollProgress = Math.min(Math.max(window.scrollY / maxScrollCached, 0), 1);
  }, { passive: true });

  window.addEventListener('pointermove', (e) => {
    targetMx = (e.clientX / window.innerWidth - 0.5) * 2;
    targetMy = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  let isThreeRunning = !prefersReducedMotion;
  window.setThreeBackgroundActive = function (active) {
    isThreeRunning = Boolean(active) && !prefersReducedMotion;
  };

  function renderLoop() {
    requestAnimationFrame(renderLoop);
    if (!isThreeRunning || document.hidden) return;

    smoothScrollProgress += (targetScrollProgress - smoothScrollProgress) * 0.08;
    smoothMx += (targetMx - smoothMx) * 0.05;
    smoothMy += (targetMy - smoothMy) * 0.05;

    const mob = isSmallScreen();
    const inv = 1 - smoothScrollProgress;

    plannerSystem.rotation.x = (mob ? 0.3 : 0.4) * inv + smoothMy * 0.05;
    plannerSystem.rotation.y = (mob ? -0.18 : -0.3) * inv + smoothMx * 0.08;
    plannerSystem.position.x = (mob ? 0 : 2.2) * inv;

    for (let i = 0; i < taskBlocks.length; i++) {
      const item = taskBlocks[i];
      const blockStart = i * 0.035;
      const blockT = Math.min(Math.max((smoothScrollProgress - blockStart) / 0.55, 0), 1);
      const ease = 1 - (1 - blockT) * (1 - blockT) * (1 - blockT);
      const oneMinusEase = 1 - ease;

      item.mesh.position.set(
        item.scatterX + (item.targetX - item.scatterX) * ease,
        item.scatterY + (item.targetY - item.scatterY) * ease,
        item.scatterZ + (item.targetZ - item.scatterZ) * ease
      );
      item.mesh.rotation.z = item.origRotZ * oneMinusEase;
      item.mesh.rotation.x = item.origRotX * oneMinusEase;
    }

    renderer.render(scene, camera);
  }
  renderLoop();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) isThreeRunning = false;
  });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      updateCameraForViewport();
    }, 100);
  }, { passive: true });
})();
