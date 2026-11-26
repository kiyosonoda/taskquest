/* HORA EXTRA — TaskQuest's secret mini-game.
 * The office after hours, overrun by the quest monsters. CRIA clocks in with a pump shotgun.
 * A small raycaster (walls, textured floor and ceiling, billboard sprites), drawn at 180×200
 * and scaled 2× to fill the 360×400 view above the HUD.
 *
 * Same three inputs as the rest of TaskQuest:
 *   ↑ ↓  walk     ← →  turn     Z  shoot (punch when out of shells)     X  pause
 *
 * Loaded before app.js; app.js calls window.TaskQuestOvertime(api) once and gets { open }.
 */
window.TaskQuestOvertime = function (api) {
'use strict';

// ---------------------------------------------------------------- view
const W = 180, H = 200;          // internal resolution
const PLANE = 0.66;              // camera plane half-length: ~66° field of view
const K = W / (2 * PLANE);       // a 1-cell wall at perpendicular distance d is K/d pixels tall
const HORIZON = H / 2;
const TEX = 32;                  // wall / floor texture size

// ---------------------------------------------------------------- map
// 1 brick wall, 2 cubicle partition, 3 server rack. '.' open floor.
const MAP_ROWS = [
  '111111111111111111111111',
  '1.......1......1.......1',
  '1.......1......1.......1',
  '1..22...1..33..1...22..1',
  '1..22......33......22..1',
  '1..............1.......1',
  '1.......1......1.......1',
  '1111.1111..........1.111',
  '1.......1..2222....1...1',
  '1.......1..........1...1',
  '1..33.......3..3.......1',
  '1..33...1..........1...1',
  '1.......1..2222....1...1',
  '1111.111111.....11111..1',
  '1..............1.......1',
  '1..22..22......1..333..1',
  '1..............1.......1',
  '1......1...........22..1',
  '1..22..1..333..1.......1',
  '1......1.......1.......1',
  '111.11111.111111...11111',
  '1......................1',
  '1......................1',
  '111111111111111111111111',
];
const MW = MAP_ROWS[0].length, MH = MAP_ROWS.length;
const MAP = new Uint8Array(MW * MH);
MAP_ROWS.forEach((row, y) => [...row].forEach((ch, x) => { MAP[y * MW + x] = ch === '.' ? 0 : +ch; }));
const cellAt = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH ? 1 : MAP[(y | 0) * MW + (x | 0)]);
const solid = (x, y) => cellAt(Math.floor(x), Math.floor(y)) > 0;
const START = { x: 3.5, y: 2.5, a: 0 };

// ---------------------------------------------------------------- colors & textures
const rgb = (r, g, b) => (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
function shade(c, f) {
  return (0xff000000 | (((c >>> 16) & 255) * f) << 16 | (((c >>> 8) & 255) * f) << 8 | ((c & 255) * f)) >>> 0;
}
let seed = 1337;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const jitter = (r, g, b, n) => { const d = (rnd() * 2 - 1) * n; return rgb(clamp8(r + d), clamp8(g + d), clamp8(b + d)); };
const clamp8 = v => Math.max(0, Math.min(255, v | 0));
function makeTex(fn) {
  const t = new Uint32Array(TEX * TEX);
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) t[y * TEX + x] = fn(x, y);
  return t;
}
const brick = makeTex((x, y) => {
  const row = y >> 3, off = row & 1 ? 8 : 0;
  if (y % 8 === 7 || (x + off) % 16 === 15) return rgb(52, 48, 48);
  return jitter(132, 60, 44, 14);
});
const partition = makeTex((x, y) => {
  if (y < 3 || x < 2 || x > 29) return jitter(176, 176, 184, 6);   // aluminium frame
  if (x === 15 || x === 16) return rgb(60, 64, 80);                // panel seam
  if (y > 20 && y < 24) return jitter(160, 140, 96, 6);             // name-tag strip
  return jitter(84, 92, 120, 10);                                   // fabric
});
// Server racks blink: two frames, swapped twice a second.
const rack = [0, 1].map(frame => {
  seed = 99;
  return makeTex((x, y) => {
    if (x < 2 || x > 29) return rgb(64, 64, 72);
    if (y % 4 === 0) return rgb(44, 44, 56);
    if (y % 4 === 2 && (x === 5 || x === 9 || x === 13)) {
      const r = rnd();
      if ((r < .5) !== (frame === 1 && r > .3)) return r < .3 ? rgb(248, 184, 0) : rgb(88, 216, 84);
      return rgb(20, 40, 20);
    }
    if (y % 4 === 2 && x > 18 && x < 27) return rgb(36, 36, 44);
    return jitter(28, 28, 36, 4);
  });
});
seed = 4242;
const carpet = makeTex((x, y) => (x === 0 || y === 0 ? rgb(36, 38, 50) : jitter(54, 58, 76, 9)));
const ceilTile = makeTex((x, y) => (x % 16 === 0 || y % 16 === 0 ? rgb(70, 70, 70) : jitter(112, 112, 108, 5)));
const ceilLight = makeTex((x, y) => {
  if (x % 16 === 0 || y % 16 === 0) return rgb(70, 70, 70);
  if (x > 4 && x < 28 && y > 10 && y < 22) return (x - 4) % 6 === 0 ? rgb(200, 200, 180) : rgb(244, 244, 224);
  return jitter(112, 112, 108, 5);
});
const wallTex = c => (c === 1 ? brick : c === 2 ? partition : rack[(performance.now() / 500 | 0) & 1]);

