'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Skins ─────────────────────────────────────────────────────────────────────
// Cada skin define: nombre, color del casco, color de la llama, puntos donde
// nace la llama y el polígono del casco (la nariz apunta hacia +x).
const SKINS = [
  {
    id: 'clasica',
    name: 'Clásica',
    hull:  '#fff',
    flame: 'rgba(255, 130, 0, 0.85)',
    flames: [[-8, 0]],
    shape: [[20, 0], [-12, -9], [-7, 0], [-12, 9]],
  },
  {
    id: 'dardo',
    name: 'Dardo',
    hull:  '#00e5ff',
    flame: 'rgba(0, 229, 255, 0.9)',
    flames: [[-7, -3], [-7, 3]],
    shape: [[22, 0], [-6, -7], [-14, 0], [-6, 7]],
  },
  {
    id: 'buitre',
    name: 'Buitre',
    hull:  '#ff3b30',
    flame: 'rgba(255, 70, 70, 0.9)',
    flames: [[-9, -6], [-9, 6]],
    shape: [[18, 0], [-15, -13], [-8, 0], [-15, 13]],
  },
  {
    id: 'mantis',
    name: 'Mantis',
    hull:  '#39ff14',
    flame: 'rgba(57, 255, 20, 0.9)',
    flames: [[-8, 0]],
    shape: [[19, 0], [5, 5], [-13, 8], [-6, 0], [-13, -8], [5, -5]],
  },
  {
    id: 'aurora',
    name: 'Aurora',
    hull:  '#ffd700',
    flame: 'rgba(255, 220, 60, 0.9)',
    flames: [[-9, -4], [-9, 4]],
    shape: [[22, 0], [4, 6], [-10, 7], [-16, 0], [-10, -7], [4, -6]],
  },
];

const SKIN_KEY = 'asteroids-skin';
let skinIndex = 0;
let skinFlash = 0;   // temporizador para destacar el nombre al cambiar

function loadSkinIndex() {
  try {
    const idx = SKINS.findIndex(s => s.id === localStorage.getItem(SKIN_KEY));
    return idx >= 0 ? idx : 0;
  } catch (e) {
    return 0;
  }
}

function cycleSkin() {
  skinIndex = (skinIndex + 1) % SKINS.length;
  skinFlash = 1.8;
  try { localStorage.setItem(SKIN_KEY, SKINS[skinIndex].id); } catch (e) {}
}

skinIndex = loadSkinIndex();

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

const METEOR_POINTS = 150;        // puntos por estrella fugaz destruida

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz (meteoro especial) ─────────────────────────────────────────
class ShootingStar {
  constructor() {
    const EDGE = randInt(0, 3);   // 0=arriba, 1=derecha, 2=abajo, 3=izquierda
    const OFF  = 30;              // arranca justo fuera del canvas

    if (EDGE === 0) {
      this.x = rand(0, W);
      this.y = -OFF;
    } else if (EDGE === 1) {
      this.x = W + OFF;
      this.y = rand(0, H);
    } else if (EDGE === 2) {
      this.x = rand(0, W);
      this.y = H + OFF;
    } else {
      this.x = -OFF;
      this.y = rand(0, H);
    }

    // Rumbo perpendicular al borde hacia adentro, con desviación de ±35°
    const base = EDGE * Math.PI / 2 + Math.PI / 2;
    const dir  = base + rand(-Math.PI / 5, Math.PI / 5);
    const speed = rand(210, 290);  // mucho más rápido que un asteroide
    this.vx = Math.cos(dir) * speed;
    this.vy = Math.sin(dir) * speed;

    this.radius   = 11;
    this.ttl      = rand(3.5, 5.5);   // desaparece con el tiempo
    this.dead     = false;
    this.rot      = Math.atan2(this.vy, this.vx);
    this.rotSpeed = rand(-1.5, 1.5);

    // Polígono irregular, más pequeño que un asteroide
    const n = randInt(8, 11);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += this.rotSpeed * dt;
    this.ttl -= dt;
    // Se apaga por tiempo o al salir del mapa (margen de seguridad)
    if (this.ttl <= 0 ||
        this.x < -50 || this.x > W + 50 || this.y < -50 || this.y > H + 50)
      this.dead = true;
  }