// Sprites: { t: Uint32Array, w, h }; 0 = transparent.
function monsterTex(rows, [r, g, b]) {
  const S = 12, grid = [...Array(S - rows.length).fill('.'.repeat(S)), ...rows];
  const on = (x, y) => y >= 0 && y < S && grid[y][x] === '#';
  const t = new Uint32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (on(x, y)) {
      const f = !on(x, y - 1) ? 1.15 : !on(x, y + 1) ? .7 : 1; // lit from above
      t[y * S + x] = rgb(clamp8(r * f), clamp8(g * f), clamp8(b * f));
    } else {
      // Holes fully enclosed by the body (eyes, mouths) are dark, not see-through.
      let L = false, R = false, U = false, D = false;
      for (let i = 0; i < S; i++) {
        if (on(i, y)) { if (i < x) L = true; else R = true; }
        if (on(x, i)) { if (i < y) U = true; else D = true; }
      }
      if (L && R && U && D) t[y * S + x] = rgb(16, 8, 8);
    }
  }
  return { t, w: S, h: S };
}
function paletteTex(rows, pal) {
  const w = rows[0].length, h = rows.length, t = new Uint32Array(w * h);
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) t[y * w + x] = pal[ch]; }));
  return { t, w, h };
}
const SHELLS_TEX = paletteTex([
  '.........',
  '..Y.Y.Y..',
  '..Y.Y.Y..',
  '..R.R.R..',
  '.BBBBBBB.',
  '.BWWWWWB.',
  '.BBBBBBB.',
  '.........',
], { Y: rgb(252, 224, 168), R: rgb(248, 56, 0), B: rgb(172, 124, 0), W: rgb(80, 48, 0) });
const COFFEE_TEX = paletteTex([
  '...S.S...',
  '..S.S....',
  '.WWWWWW..',
  '.WKKKKWWW',
  '.WWWWWW.W',
  '.WWWWWWWW',
  '..WWWW...',
  '.........',
], { S: rgb(188, 188, 188), W: rgb(252, 252, 252), K: rgb(80, 48, 0) });
const FIREBALL_TEX = paletteTex([
  '..OO..',
  '.OYYO.',
  'OYWWYO',
  'OYWWYO',
  '.OYYO.',
  '..OO..',
], { O: rgb(248, 56, 0), Y: rgb(248, 184, 0), W: rgb(252, 252, 220) });

// Enemies are the quest monsters: EASY slime, MEDIUM bat, HARD horned skull.
const KINDS = {
  slime: { rows: api.monsters.easy,   color: [88, 216, 84],  hp: 5,  speed: 1.1, s: .6,  lift: 0,   dmg: 8, cd: 1.0 },
  bat:   { rows: api.monsters.medium, color: [248, 184, 0],  hp: 3,  speed: 2.3, s: .45, lift: .42, dmg: 5, cd: .8 },
  skull: { rows: api.monsters.hard,   color: [248, 56, 0],   hp: 14, speed: .8,  s: .95, lift: 0,   dmg: 0, cd: 2.4, ranged: true },
};
for (const k of Object.values(KINDS)) k.tex = k.rows.map(f => monsterTex(f, k.color));

// ---------------------------------------------------------------- first-person shotgun
// Drawn once with canvas paths, then snapped to hard pixels with a black outline.
function pixelCanvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const poly = (col, pts) => { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };
  const rect = (col, x, y, ww, hh) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
  draw(poly, rect);
  const img = g.getImageData(0, 0, w, h), d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 128 ? 255 : 0;
  const opaque = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] === 255;
  const edge = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!opaque(x, y) && (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1))) edge.push((y * w + x) * 4);
  }
  for (const i of edge) { d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  return c;
}
const SKIN = '#b86c3c', SKIN_D = '#7c3c1c', SLEEVE = '#2c2c5c', SLEEVE_D = '#1c1c3c';
const WEAPON = pixelCanvas(64, 64, (poly, rect) => {
  poly(SLEEVE, [0, 64, 18, 64, 29, 41, 21, 33, 0, 48]);            // left sleeve
  rect(SLEEVE_D, 2, 52, 10, 2);
  poly('#7c7c7c', [27, 46, 37, 46, 35, 6, 29, 6]);                  // barrel
  rect('#bcbcbc', 31, 8, 1, 36);
  rect('#3c3c3c', 29, 3, 6, 4);                                     // muzzle
  poly('#3c3c3c', [24, 64, 40, 64, 38, 42, 26, 42]);                // receiver
  rect('#5c5c5c', 28, 47, 8, 2);
  poly('#ac7c00', [26, 39, 38, 39, 37, 26, 27, 26]);                // wooden pump
  rect('#7c5000', 27, 29, 10, 1); rect('#7c5000', 27, 32, 10, 1); rect('#7c5000', 26, 35, 12, 1);
  poly(SKIN, [17, 42, 28, 37, 31, 29, 27, 26, 20, 29, 15, 36]);     // left hand on the pump
  rect(SKIN, 27, 30, 5, 2); rect(SKIN_D, 27, 32, 5, 1); rect(SKIN, 27, 33, 5, 2);
  poly(SLEEVE, [46, 64, 64, 64, 64, 50, 52, 49]);                   // right sleeve
  poly(SKIN, [37, 58, 43, 51, 52, 51, 55, 59, 47, 64, 37, 64]);     // right hand on the grip
  rect(SKIN_D, 40, 57, 10, 1);
});
const FLASH = pixelCanvas(26, 22, (poly) => {
  poly('#f83800', [13, 0, 17, 7, 26, 6, 19, 13, 23, 22, 13, 16, 3, 22, 7, 13, 0, 6, 9, 7]);
  poly('#f8b800', [13, 4, 16, 9, 21, 9, 17, 13, 19, 18, 13, 15, 7, 18, 9, 13, 5, 9, 10, 9]);
  poly('#fcfcdc', [13, 8, 15, 11, 13, 14, 11, 11]);
});

// ---------------------------------------------------------------- DOM
let root, cv, cx, img, buf, zbuf, els;
function buildDOM() {
  root = document.createElement('div');
  root.className = 'ot hidden';
  root.innerHTML = `
    <div class="ot-box">
      <div class="ot-view">
        <canvas width="${W}" height="${H}"></canvas>
        <div class="ot-hurt"></div>
        <div class="ot-banner"></div>
        <div class="ot-menu"></div>
      </div>
      <div class="ot-hud">
        <div class="ot-face"></div>
        <div class="ot-stat"><small>SAÚDE</small><b data-k="hp"></b></div>
        <div class="ot-stat"><small>CARTUCHO</small><b data-k="ammo"></b></div>
        <div class="ot-stat"><small>ONDA</small><b data-k="wave"></b></div>
        <div class="ot-stat"><small>ABATES</small><b data-k="kills"></b></div>
      </div>
    </div>`;
  document.body.appendChild(root);
  cv = root.querySelector('canvas');
  cx = cv.getContext('2d');
  cx.imageSmoothingEnabled = false;
  img = cx.createImageData(W, H);
  buf = new Uint32Array(img.data.buffer);
  zbuf = new Float32Array(W);
  els = {
    hurt: root.querySelector('.ot-hurt'), banner: root.querySelector('.ot-banner'), menu: root.querySelector('.ot-menu'),
    face: root.querySelector('.ot-face'),
    hp: root.querySelector('[data-k=hp]'), ammo: root.querySelector('[data-k=ammo]'),
    wave: root.querySelector('[data-k=wave]'), kills: root.querySelector('[data-k=kills]'),
  };
}

// ---------------------------------------------------------------- game state
const MAX_HP = 100, MAX_AMMO = 60;
let g;          // the current run
let mode;       // 'intro' | 'play' | 'pause' | 'dead'
let menuSel = 0;
const keys = { up: false, down: false, left: false, right: false, a: false };
let raf = 0, last = 0;

function newRun() {
  g = {
    x: START.x, y: START.y, a: START.a,
    hp: MAX_HP, ammo: 24, wave: 0, kills: 0,
    enemies: [], pickups: [], shots: [],
    cool: 0, fireT: 0, punchT: 0, recoil: 0, walk: 0, hurtT: 0, faceHurt: 0,
    betweenT: 1.2, flowT: 0, flow: new Int16Array(MW * MH),
    time: 0,
  };
  computeFlow();
}