  draw() {
    // Estela de velocidad
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 144, 64, 0.55)';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    const len = Math.hypot(this.vx, this.vy);
    for (let i = 1; i <= 4; i++) {
      ctx.globalAlpha = (1 - i / 4) * 0.9;
      ctx.beginPath();
      ctx.moveTo(this.x - this.vx / len * i * 12, this.y - this.vy / len * i * 12);
      ctx.lineTo(this.x - this.vx / len * (i + 1) * 12, this.y - this.vy / len * (i + 1) * 12);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Cuerpo: polígono naranja con núcleo brillante
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#ff9040';
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = '#fff7e0';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoost    = 0;
    this.tripleShot    = 0;
    this.shield        = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost    -= dt;
    if (this.tripleShot    > 0) this.tripleShot    -= dt;
    if (this.shield        > 0) this.shield        -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260 * (this.speedBoost > 0 ? 2 : 1);  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    const shots = [new Bullet(ox, oy, this.angle)];
    if (this.tripleShot > 0) {
      const SPREAD = 0.12;
      shots.push(new Bullet(ox, oy, this.angle - SPREAD));
      shots.push(new Bullet(ox, oy, this.angle + SPREAD));
    }
    return shots;
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = SKINS[skinIndex];

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = skin.hull;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta según la skin activa
    ctx.beginPath();
    ctx.moveTo(skin.shape[0][0], skin.shape[0][1]);
    for (let i = 1; i < skin.shape.length; i++)
      ctx.lineTo(skin.shape[i][0], skin.shape[i][1]);
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor (una por cada punto de {flames})
    if (this.thrusting && Math.random() > 0.35) {
      ctx.strokeStyle = skin.flame;
      for (const [bx, by] of skin.flames) {
        ctx.beginPath();
        ctx.moveTo(bx, by - 4);
        ctx.lineTo(bx - rand(6, 14), by);
        ctx.lineTo(bx, by + 4);
        ctx.stroke();
      }
    }

    ctx.restore();

    // Anillo del escudo activo
    if (this.shield > 0) {
      const t = performance.now() / 1000;
      const alpha = Math.min(1, this.shield / 1.5);
      const pulse = 0.75 + 0.25 * Math.sin(t * 6);
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = `rgba(0, 229, 255, ${(alpha * pulse * 0.85).toFixed(2)})`;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ── Power-up ──────────────────────────────────────────────────────────────────
const SHIELD_TIME = 5;   // duración del escudo en segundos

function randomPowerUpType() {
  const r = Math.random();
  return r < 0.34 ? 'speed' : r < 0.67 ? 'triple' : 'shield';
}

class PowerUp {
  constructor(x, y, type = randomPowerUpType()) {
    this.type = type;
    this.x    = x;
    this.y    = y;
    this.radius = 14;
    this.ttl  = 8;
    this.dead = false;
    this.pulse = rand(0, Math.PI * 2);

    const angle = rand(0, Math.PI * 2);
    const speed = rand(50, 90);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.pulse += dt * 5;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo final antes de desaparecer
    if (this.ttl < 2 && Math.floor(this.ttl * 5) % 2 === 0) return;

    const scale = 1 + 0.1 * Math.sin(this.pulse);
    const alpha = Math.min(1, this.ttl / 2);
    const color = this.type === 'speed' ? '127, 255, 0' : '0, 229, 255';

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = `rgba(${color}, ${alpha.toFixed(2)})`;
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';

    if (this.type === 'speed') {
      // Rayo (relámpago): forma del power-up de velocidad
      ctx.beginPath();
      ctx.moveTo( 2, -14);
      ctx.lineTo(-6,  -2);
      ctx.lineTo( 1,  -2);
      ctx.lineTo(-3,  14);
      ctx.lineTo( 6,   2);
      ctx.lineTo(-1,   2);
      ctx.closePath();
      ctx.stroke();
    } else if (this.type === 'triple') {
      // Triple shot: 3 puntos formando un abanico apuntando a la derecha
      ctx.fillStyle = `rgba(${color}, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc( 8, -9, 4, 0, Math.PI * 2);
      ctx.arc(12,  0, 4, 0, Math.PI * 2);
      ctx.arc( 8,  9, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Escudo: silueta clásica en cian
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo( 9, -10);
      ctx.lineTo( 9,   2);
      ctx.quadraticCurveTo(9, 9, 0, 14);
      ctx.quadraticCurveTo(-9, 9, -9, 2);
      ctx.lineTo(-9, -10);
      ctx.closePath();
      ctx.stroke();
      // Chevron interior
      ctx.beginPath();
      ctx.moveTo(-6, -3);
      ctx.lineTo( 0,  2);
      ctx.lineTo( 6, -3);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups, meteors;
let meteorTimer;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  meteors   = [];
  meteorTimer = 4;
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerups  = [];
  meteors   = [];
  meteorTimer = rand(5, 9);
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  // Cambiar de skin funciona en cualquier estado
  if (pressed('KeyC')) cycleSkin();
  if (skinFlash > 0) skinFlash -= dt;

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    powerups.forEach(p => p.update(dt));
    powerups  = powerups.filter(p => !p.dead);
    meteors.forEach(m => m.update(dt));
    meteors   = meteors.filter(m => !m.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));
  meteors.forEach(m => m.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerups  = powerups.filter(p => !p.dead);
  meteors   = meteors.filter(m => !m.dead);

  // Spawn periódico de estrellas fugaces (máx 3 a la vez)
  meteorTimer -= dt;
  if (meteorTimer <= 0) {
    if (meteors.length < 3) meteors.push(new ShootingStar());
    meteorTimer = rand(5, 9);
  }

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        // El asteroide puede soltar un power-up (velocidad, triple o escudo)
        if (Math.random() < 0.2)
          powerups.push(new PowerUp(a.x, a.y));
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Bala vs estrella fugaz
  for (const b of bullets) {
    for (const m of meteors) {
      if (!m.dead && !b.dead && dist(b, m) < m.radius) {
        b.dead = true;
        m.dead = true;
        score += METEOR_POINTS;
        explode(m.x, m.y, 8);
      }
    }
  }
  bullets = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  const ramSplits = [];
  for (const a of asteroids) {
    if (dist(ship, a) < ship.radius + a.radius * 0.82) {
      // Con el escudo activo el asteroide se rompe sin dañar la nave
      if (ship.shield > 0) {
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        ramSplits.push(...a.split());
        if (Math.random() < 0.2)
          powerups.push(new PowerUp(a.x, a.y));
      } else if (ship.invincible <= 0) {
        killShip();
        break;
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(ramSplits);
  powerups  = powerups.filter(p => !p.dead);

  // Nave vs estrella fugaz
  if (ship.invincible <= 0 && ship.shield <= 0) {
    for (const m of meteors) {
      if (dist(ship, m) < ship.radius + m.radius) {
        killShip();
        break;
      }
    }
  }

  // Nave vs power-up
  for (const p of powerups) {
    if (dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      if (p.type === 'shield') ship.shield = SHIELD_TIME;
      else if (p.type === 'triple') ship.tripleShot = 5;
      else                         ship.speedBoost = 5;
      explode(p.x, p.y, 10);
    }
  }
  powerups = powerups.filter(p => !p.dead);

  // Nivel completado
  if (asteroids.length === 0 && meteors.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  const skin = SKINS[skinIndex];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.scale(0.45, 0.45);
  ctx.strokeStyle = skin.hull;
  ctx.lineWidth   = 2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(skin.shape[0][0], skin.shape[0][1]);
  for (let i = 1; i < skin.shape.length; i++)
    ctx.lineTo(skin.shape[i][0], skin.shape[i][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  if (ship.speedBoost > 0) {
    ctx.fillStyle = '#7fff00';
    ctx.font = '14px monospace';
    ctx.fillText(`VELOCIDAD ${Math.ceil(ship.speedBoost)}s`, W / 2, 48);
  }

  if (ship.tripleShot > 0) {
    ctx.fillStyle = '#00e5ff';
    ctx.font = '14px monospace';
    ctx.fillText(`TRIPLE DISPARO ${Math.ceil(ship.tripleShot)}s`, W / 2, 66);
  }

  if (ship.shield > 0) {
    ctx.fillStyle = '#00e5ff';
    ctx.font = '14px monospace';
    ctx.fillText(`ESCUDO ${Math.ceil(ship.shield)}s`, W / 2, 84);
  }

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Skin activa (área del propulsor HUD)
  const skin = SKINS[skinIndex];
  ctx.fillStyle   = skin.hull;
  ctx.font        = '13px monospace';
  ctx.textAlign   = 'center';
  ctx.fillText(`NAVE: ${skin.name}   (C)`, W / 2, H - 14);

  // Nombre destacado al cambiar de skin
  if (skinFlash > 0) {
    ctx.fillStyle   = skin.hull;
    ctx.font        = 'bold 26px monospace';
    ctx.textAlign   = 'center';
    ctx.fillText(skin.name, W / 2, H / 2 - 80);
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  meteors.forEach(m => m.draw());
  powerups.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