// Breadth-first distances from the player's cell: enemies walk downhill on it around walls.
function computeFlow() {
  const f = g.flow; f.fill(-1);
  const sx = g.x | 0, sy = g.y | 0, q = [sy * MW + sx];
  f[q[0]] = 0;
  for (let i = 0; i < q.length; i++) {
    const c = q[i], x = c % MW, y = (c / MW) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, n = ny * MW + nx;
      if (nx < 0 || ny < 0 || nx >= MW || ny >= MH || MAP[n] || f[n] >= 0) continue;
      f[n] = f[c] + 1; q.push(n);
    }
  }
}
function lineOfSight(ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / .1);
  for (let i = 1; i < n; i++) if (solid(ax + (bx - ax) * i / n, ay + (by - ay) * i / n)) return false;
  return true;
}
const free = (x, y, r) => !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r);
function moveBody(o, dx, dy, r) {
  if (free(o.x + dx, o.y, r)) o.x += dx;
  if (free(o.x, o.y + dy, r)) o.y += dy;
}

function openCells(minDist) {
  const out = [];
  for (let i = 0; i < MW * MH; i++) if (g.flow[i] >= minDist) out.push(i);
  return out;
}
function randomCell(minDist) {
  let cells = openCells(minDist);
  if (!cells.length) cells = openCells(3);
  const c = cells[(Math.random() * cells.length) | 0];
  return { x: (c % MW) + .5, y: ((c / MW) | 0) + .5 };
}
function spawnEnemy(kind) {
  const k = KINDS[kind], p = randomCell(9);
  g.enemies.push({ kind, k, x: p.x + (Math.random() - .5) * .4, y: p.y + (Math.random() - .5) * .4,
    hp: k.hp, cd: 1 + Math.random(), flash: 0, dying: 0, phase: Math.random() * 6 });
}
function spawnPickup(type, x, y) {
  if (x === undefined) ({ x, y } = randomCell(4));
  g.pickups.push({ type, x, y, phase: Math.random() * 6 });
}
function nextWave() {
  g.wave++;
  const n = g.wave;
  for (let i = 0; i < 2 + n; i++) spawnEnemy('slime');
  for (let i = 0; i < Math.floor(n / 2) + (n >= 2 ? 1 : 0); i++) spawnEnemy('bat');
  for (let i = 0; i < (n >= 3 ? Math.ceil((n - 2) / 2) : 0); i++) spawnEnemy('skull');
  spawnPickup('shells'); spawnPickup('shells');
  if (n % 2 === 0) spawnPickup('coffee');
  g.ammo = Math.min(MAX_AMMO, g.ammo + 6);
  banner(`ONDA ${n}`, 'gold');
  api.sfx.start();
}

// ---------------------------------------------------------------- update
function update(dt) {
  g.time += dt;
  const dirX = Math.cos(g.a), dirY = Math.sin(g.a);

  // walk / turn
  const turn = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  g.a += turn * 2.6 * dt;
  const fwd = (keys.up ? 1 : 0) - (keys.down ? 1 : 0);
  if (fwd) {
    moveBody(g, dirX * fwd * 3.2 * dt, dirY * fwd * 3.2 * dt, .22);
    g.walk += dt * 9;
  } else g.walk = 0;

  // shoot
  g.cool -= dt; g.fireT -= dt; g.punchT -= dt; g.hurtT -= dt; g.faceHurt -= dt;
  g.recoil = Math.max(0, g.recoil - dt * 40);
  if (keys.a && g.cool <= 0) fire();

  // flow field
  g.flowT -= dt;
  if (g.flowT <= 0) { computeFlow(); g.flowT = .25; }

  // enemies
  for (const e of g.enemies) {
    e.phase += dt * 6;
    e.flash -= dt;
    if (e.dying) { e.dying -= dt; continue; }
    const dx = g.x - e.x, dy = g.y - e.y, d = Math.hypot(dx, dy);
    const sees = d < 14 && lineOfSight(e.x, e.y, g.x, g.y);
    e.cd -= dt;
    let tx, ty;
    if (sees) { tx = g.x; ty = g.y; }
    else {
      // Downhill on the flow field: the open neighbour closest to the player.
      const cx0 = e.x | 0, cy0 = e.y | 0;
      let best = g.flow[cy0 * MW + cx0], bx = cx0, by = cy0;
      if (best < 0) best = 1e9;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = cx0 + ox, ny = cy0 + oy;
        const v = g.flow[ny * MW + nx];
        if (v < 0 || cellAt(nx, ny)) continue;
        if (ox && oy && (cellAt(cx0 + ox, cy0) || cellAt(cx0, cy0 + oy))) continue; // no corner cutting
        if (v < best) { best = v; bx = nx; by = ny; }
      }
      tx = bx + .5; ty = by + .5;
    }
    const keepAway = e.k.ranged && sees ? 3.5 : .7;
    if (d > keepAway) {
      let mx = tx - e.x, my = ty - e.y;
      const ml = Math.hypot(mx, my) || 1;
      mx /= ml; my /= ml;
      if (e.kind === 'bat') { mx += -my * Math.sin(e.phase * .7) * .8; my += mx * Math.sin(e.phase * .7) * .8; }
      moveBody(e, mx * e.k.speed * dt, my * e.k.speed * dt, .2);
    }
    if (e.k.ranged) {
      if (sees && d < 12 && e.cd <= 0) {
        e.cd = e.k.cd + Math.random();
        g.shots.push({ x: e.x, y: e.y, vx: dx / d * 4.5, vy: dy / d * 4.5 });
        api.sfx.fireball();
      }
    } else if (d < .85 && e.cd <= 0) {
      e.cd = e.k.cd;
      hurt(e.k.dmg);
    }
  }
  // keep enemies from stacking on one spot
  for (let i = 0; i < g.enemies.length; i++) for (let j = i + 1; j < g.enemies.length; j++) {
    const a = g.enemies[i], b = g.enemies[j];
    if (a.dying || b.dying) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d > 0 && d < .5) {
      const p = (.5 - d) / 2;
      moveBody(a, -dx / d * p, -dy / d * p, .2);
      moveBody(b, dx / d * p, dy / d * p, .2);
    }
  }
  g.enemies = g.enemies.filter(e => !e.dying || e.dying > 0);

  // fireballs
  for (const s of g.shots) {
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (solid(s.x, s.y)) s.dead = true;
    else if (Math.hypot(g.x - s.x, g.y - s.y) < .4) { s.dead = true; hurt(12); }
  }
  g.shots = g.shots.filter(s => !s.dead);

  // pickups
  for (const p of g.pickups) {
    p.phase += dt * 3;
    if (Math.hypot(g.x - p.x, g.y - p.y) > .6) continue;
    if (p.type === 'shells' && g.ammo < MAX_AMMO) {
      g.ammo = Math.min(MAX_AMMO, g.ammo + 8); p.taken = true; banner('+8 CARTUCHOS'); api.sfx.pickup();
    } else if (p.type === 'coffee' && g.hp < MAX_HP) {
      g.hp = Math.min(MAX_HP, g.hp + 25); p.taken = true; banner('CAFÉ! +25 SAÚDE', 'good'); api.sfx.pickup();
    }
  }
  g.pickups = g.pickups.filter(p => !p.taken);

  // waves
  if (!g.enemies.length) {
    g.betweenT -= dt;
    if (g.betweenT <= 0) { nextWave(); g.betweenT = 2.5; }
  }
}

function hurt(n) {
  if (mode !== 'play') return;
  g.hp = Math.max(0, g.hp - n);
  g.hurtT = .25; g.faceHurt = .5;
  els.hurt.classList.remove('on'); void els.hurt.offsetWidth; els.hurt.classList.add('on');
  api.sfx.hurt();
  if (g.hp <= 0) die();
}

// Where an enemy lands on screen right now (or null when behind the camera).
function project(o, dirX, dirY, planeX, planeY) {
  const rx = o.x - g.x, ry = o.y - g.y;
  const inv = 1 / (planeX * dirY - dirX * planeY);
  const tx = inv * (dirY * rx - dirX * ry);
  const ty = inv * (-planeY * rx + planeX * ry);
  if (ty <= .15) return null;
  return { sx: (W / 2) * (1 + tx / ty), depth: ty };
}

function fire() {
  const dirX = Math.cos(g.a), dirY = Math.sin(g.a), planeX = -dirY * PLANE, planeY = dirX * PLANE;
  const live = g.enemies.filter(e => !e.dying);
  if (g.ammo <= 0) {
    // Out of shells: CRIA throws a punch.
    g.cool = .45; g.punchT = .2; api.sfx.punch();
    let target = null, bd = 1.25;
    for (const e of live) {
      const d = Math.hypot(e.x - g.x, e.y - g.y);
      const ang = Math.abs(Math.atan2(Math.sin(Math.atan2(e.y - g.y, e.x - g.x) - g.a), Math.cos(Math.atan2(e.y - g.y, e.x - g.x) - g.a)));
      if (d < bd && ang < .6) { bd = d; target = e; }
    }
    if (target) damage(target, 3);
    else banner('SEM CARTUCHOS!', 'bad');
    return;
  }
  g.ammo--; g.cool = .75; g.fireT = .08; g.recoil = 10;
  api.sfx.shot();
  // Seven pellets spread across the middle of the screen; each hits the nearest enemy in its column.
  const proj = live.map(e => ({ e, p: project(e, dirX, dirY, planeX, planeY) })).filter(o => o.p);
  for (const off of [-11, -7, -3, 0, 3, 7, 11]) {
    const col = W / 2 + off;
    let hit = null, hd = 1e9;
    for (const { e, p } of proj) {
      const half = (K * e.k.s / p.depth) / 2;
      if (Math.abs(col - p.sx) <= half && p.depth < zbuf[col | 0] && p.depth < hd) { hd = p.depth; hit = e; }
    }
    if (hit) damage(hit, 1);
  }
}

function damage(e, n) {
  if (e.dying) return;
  e.hp -= n; e.flash = .1;
  if (e.hp > 0) { api.sfx.hit(); return; }
  e.dying = .35; g.kills++;
  api.sfx.kill();
  const r = Math.random();
  if (e.kind === 'skull' || r < .3) spawnPickup('shells', e.x, e.y);
  else if (r < .45) spawnPickup('coffee', e.x, e.y);
}

// ---------------------------------------------------------------- render
const fog = d => Math.round(Math.max(.18, Math.min(1, 1.2 - d / 11)) * 10) / 10;

function render() {
  const dirX = Math.cos(g.a), dirY = Math.sin(g.a);
  const planeX = -dirY * PLANE, planeY = dirX * PLANE;
  const px = g.x, py = g.y;

  // floor and ceiling, one row pair at a time
  const r0x = dirX - planeX, r0y = dirY - planeY, r1x = dirX + planeX, r1y = dirY + planeY;
  for (let p = 1; p <= HORIZON; p++) {
    const rowDist = (.5 * K) / (p - .5);
    const stepX = rowDist * (r1x - r0x) / W, stepY = rowDist * (r1y - r0y) / W;
    let fx = px + rowDist * r0x, fy = py + rowDist * r0y;
    const f = fog(rowDist), fc = f * .9;
    const yF = (HORIZON + p - 1) * W, yC = (HORIZON - p) * W;
    for (let x = 0; x < W; x++) {
      const cxx = Math.floor(fx), cyy = Math.floor(fy);
      const t = ((TEX * (fy - cyy)) & 31) * TEX + ((TEX * (fx - cxx)) & 31);
      buf[yF + x] = shade(carpet[t], f);
      buf[yC + x] = shade(((cxx + cyy * 3) % 5 === 0 ? ceilLight : ceilTile)[t], fc);
      fx += stepX; fy += stepY;
    }
  }

  // walls (DDA)
  for (let x = 0; x < W; x++) {
    const cam = 2 * x / W - 1;
    const rdx = dirX + planeX * cam, rdy = dirY + planeY * cam;
    let mx = px | 0, my = py | 0;
    const ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx), ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
    const sx = rdx < 0 ? -1 : 1, sy = rdy < 0 ? -1 : 1;
    let sdx = rdx < 0 ? (px - mx) * ddx : (mx + 1 - px) * ddx;
    let sdy = rdy < 0 ? (py - my) * ddy : (my + 1 - py) * ddy;
    let side = 0, cell = 0;
    for (let i = 0; i < 64; i++) {
      if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; } else { sdy += ddy; my += sy; side = 1; }
      cell = cellAt(mx, my);
      if (cell) break;
    }
    const perp = Math.max(.05, side === 0 ? sdx - ddx : sdy - ddy);
    zbuf[x] = perp;
    const lineH = K / perp, top = HORIZON - lineH / 2;
    let wx = side === 0 ? py + perp * rdy : px + perp * rdx;
    wx -= Math.floor(wx);
    let tx = (wx * TEX) | 0;
    if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) tx = TEX - tx - 1;
    const tex = wallTex(cell), f = fog(perp) * (side ? .78 : 1);
    const y0 = Math.max(0, Math.ceil(top)), y1 = Math.min(H, Math.ceil(top + lineH));
    for (let y = y0; y < y1; y++) {
      const ty = Math.min(TEX - 1, ((y + .5 - top) * TEX / lineH) | 0);
      buf[y * W + x] = shade(tex[ty * TEX + tx], f);
    }
  }

  // sprites, far to near
  const sprites = [];
  for (const e of g.enemies) {
    const tex = e.k.tex[(e.phase / 2.4 | 0) & 1];
    const squash = e.dying ? Math.max(.05, e.dying / .35) : 1;
    const bob = e.kind === 'bat' ? Math.sin(e.phase) * .05 : 0;
    sprites.push({ x: e.x, y: e.y, tex, s: e.k.s * squash, ws: e.dying ? 2 - squash : 1, lift: e.k.lift + bob, white: e.flash > 0 });
  }
  for (const p of g.pickups) sprites.push({ x: p.x, y: p.y, tex: p.type === 'shells' ? SHELLS_TEX : COFFEE_TEX, s: .26, ws: 1, lift: .03 + Math.sin(p.phase) * .03 });
  for (const s of g.shots) sprites.push({ x: s.x, y: s.y, tex: FIREBALL_TEX, s: .26, ws: 1, lift: .3, bright: true });
  const inv = 1 / (planeX * dirY - dirX * planeY);
  for (const s of sprites) {
    const rx = s.x - px, ry = s.y - py;
    s.tx = inv * (dirY * rx - dirX * ry);
    s.ty = inv * (-planeY * rx + planeX * ry);
  }
  sprites.sort((a, b) => b.ty - a.ty);
  for (const s of sprites) {
    if (s.ty <= .15) continue;
    const scr = (W / 2) * (1 + s.tx / s.ty);
    const hgt = K * s.s / s.ty, wid = hgt * s.tex.w / s.tex.h * s.ws;
    const bottom = HORIZON + (K * .5) / s.ty - (K * s.lift) / s.ty, top = bottom - hgt;
    const left = scr - wid / 2;
    const f = s.bright ? 1 : fog(s.ty);
    const x0 = Math.max(0, Math.ceil(left)), x1 = Math.min(W, Math.ceil(left + wid));
    const y0 = Math.max(0, Math.ceil(top)), y1 = Math.min(H, Math.ceil(bottom));
    const { t, w: tw, h: th } = s.tex;
    for (let x = x0; x < x1; x++) {
      if (s.ty >= zbuf[x]) continue;
      const tx = Math.min(tw - 1, ((x + .5 - left) * tw / wid) | 0);
      for (let y = y0; y < y1; y++) {
        const c = t[Math.min(th - 1, ((y + .5 - top) * th / hgt) | 0) * tw + tx];
        if (c) buf[y * W + x] = s.white ? 0xfffcfcfc : shade(c, f);
      }
    }
  }

  // crosshair
  const ch = 0xffbcbcbc;
  for (const [ox, oy] of [[-3, 0], [-2, 0], [2, 0], [3, 0], [0, -3], [0, -2], [0, 2], [0, 3]]) buf[(HORIZON + oy) * W + W / 2 + ox] = ch;

  cx.putImageData(img, 0, 0);

  // the shotgun, bobbing while walking, kicking back on each shot, jabbing on a punch
  const bobX = Math.sin(g.walk) * 4, bobY = Math.abs(Math.cos(g.walk)) * 3;
  const punch = g.punchT > 0 ? -14 : 0;
  const wx = W / 2 - 32 + 8 + bobX, wy = H - 60 + bobY + g.recoil + punch;
  if (g.fireT > 0) cx.drawImage(FLASH, wx + 32 - 13, wy - 18);
  cx.drawImage(WEAPON, wx | 0, wy | 0);
}

// ---------------------------------------------------------------- HUD, banners, menus
let hudKey = '';
function renderHUD() {
  const faceState = g.faceHurt > 0 ? 'hurt' : 'ok';
  const k = [g.hp, g.ammo, g.wave, g.kills, faceState, g.hp <= 30].join();
  if (k === hudKey) return;
  hudKey = k;
  els.hp.textContent = g.hp;
  els.hp.classList.toggle('low', g.hp <= 30);
  els.ammo.textContent = g.ammo;
  els.ammo.classList.toggle('low', g.ammo === 0);
  els.wave.textContent = g.wave;
  els.kills.textContent = g.kills;
  els.face.innerHTML = api.faceSVG(faceState === 'hurt');
  els.face.classList.toggle('low', g.hp <= 30);
}
let bannerT = 0;
function banner(text, kind = '') {
  els.banner.textContent = text;
  els.banner.className = 'ot-banner on ' + kind;
  clearTimeout(bannerT);
  bannerT = setTimeout(() => els.banner.classList.remove('on'), 1400);
}
function renderMenu() {
  const opts = list => `<div class="ot-opts">${list.map((l, i) => `<div class="${i === menuSel ? 'on' : ''}">${l}</div>`).join('')}</div>`;
  const best = api.getBest();
  if (mode === 'intro') {
    els.menu.innerHTML = `
      <div class="ot-card">
        <div class="ot-title">HORA EXTRA</div>
        <div class="ot-hero">${api.heroSVG()}</div>
        <p>O EXPEDIENTE ACABOU.<br>OS MONSTROS DAS QUESTS<br>TOMARAM O ESCRITÓRIO.</p>
        <p class="ot-keys"><i class="arw">↑↓</i> ANDAR · <i class="arw">←→</i> VIRAR<br>Z ATIRAR · X PAUSA</p>
        ${best ? `<p class="ot-best">RECORDE: ONDA ${best.wave} · ${best.kills} ABATES</p>` : ''}
        <p class="ot-press">Z COMEÇAR · X SAIR</p>
      </div>`;
  } else if (mode === 'pause') {
    els.menu.innerHTML = `<div class="ot-card"><div class="ot-title">PAUSA</div>${opts(['CONTINUAR', 'SAIR'])}</div>`;
  } else if (mode === 'dead') {
    els.menu.innerHTML = `
      <div class="ot-card">
        <div class="ot-title bad">FIM DO<br>EXPEDIENTE</div>
        <p>ONDA ${g.wave} · ${g.kills} ABATES</p>
        ${best ? `<p class="ot-best">RECORDE: ONDA ${best.wave} · ${best.kills} ABATES</p>` : ''}
        ${opts(['DE NOVO', 'SAIR'])}
      </div>`;
  } else els.menu.innerHTML = '';
  els.menu.classList.toggle('on', mode !== 'play');
}

function die() {
  mode = 'dead'; menuSel = 0;
  const best = api.getBest();
  if (!best || g.wave > best.wave || (g.wave === best.wave && g.kills > best.kills)) api.setBest({ wave: g.wave, kills: g.kills });
  api.sfx.gameover();
  renderMenu();
}

// ---------------------------------------------------------------- loop & input
function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000);
  last = now;
  if (mode === 'play') update(dt);
  else if (mode === 'intro') g.a += dt * .25; // attract mode: the camera slowly looks around
  render();
  renderHUD();
}

function onKey(e, down) {
  const b = api.readButton(e);
  if (!b) return;
  e.preventDefault();
  e.stopPropagation();
  if (b in keys) keys[b] = down;
  if (!down || e.repeat) return;
  if (mode === 'play') {
    if (b === 'b') { mode = 'pause'; menuSel = 0; clearKeys(); api.sfx.open(); renderMenu(); }
    return;
  }
  if (mode === 'intro') {
    if (b === 'a') { mode = 'play'; clearKeys(); renderMenu(); api.sfx.start(); }
    else if (b === 'b') close();
    return;
  }
  // pause / dead: two options
  if (b === 'up' || b === 'down') { menuSel = 1 - menuSel; api.sfx.move(); return renderMenu(); }
  if (b === 'b') {
    if (mode === 'pause') { mode = 'play'; clearKeys(); api.sfx.close(); return renderMenu(); }
    return close();
  }
  if (b !== 'a') return;
  if (menuSel === 1) return close();
  if (mode === 'pause') { mode = 'play'; clearKeys(); api.sfx.confirm(); return renderMenu(); }
  newRun(); hudKey = ''; mode = 'play'; clearKeys(); api.sfx.start(); renderMenu();
}
const keyDown = e => onKey(e, true), keyUp = e => onKey(e, false);
function clearKeys() { for (const k in keys) keys[k] = false; }
function onBlur() { clearKeys(); if (mode === 'play') { mode = 'pause'; menuSel = 0; renderMenu(); } }

function open() {
  if (!root) buildDOM();
  newRun(); hudKey = '';
  mode = 'intro'; menuSel = 0;
  clearKeys();
  renderMenu();
  root.classList.remove('hidden');
  window.addEventListener('keydown', keyDown, true);
  window.addEventListener('keyup', keyUp, true);
  window.addEventListener('blur', onBlur);
  last = performance.now();
  raf = requestAnimationFrame(frame);
}
function close() {
  cancelAnimationFrame(raf);
  window.removeEventListener('keydown', keyDown, true);
  window.removeEventListener('keyup', keyUp, true);
  window.removeEventListener('blur', onBlur);
  root.classList.add('hidden');
  api.sfx.close();
  api.onExit();
}

return { open };
};
