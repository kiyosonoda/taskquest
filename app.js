/* TaskQuest
 * Controller-style to-do list. Only three inputs exist:
 *   D-pad  = arrow keys
 *   A      = Z   (select / confirm)
 *   B      = X   (back / cancel / erase)
 * Save data lives in localStorage (key below).
 */
(() => {
'use strict';

// ---------------------------------------------------------------- config
const SAVE_KEY = 'gameover.save.v1';
const MAX_HP = 3; // three hearts: each expired quest costs one, zero is GAME OVER
const KEY_A = 'z', KEY_B = 'x';
const DIFF = {
  easy:   { label: 'EASY',   xp: 10 },
  medium: { label: 'MEDIUM', xp: 25 },
  hard:   { label: 'HARD',   xp: 50 },
};
const DIFFS = ['easy', 'medium', 'hard'];
const TABS = [
  { id: 'active', label: 'ATIVAS' },
  { id: 'done',   label: 'CONCLUIDAS' },
  { id: 'failed', label: 'FALHADAS' },
  { id: 'system', label: 'OPÇÕES' },
];
const DEADLINE_HOUR = 18; // quests are due at the end of business hours, not at midnight
const atDeadlineHour = d => { d.setHours(DEADLINE_HOUR, 0, 0, 0); return d; };
const endOfDay = (n, addDays) => { const d = new Date(n); d.setDate(d.getDate() + addDays); return atDeadlineHour(d); };
const defaultDeadline = () => endOfDay(new Date(), 1); // new quests start due tomorrow 18:00
const FORM_ROWS = ['name', 'diff', 'date', 'actions'];
const DATE_SEGS = ['DIA', 'MÊS', 'ANO']; // no time of day: a deadline is the end of that business day (18:00)
const NAME_MAX = 60;
const XP_PER_LEVEL = 100;
const xpNeed = () => XP_PER_LEVEL; // every level costs the same
const MAX_LEVEL = 100;             // reaching it unlocks the hero's color (OPÇÕES → COR)

// Level-up reward: a motivational phrase. One per level: reaching LV n shows PHRASES[n - 2],
// so the 98 phrases cover LV 2 to LV 99. LV 100 has no phrase: it's the color-unlock surprise.
const PHRASES = [
  'Um passo de cada vez ainda é avançar.',
  'Feito é melhor que perfeito.',
  'Você não precisa ver a escada inteira, só o próximo degrau.',
  'Pequenas vitórias também contam como vitórias.',
  'Começar é metade do caminho.',
  'Constância vence intensidade.',
  'Descansar também faz parte do plano.',
  'Quem termina uma quest já está à frente de quem só pensa nela.',
  'Seu ritmo é o ritmo certo.',
  'Hoje é um ótimo dia para riscar algo da lista.',
  'O progresso de hoje é o alívio de amanhã.',
  'Disciplina é lembrar o que você quer.',
  'Uma tarefa difícil é só uma tarefa fácil que ainda não foi dividida.',
  'Você já superou 100% dos seus dias ruins.',
  'Errar faz parte da fase. Tente de novo.',
  'Foco no que dá para fazer agora.',
  'Grandes jornadas são feitas de pequenas quests.',
  'Não espere a motivação: comece e ela aparece.',
  'Cada XP conta.',
  'Organização é um superpoder silencioso.',
  'Faça o difícil primeiro e o resto do dia fica leve.',
  'Você é mais capaz do que a sua lista de pendências faz parecer.',
  'Respira. Uma coisa de cada vez.',
  'O prazo é um aliado, não um inimigo.',
  'Persistência transforma o impossível em rotina.',
  'Terminou? Comemore. Você merece.',
  'Coragem é fazer mesmo com preguiça.',
  'Nem todo dia é fase bônus, e tudo bem.',
  'Comece pequeno, mas comece.',
  'Quem planeja joga com vantagem.',
  'Seu futuro agradece o esforço de hoje.',
  'Devagar também se chega ao chefão.',
  'Quinze minutos de foco valem mais que uma hora de distração.',
  'Não compare o seu nível 1 com o nível 50 de alguém.',
  'Hábito bom é save automático.',
  'Dizer não também é produtividade.',
  'Cada quest concluída é uma promessa cumprida com você mesmo.',
  'O cansaço passa. A satisfação de ter feito fica.',
  'Melhor feito hoje do que perfeito nunca.',
  'Seu esforço conta, mesmo quando ninguém vê.',
  'Ajustar a rota não é desistir.',
  'Um bom dia começa com uma tarefa concluída.',
  'Você não está atrasado: está no seu próprio mapa.',
  'Simplifique e siga em frente.',
  'A sorte ajuda quem está jogando.',
  'Desafios difíceis dão mais XP.',
  'Cuide de você: o herói também precisa de poção.',
  'O impossível é só uma quest que ninguém tentou ainda.',
  'Clareza vem da ação, não de pensar sem parar.',
  'Todo especialista já foi iniciante.',
  'Um dia de cada vez, uma quest de cada vez.',
  'Seu tempo é seu recurso mais raro. Use bem.',
  'Celebre o progresso, não só a linha de chegada.',
  'Se travar, divida em partes menores.',
  'A preguiça negocia. Não aceite o acordo.',
  'Você está construindo algo, mesmo que devagar.',
  'Uma lista vazia é a melhor vista do dia.',
  'Recomeçar também é avançar.',
  'O que é medido melhora.',
  'Seja gentil com quem está tentando. Inclusive você.',
  'Tarefa adiada é tarefa que cresce.',
  'Pequenos ajustes, grandes resultados.',
  'A vitória gosta de preparo.',
  'Você controla o próximo passo, e isso basta.',
  'Foco é escolher o que ignorar.',
  'Termine o que começou e sinta a leveza.',
  'Ninguém zera o jogo no primeiro dia.',
  'Força não é nunca cair: é sempre levantar.',
  'A rotina certa trabalha por você.',
  'Hoje vale mais do que um amanhã perfeito.',
  'Sua dedicação está subindo de nível junto com você.',
  'Confie no processo e aperte Z.',
  'Silencie as notificações e libere seu foco.',
  'O primeiro passo é sempre o mais pesado.',
  'Quem não desiste acaba chegando.',
  'A diferença está no que você faz todo dia.',
  'Prioridade é o que você faz primeiro.',
  'Seus limites estão mais longe do que você imagina.',
  'Uma pausa bem feita recarrega o HP.',
  'Ação vence ansiedade.',
  'Faça hoje o que o você de amanhã vai agradecer.',
  'Bons resultados levam tempo. Continue jogando.',
  'Você está mais perto do que estava ontem.',
  'O caminho fica claro para quem anda.',
  'Cada prazo cumprido aumenta sua confiança.',
  'Não é sobre ter tempo, é sobre fazer tempo.',
  'Grandes heróis também têm listas de tarefas.',
  'Termine forte.',
  'Sua história está sendo escrita uma quest por vez.',
  'Mais um nível. Mais uma prova de que você consegue.',
  'O topo está logo ali. Não pare agora.',
  'Quase lá: cada passo agora vale ouro.',
  'Lembre de onde você começou.',
  'Você transformou esforço em hábito.',
  'Poucos chegam até aqui. Você chegou.',
  'Falta pouco para o nível máximo.',
  'A reta final é dos persistentes.',
  'Último passo antes do topo. Vai!',
];

// Hero colors (NES palette), unlocked at LV 100.
const HERO_COLORS = {
  white:  { label: 'BRANCO',   hex: '#fcfcfc' },
  green:  { label: 'VERDE',    hex: '#58d854' },
  yellow: { label: 'AMARELO',  hex: '#f8b800' },
  red:    { label: 'VERMELHO', hex: '#f83800' },
  blue:   { label: 'AZUL',     hex: '#3cbcfc' },
  pink:   { label: 'ROSA',     hex: '#f878f8' },
};
const COLOR_KEYS = Object.keys(HERO_COLORS);

// ---------------------------------------------------------------- helpers
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const pad = n => String(n).padStart(2, '0');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wrap = (i, n) => (i + n) % n;

function fmtCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
  return (d ? `${d}D ` : '') + `${pad(h)}:${pad(m)}:${pad(x)}`;
}
// Deadlines are whole days, so they show without a time.
function fmtDay(t) {
  const d = new Date(t);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function fmtDate(t) {
  const d = new Date(t);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function urgency(ms) { return ms < 3600e3 ? 'critical' : ms < 86400e3 ? 'urgent' : ''; }

// On-screen button glyphs
const btnA = label => `<span class="pr"><span class="btn">Z</span><span>${label}</span></span>`;
const btnB = label => `<span class="pr"><span class="btn">X</span><span>${label}</span></span>`;
const dpad = label => `<span class="pr"><span class="dpad"></span><span>${label}</span></span>`;
// The control legend is the same on every screen.
const LEGEND = dpad('MOVER') + btnA('CONFIRMAR') + btnB('CANCELAR / VOLTAR');

// ---------------------------------------------------------------- state
function defaults() {
  return { quests: [], player: { level: 1, xp: 0, hp: MAX_HP, completed: 0, failed: 0 }, sound: true, name: '', skin: 'worker', color: 'white', setupDone: false };
}
const HERO_NAME_MAX = 12; // what fits beside the clock in the HUD
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && Array.isArray(s.quests)) {
      const d = defaults();
      const out = { ...d, ...s, player: { ...d.player, ...s.player } };
      // Saves from before hero creation existed already have a hero: keep playing.
      if (s.setupDone === undefined) { out.setupDone = true; out.name = s.name || 'HEROI'; }
      // Levels used to cost more than 100 XP: settle any XP that now fills the bar.
      while (out.player.xp >= XP_PER_LEVEL && out.player.level < MAX_LEVEL) { out.player.xp -= XP_PER_LEVEL; out.player.level++; }
      if (out.player.level >= MAX_LEVEL) { out.player.level = MAX_LEVEL; out.player.xp = 0; }
      out.player.hp = Math.min(out.player.hp, MAX_HP); // saves from when there were 5 hearts
      // Quests used to be due at 23:59: move open ones to 18:00 that day, unless that hour already passed.
      for (const q of out.quests) {
        const d = new Date(q.deadline);
        if (q.status !== 'active' || d.getHours() !== 23 || d.getMinutes() !== 59) continue;
        const t = atDeadlineHour(d).getTime();
        if (t > Date.now()) q.deadline = t;
      }
      return out;
    }
  } catch (e) { /* corrupted or blocked storage: start fresh */ }
  return defaults();
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }

let state = load();
const ui = { tab: 0, cursor: 0, modal: null, busy: false, started: false };
const byId = id => state.quests.find(q => q.id === id);

function listFor(tabIdx) {
  const id = TABS[tabIdx].id;
  const q = state.quests.filter(x => x.status === id);
  if (id === 'active') q.sort((a, b) => a.deadline - b.deadline);
  else if (id === 'done') q.sort((a, b) => b.completedAt - a.completedAt);
  else q.sort((a, b) => b.failedAt - a.failedAt);
  return q;
}
// Everything the cursor can land on in the current tab.
function itemsFor(tabIdx) {
  const id = TABS[tabIdx].id;
  if (id === 'system') return [{ type: 'sound' }, { type: 'help' }];
  const qs = listFor(tabIdx).map(q => ({ type: 'quest', q }));
  return id === 'active' ? [{ type: 'new' }, ...qs] : qs;
}

// ---------------------------------------------------------------- sound (WebAudio chiptune blips)
const sfx = (() => {
  let ctx;
  function tone(f, d, { type = 'square', vol = .04, at = 0, slide = 0 } = {}) {
    if (!state.sound) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t = ctx.currentTime + at;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + d + .02);
    } catch (e) { /* audio unavailable */ }
  }
  const seq = (notes, step, opts) => notes.forEach((f, i) => tone(f, opts.d || .12, { ...opts, at: i * step }));
  return {
    move:     () => tone(660, .04, { vol: .02 }),
    tab:      () => tone(520, .06, { vol: .03 }),
    type:     () => tone(880, .03, { vol: .02 }),
    open:     () => { tone(392, .06); tone(587, .08, { at: .06 }); },
    close:    () => tone(330, .07, { vol: .03 }),
    confirm:  () => { tone(523, .07); tone(784, .1, { at: .07 }); },
    complete: () => seq([523, 659, 784, 1047], .07, {}),
    levelup:  () => seq([392, 523, 659, 784, 1047, 1319], .08, { type: 'triangle', vol: .05, d: .14 }),
    fail:     () => tone(300, .5, { slide: 60, type: 'sawtooth', vol: .05 }),
    error:    () => tone(140, .15, { type: 'sawtooth', vol: .04 }),
    gameover: () => seq([392, 330, 262, 196], .3, { type: 'triangle', vol: .06, d: .35 }),
    start:    () => seq([262, 392, 523, 784], .06, { vol: .04, d: .1 }),
  };
})();

// ---------------------------------------------------------------- FX
function toast(title, sub, kind = 'info') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = `<b>${esc(title)}</b><span>${esc(sub)}</span>`;
  $('#toasts').appendChild(el);
  while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
  setTimeout(() => el.classList.add('out'), 2600);
  setTimeout(() => el.remove(), 2950);
}
function shake(el = $('#app')) {
  if (!el) return;
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
}

// ---------------------------------------------------------------- hero sprite (16x16, 1-bit: white on black)
// The sprite is assembled from parts so each animation frame only swaps what moves.
// Skins: each has an 8-row head, the head row that changes when the eyes close,
// and a 3-row torso. Legs are shared.
const SKINS = {
  knight: {
    label: 'CAVALEIRO',
    head: [
      '.......##.......',
      '......##........',
      '.....######.....',
      '....########....',
      '....#......#....',
      '....########....',
      '....##.##.##....',
      '.....######.....',
    ],
    eyesClosed: [6, '....########....'],
    torso: ['....########....', '...#.######.#...', '...#.######.#...'],
  },
  mage: {
    label: 'MAGO',
    head: [
      // Hat on the left; on the right a staff topped with a hollow diamond gem.
      '.......#.....#..',
      '......###...#.#.',
      '.....#####...#..',
      '.....######..#..',
      '...#########.#..',
      '....#......#.#..',
      '....#.#..#.#.#..',
      '.....######..#..',
    ],
    eyesClosed: [6, '....#......#.#..'],
    torso: ['....########.#..', '...#.######.##..', '...#.######..#..'],
  },
  ninja: {
    label: 'NINJA',
    head: [
      '................',
      '................',
      '.....######.....',
      '....########....',
      '....########.##.',
      '....#.#..#.#.#..',
      '....########....',
      '.....######.....',
    ],
    eyesClosed: [5, '....#......#.#..'],
    torso: ['....########....', '...#.##..##.#...', '...#.######.#...'],
  },
  skeleton: {
    label: 'ESQUELETO',
    head: [
      '................',
      '.....######.....',
      '....########....',
      '....#..##..#....',
      '....#..##..#....',
      '....####.###....',
      '.....######.....',
      '.....#.##.#.....',
    ],
    eyesClosed: [3, '....########....'],
    torso: ['....########....', '...#.#.##.#.#...', '...#..####..#...'],
  },
  orc: {
    label: 'ORC',
    head: [
      '................',
      '.....######.....',
      '....########....',
      '..#.########.#..',
      '..###.####.###..',
      '....########....',
      '....#.#..#.#....',
      '.....######.....',
    ],
    eyesClosed: [4, '..############..'],
    torso: ['...##########...', '..#.########.#..', '..#.########.#..'],
  },
  // LV 100. The final form: the classic meme cat. Pointy ears, whiskers, tail up.
  cat: {
    label: 'GATO',
    head: [
      '...#........#...',
      '...##......##...',
      '...##########...',
      '..###.####.###..', // eyes: 1 pixel wide, 2 tall (rows 3 and 4)
      '..###.####.###..',
      '##.##########.##', // one whisker each side
      '..###.#..#.###..', // the :3 mouth: these two rows leave a "w" of dark pixels
      '...###.##.###...',
    ],
    // Closed: the tall eyes become short flat lines.
    eyesClosed: [[3, '..############..'], [4, '..##..####..##..']],
    torso: ['....########..#.', '...#.######.#.#.', '...#.######.##..'],
  },
  // LV 60. Became a productivity machine: antenna, square head, grille mouth, chest lights.
  robot: {
    label: 'ROBÔ',
    head: [
      '......####......',
      '.......##.......',
      '....########....',
      '....########....',
      '....#..##..#....',
      '....########....',
      '....#.#..#.#....',
      '....########....',
    ],
    eyesClosed: [4, '....########....'], // powered down
    torso: ['..############..', '..#.#.####.#.#..', '..#.########.#..'],
  },
  // LV 70. Lives on caffeine only: a coffee cup with a face, a handle, steam and a saucer.
  // headOffset +1 so the cup (head) and its bottom (torso) touch with no gap.
  coffee: {
    label: 'CAFETEIRA',
    headOffset: 1,
    head: [
      '.....#....#.....',
      '......#....#....',
      '.....#....#.....',
      '................',
      '...##########...',
      '...###########..',
      '...###.##.###.#.',
      '...###########..',
    ],
    eyesClosed: [6, '...##########.#.'],
    torso: ['....###..###....', '.....######.....', '..############..'],
  },
  // Regular office guy: short hair, white shirt with a black tie stripe down the middle,
  // briefcase in hand.
  worker: {
    label: 'TRABALHADOR',
    // 9 rows (one taller than the others, drawn a row higher) so the face has room:
    // hair, gap, eyes, gap, smile, gap, chin.
    headOffset: -1,
    head: [
      '.....######.....',
      '....########....',
      '....#......#....',
      '....#.#..#.#....',
      '....#......#....',
      '....#.#..#.#....',
      '....#..##..#....',
      '....#......#....',
      '.....######.....',
    ],
    eyesClosed: [3, '....#......#....'], // the smile stays
    // Rows 4-5 hang below the hand and overlap the leg rows: that's the briefcase.
    // The tie stops above the belt row so it doesn't read as a gap down to the legs.
    torso: ['....###..###....', '...#.##..##.#...', '...#.######.#...', '............####', '............####'],
  },
  hammerhead: {
    label: 'TUBARÃO-MARTELO',
    head: [
      '................',
      '................',
      '.......#........',
      '......###.......',
      '.##############.',
      '.#.##########.#.',
      '.##############.',
      '.....#.##.#.....',
    ],
    eyesClosed: [5, '.##############.'],
    // Broad shoulders and thick 2-pixel arms hanging the full height of the body.
    torso: ['..############..', '.##.########.##.', '.##.########.##.'],
  },
  // A glitch in the system: a faceless solid head; app.js corrupts its frames at random.
  unknown: {
    label: 'UNKNOWN',
    glitch: true,
    head: [
      '................',
      '.....######.....',
      '....########....',
      '....########....',
      '....########....',
      '....########....',
      '....########....',
      '.....######.....',
    ],
    eyesClosed: [4, '....########....'], // no eyes to close
    torso: ['....#####.##....', '..#..######.#...', '...#.####.##.#..'],
  },
};
// Order shown with ← →; UNKNOWN and TUBARÃO-MARTELO close the list.
// Every hero starts as TRABALHADOR; each other skin unlocks at its level (one every 10).
// The further up, the more special, then the stranger (burnout).
const SKIN_UNLOCK = {
  worker: 1, knight: 10, mage: 20, ninja: 30, orc: 40,
  skeleton: 50, robot: 60, coffee: 70, hammerhead: 80, unknown: 90, cat: 100,
};
const SKIN_KEYS = Object.keys(SKIN_UNLOCK); // order shown with ← →
const unlockedSkins = () => SKIN_KEYS.filter(k => state.player.level >= SKIN_UNLOCK[k]);
const skinUnlockedAt = level => SKIN_KEYS.find(k => SKIN_UNLOCK[k] === level && level > 1);
const HERO_LEGS = {
  stand: ['.....##..##.....', '.....##..##.....', '....###..###....'],
  stepL: ['.....##..##.....', '....##....##....', '...###.....##...'],
  stepR: ['.....##..##.....', '....##....##....', '...##.....###...'],
  pass:  ['......####......', '......####......', '.....##.###.....'],
  sit:   ['....##########..'],
};
function composeGrid(parts) {
  const grid = Array.from({ length: 16 }, () => Array(16).fill(false));
  parts.forEach(([rows, top]) => rows.forEach((row, dy) => [...row].forEach((ch, x) => {
    if (ch === '#' && grid[top + dy]) grid[top + dy][x] = true;
  })));
  return grid;
}
function gridSVG(grid) {
  let rects = '';
  grid.forEach((row, y) => row.forEach((on, x) => { if (on) rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`; }));
  return `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">${rects}</svg>`;
}
const composeHero = parts => gridSVG(composeGrid(parts));
// Lying on the floor: the standing pose turned 90° (head to the right), dropped to the ground.
function lyingGrid(grid) {
  const r = Array.from({ length: 16 }, (_, y) => Array.from({ length: 16 }, (_, x) => grid[15 - x][y]));
  let bottom = 15;
  while (bottom > 0 && !r[bottom].some(Boolean)) bottom--;
  const shift = 15 - bottom;
  return Array.from({ length: 16 }, (_, y) => (y - shift >= 0 ? r[y - shift] : Array(16).fill(false)));
}
function buildGrids(skin) {
  const sk = SKINS[skin];
  const head = sk.head, torso = sk.torso;
  // eyesClosed is one [row, line] pair, or a list of them when the eyes span several rows.
  const closes = Array.isArray(sk.eyesClosed[0]) ? sk.eyesClosed : [sk.eyesClosed];
  const headClosed = head.map((r, i) => (closes.find(([row]) => row === i) || [, r])[1]);
  const h = n => n + (sk.headOffset || 0); // a taller head starts higher
  return {
    stand: composeGrid([[head, h(1)], [torso, 10], [HERO_LEGS.stand, 13]]),
    // Steps sit one pixel lower than the passing pose: that's the walking bob.
    stepL: composeGrid([[head, h(2)], [torso, 11], [HERO_LEGS.stepL, 13]]),
    stepR: composeGrid([[head, h(2)], [torso, 11], [HERO_LEGS.stepR, 13]]),
    pass:  composeGrid([[head, h(1)], [torso, 10], [HERO_LEGS.pass, 13]]),
    // Resting: sitting with legs out, eyes closed, slow breathing.
    restIn:  composeGrid([[headClosed, h(3)], [torso, 12], [HERO_LEGS.sit, 15]]),
    restOut: composeGrid([[headClosed, h(4)], [torso, 12], [HERO_LEGS.sit, 15]]),
    // Reset: knocked down, then lying flat with eyes closed.
    fall: composeGrid([[headClosed, h(4)], [torso, 12], [HERO_LEGS.sit, 15]]),
    dead: lyingGrid(composeGrid([[headClosed, h(1)], [torso, 10], [HERO_LEGS.stand, 13]])),
  };
}
const GRID_CACHE = {}, FRAME_CACHE = {};
function heroGrids() {
  // Unknown skin in an old save, or one this level hasn't unlocked yet: back to the start.
  if (!SKINS[state.skin] || state.player.level < SKIN_UNLOCK[state.skin]) state.skin = 'worker';
  return GRID_CACHE[state.skin] || (GRID_CACHE[state.skin] = buildGrids(state.skin));
}
function heroFrames() {
  const g = heroGrids();
  if (!FRAME_CACHE[state.skin]) FRAME_CACHE[state.skin] = Object.fromEntries(Object.entries(g).map(([k, v]) => [k, gridSVG(v)]));
  return FRAME_CACHE[state.skin];
}
// UNKNOWN's corruption: a band of rows slips sideways, and a few pixels flip.
function glitchGrid(grid) {
  const g = grid.map(r => r.slice());
  const y0 = Math.floor(Math.random() * 14), h = 1 + Math.floor(Math.random() * 3);
  const dx = (Math.random() < .5 ? -1 : 1) * (1 + Math.floor(Math.random() * 2));
  for (let y = y0; y < Math.min(16, y0 + h); y++) g[y] = grid[y].map((_, x) => !!grid[y][x - dx]);
  for (let i = 0, n = 2 + Math.floor(Math.random() * 4); i < n; i++) {
    const x = Math.floor(Math.random() * 16), y = Math.floor(Math.random() * 16);
    g[y][x] = !g[y][x];
  }
  return g;
}

// The soul that leaves the body on reset: 7x7, two frames (wavy tail).
const SOUL = [
  ['..###..', '.#####.', '##.#.##', '#######', '#######', '#.#.#.#', '.......'],
  ['..###..', '.#####.', '##.#.##', '#######', '#######', '.#.#.#.', '.......'],
].map(rows => pixelIcon(rows, 'soul'));
// One entry per 200ms tick: walk ~8s, stop, rest ~5s, stand up, repeat.
const HERO_TICK = 200;
const HERO_TIMELINE = (() => {
  const t = [];
  const hold = (frame, ticks) => { for (let i = 0; i < ticks; i++) t.push(frame); };
  for (let i = 0; i < 10; i++) ['stepL', 'pass', 'stepR', 'pass'].forEach(f => hold(f, 1));
  hold('stand', 4);
  for (let i = 0; i < 3; i++) { hold('restIn', 4); hold('restOut', 4); }
  hold('stand', 4);
  return t;
})();
// Every element marked [data-hero] (the HUD card, the options preview) shows the same frame.
const heroAnim = { tick: 0, frame: 'stand' };
function paintHero(el) {
  // UNKNOWN shows a corrupted frame about a third of the time.
  el.innerHTML = SKINS[state.skin]?.glitch && Math.random() < .35
    ? gridSVG(glitchGrid(heroGrids()[heroAnim.frame]))
    : heroFrames()[heroAnim.frame];
}
function showHeroFrame(name, force) {
  if (heroAnim.frame === name && !force) return;
  heroAnim.frame = name;
  $$('[data-hero]').forEach(paintHero);
}
function renderHero() { $$('[data-hero]').forEach(el => { if (!el.firstChild) paintHero(el); }); }
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  setInterval(() => {
    heroAnim.tick = (heroAnim.tick + 1) % HERO_TIMELINE.length;
    // UNKNOWN repaints every tick (not only when the pose changes) so it keeps glitching.
    showHeroFrame(HERO_TIMELINE[heroAnim.tick], !!SKINS[state.skin]?.glitch);
  }, HERO_TICK);
}
// 7x7 pixel icons, drawn in the surrounding text color.
function pixelIcon(rows, cls) {
  let rects = '';
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`; }));
  return `<svg class="${cls}" viewBox="0 0 7 7" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">${rects}</svg>`;
}
const CLOCK_SVG = pixelIcon(['..###..', '.#...#.', '#..#..#', '#..##.#', '#.....#', '.#...#.', '..###..'], 'q-clock');
const ICON_CHECK = pixelIcon(['......#', '.....##', '#...##.', '##.##..', '.###...', '..#....', '.......'], 'btn-icon ic-ok');
// Difficulty monsters: 12x12, two frames each. Frame 1 only shows on the selected
// difficulty, toggled by a timer on #modal-root (so re-rendering never restarts it).
function spriteRects(rows) {
  const grid = [...Array(12 - rows.length).fill('.'.repeat(12)), ...rows]; // bottom-align
  let rects = '';
  grid.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`; }));
  return rects;
}
const monsterSVG = (f0, f1) =>
  `<svg class="monster" viewBox="0 0 12 12" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true"><g class="f0">${spriteRects(f0)}</g><g class="f1">${spriteRects(f1)}</g></svg>`;
const MONSTERS = {
  easy: monsterSVG( // slime: bounces / squishes
    ['.....##.....', '....####....', '...######...', '..##.##.##..', '..########..', '.##########.', '.##########.', '............'],
    ['.....##.....', '...######...', '..########..', '.###.##.###.', '############', '############', '............'],
  ),
  medium: monsterSVG( // bat: flaps its wings
    ['#..........#', '##........##', '###.#..#.###', '############', '.###.##.###.', '..#.####.#..', '.....##.....', '............', '............'],
    ['....#..#....', '...######...', '..##.##.##..', '.##########.', '###..##..###', '##........##', '#..........#', '............'],
  ),
  hard: monsterSVG( // horned skull boss: chomps
    ['#..........#', '##.######.##', '.##########.', '.##########.', '.#..####..#.', '.#..####..#.', '.####..####.', '..########..', '..#.#..#.#..', '...######...', '............', '............'],
    ['#..........#', '##.######.##', '.##########.', '.##########.', '.#..####..#.', '.#..####..#.', '.####..####.', '..########..', '..#.#..#.#..', '............', '..#.#..#.#..', '...######...'],
  ),
};
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  setInterval(() => $('#modal-root').classList.toggle('mf1'), 400);
}

const ICON_X = pixelIcon(['#.....#', '##...##', '.##.##.', '..###..', '.##.##.', '##...##', '#.....#'], 'btn-icon ic-cancel');

// 7x6 pixel heart; '+' is the highlight pixel on a full heart.
const HEART = [
  '.##.##.',
  '#+#####',
  '#######',
  '.#####.',
  '..###..',
  '...#...',
];
function heartSVG(full) {
  let rects = '';
  HEART.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    const cls = ch === '+' && full ? 'hl' : 'px';
    rects += `<rect class="${cls}" x="${x}" y="${y}" width="1" height="1"/>`;
  }));
  // 'lost', not 'empty': .empty is the dashed "no quests" box and would restyle the heart.
  return `<svg class="heart ${full ? 'full' : 'lost'}" viewBox="0 0 7 6" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

// ---------------------------------------------------------------- render: main screen
// Only the active quest log is shown: there is no tab navigation (ui.tab stays 0).
function render() { renderHUD(); renderList(); renderPrompts(); }

function renderHUD() {
  const p = state.player, need = xpNeed(p.level);
  renderHero();
  $('#hud-name').textContent = state.name;
  $('#hud-level').textContent = p.level;
  $('#hud-xp-text').textContent = isMaxLevel() ? 'MAX' : `${p.xp} / ${need}`;
  $('#hud-xp-fill').style.width = (isMaxLevel() ? 100 : Math.min(100, p.xp / need * 100)) + '%';
  applyHeroColor();
  $('#hud-hearts').innerHTML = Array.from({ length: MAX_HP }, (_, i) => heartSVG(i < p.hp)).join('');
}


function questHTML(q, selected, now) {
  const d = DIFF[q.diff];
  let right = '', meta, fuse = '', urg = '';
  if (q.status === 'active') {
    const ms = q.deadline - now;
    const span = Math.max(1, q.deadline - (q.startAt || q.createdAt));
    const pct = Math.max(0, Math.min(100, ms / span * 100));
    urg = urgency(ms);
    // Remaining time on the left, the shrinking time bar right next to it.
    fuse = `<div class="q-time">${CLOCK_SVG}<span class="q-timer" data-timer>${fmtCountdown(ms)}</span><div class="q-fuse"><span data-fuse style="width:${pct}%"></span></div></div>`;
    meta = `PRAZO FINAL ${fmtDay(q.deadline)} · <b>+${d.xp} XP</b>`;
  } else if (q.status === 'done') {
    right = `<div class="q-stamp clear">CLEAR!</div>`;
    meta = `CONCLUIDA ${fmtDate(q.completedAt)} · <b>+${q.xpEarned ?? d.xp} XP</b>`;
  } else {
    right = `<div class="q-stamp fail">FAILED</div>`;
    meta = `PRAZO EXPIROU ${fmtDay(q.deadline)} · -1 HP`;
  }
  return `<li class="quest d-${q.diff} s-${q.status} ${selected ? 'selected' : ''} ${urg}" data-id="${q.id}">
    <div class="q-cursor">▶</div>
    <div class="q-badge">${d.label}</div>
    <div class="q-main"><div class="q-title">${esc(q.title)}</div><div class="q-meta">${meta}</div>${fuse}</div>
    ${right}
  </li>`;
}

function itemHTML(it, selected, now) {
  const sel = selected ? 'selected' : '';
  switch (it.type) {
    case 'quest': return questHTML(it.q, selected, now);
    case 'new':   return `<li class="menu-row new-row ${sel}"><div class="q-cursor">▶</div>+ NOVA QUEST</li>`;
    case 'sound': return `<li class="menu-row ${sel}"><div class="q-cursor">▶</div>SOM<span class="row-val">${state.sound ? 'LIGADO' : 'DESLIGADO'}</span></li>`;
    case 'help':  return `<li class="menu-row ${sel}"><div class="q-cursor">▶</div>CONTROLES E REGRAS</li>`;
  }
  return '';
}

function emptyHTML() {
  const id = TABS[ui.tab].id;
  if (id === 'active') return `<li class="empty">Tudo tranquilo.<br>Tranquilo até demais...</li>`;
  if (id === 'done') return `<li class="empty">Nenhuma quest concluida ainda.</li>`;
  if (id === 'failed') return `<li class="empty">Nenhuma quest falhada. Flawless run.</li>`;
  return '';
}

function renderList() {
  const items = itemsFor(ui.tab);
  ui.cursor = Math.max(0, Math.min(ui.cursor, items.length - 1));
  const now = Date.now();
  let html = items.map((it, i) => itemHTML(it, i === ui.cursor, now)).join('');
  if (TABS[ui.tab].id !== 'system' && !listFor(ui.tab).length) html += emptyHTML();
  const el = $('#quest-list');
  el.innerHTML = html;
  const sel = el.querySelector('.selected');
  if (sel) sel.scrollIntoView({ block: 'nearest' });
}

function updateSelection() {
  $$('#quest-list > .quest, #quest-list > .menu-row').forEach((li, i) => li.classList.toggle('selected', i === ui.cursor));
  const sel = $('#quest-list .selected');
  if (sel) sel.scrollIntoView({ block: 'nearest' });
  renderPrompts();
}

function renderPrompts() {
  if (!$('#prompts').firstChild) $('#prompts').innerHTML = LEGEND;
}

// ---------------------------------------------------------------- game loop
function tick() {
  const now = Date.now(), d = new Date(now);
  $('#hud-clock').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const failedNow = [];
  for (const q of state.quests) {
    if (q.status === 'active' && q.deadline <= now) { q.status = 'failed'; q.failedAt = now; failedNow.push(q); }
  }
  if (failedNow.length) applyFails(failedNow);
  else if (TABS[ui.tab].id === 'active') {
    $$('#quest-list .quest').forEach(li => {
      const q = byId(li.dataset.id);
      if (!q || q.status !== 'active') return;
      const ms = q.deadline - now;
      const span = Math.max(1, q.deadline - (q.startAt || q.createdAt));
      li.querySelector('[data-timer]').textContent = fmtCountdown(ms);
      li.querySelector('[data-fuse]').style.width = Math.max(0, Math.min(100, ms / span * 100)) + '%';
      li.classList.remove('urgent', 'critical');
      const u = urgency(ms); if (u) li.classList.add(u);
    });
  }
  if (ui.modal && ui.modal.type === 'form' && !ui.modal.naming) {
    const el = $('#f-countdown');
    if (el) el.outerHTML = countdownHTML(ui.modal.deadline);
  }
}

function applyFails(list) {
  const p = state.player;
  p.failed += list.length;
  p.hp = Math.max(0, p.hp - list.length);
  save();
  if (ui.started) { sfx.fail(); shake(); }
  if (list.length > 2) toast(`${list.length} QUESTS FAILED`, `-${list.length} HP`, 'bad');
  else list.forEach(q => toast('QUEST FAILED', `${q.title} · -1 HP`, 'bad'));
  // A command menu for a quest that just failed no longer makes sense.
  if (ui.modal && ui.modal.type === 'command' && list.some(q => q.id === ui.modal.id)) closeModal(true);
  render();
  if (p.hp <= 0 && ui.started) openGameOver();
}

function gainXp(n) {
  const p = state.player;
  if (p.level >= MAX_LEVEL) return; // LV 100 is the top: XP no longer counts
  p.xp += n;
  let up = false;
  while (p.xp >= xpNeed(p.level) && p.level < MAX_LEVEL) { p.xp -= xpNeed(p.level); p.level++; up = true; }
  if (p.level >= MAX_LEVEL) p.xp = 0;
  if (up) {
    p.hp = Math.min(MAX_HP, p.hp + 1); // a level gives back one heart, never above the max
    const level = p.level, fact = level >= MAX_LEVEL ? null : PHRASES[Math.min(level - 2, PHRASES.length - 1)];
    // Show the card once the clear animation is over.
    setTimeout(() => openLevelUp(level, fact), 450);
  }
}
const isMaxLevel = () => state.player.level >= MAX_LEVEL;
// The chosen color only shows once it's unlocked (a reset locks it again).
function applyHeroColor() {
  const c = isMaxLevel() && HERO_COLORS[state.color] ? HERO_COLORS[state.color].hex : HERO_COLORS.white.hex;
  document.documentElement.style.setProperty('--hero', c);
}

// ---------------------------------------------------------------- actions
function completeQuest(q) {
  const li = $(`#quest-list .quest[data-id="${q.id}"]`);
  ui.busy = true;
  sfx.complete();
  if (li) li.classList.add('clearing');
  setTimeout(() => {
    const xp = DIFF[q.diff].xp;
    q.status = 'done'; q.completedAt = Date.now(); q.xpEarned = xp;
    state.player.completed++;
    toast('QUEST COMPLETE!', `${q.title} · +${xp} XP`, 'good');
    gainXp(xp);
    save(); render();
    ui.busy = false;
  }, 420);
}

function deleteQuest(id) {
  state.quests = state.quests.filter(q => q.id !== id);
  save(); render();
}

function mainInput(b) {
  const items = itemsFor(ui.tab);
  const it = items[ui.cursor];
  switch (b) {
    case 'up':
    case 'down': {
      if (!items.length) return;
      const next = Math.max(0, Math.min(items.length - 1, ui.cursor + (b === 'down' ? 1 : -1)));
      if (next !== ui.cursor) { ui.cursor = next; sfx.move(); updateSelection(); }
      return;
    }
    case 'a':
      if (!it) return sfx.error();
      if (it.type === 'new') return openForm(null);
      if (it.type === 'quest') return openCommand(it.q);
      if (it.type === 'sound') { state.sound = !state.sound; save(); sfx.confirm(); return render(); }
      if (it.type === 'help') return openHelp();
      return;
    case 'b': // back to the title menu
      ui.started = false;
      title.screen = 'menu'; title.sel = 0;
      renderTitle();
      $('#title-screen').classList.remove('hidden');
      sfx.close();
      return;
  }
}

// ---------------------------------------------------------------- modals
function closeModal(silent) {
  ui.modal = null;
  $('#modal-root').innerHTML = '';
  if (!silent) sfx.close();
  // A level-up that happened while another window was open shows up right after it.
  if (ui.pendingLevelUp) { const l = ui.pendingLevelUp; ui.pendingLevelUp = null; openLevelUp(l.level, l.fact); }
}

// Every 10 levels: after the phrase, the new skin, standing, with where to switch to it.
function skinUnlockHTML(skin) {
  const stand = gridSVG(buildGrids(skin).stand);
  return `<div class="lu-skin">
    <div class="lu-skin-art">${stand}</div>
    <div class="lu-skin-text">SKIN DESBLOQUEADA!<b>${SKINS[skin].label}</b><small>TROQUE EM OPÇÕES NA TELA INICIAL.</small></div>
  </div>`;
}

/* --- level up: reward card with a motivational phrase --- */
function openLevelUp(level, fact) {
  if (ui.modal || !ui.started) { ui.pendingLevelUp = { level, fact }; return; }
  ui.modal = { type: 'levelup' };
  // LV 100 is the surprise: no phrase, just congratulations and the color unlock.
  const body = level >= MAX_LEVEL
    ? `<div class="lu-unlock lu-congrats">PARABÉNS!</div>
       <div class="lu-box lu-max">
         VOCÊ CHEGOU AO NIVEL MAXIMO E DESBLOQUEOU A TROCA DE COR DO PERSONAGEM.
         <small>ESTÁ NAS OPÇÕES DA TELA INICIAL.</small>
       </div>
       ${skinUnlockHTML('cat')}`
    : `<div class="lu-unlock">SABEDORIA DESBLOQUEADA!</div>
       <div class="lu-box"><p class="lu-fact">${esc(fact)}</p></div>
       ${skinUnlockedAt(level) ? skinUnlockHTML(skinUnlockedAt(level)) : ''}`;
  $('#modal-root').innerHTML = `
  <div class="modal levelup-modal" role="dialog">
    <div class="lu-title">LEVEL UP!</div>
    <div class="lu-level">LV. ${level} · +1 HP</div>
    ${body}
    <div class="f-row active"><div class="f-btns"><div class="f-btn ok on">${ICON_CHECK}CONTINUAR</div></div></div>
  </div>`;
  sfx.levelup();
}
// Menu icons, 7x7, in the option's own color (gray when not selected).
const OPT_ICONS = {
  complete: pixelIcon(['......#', '.....##', '#...##.', '##.##..', '.###...', '..#....', '.......'], 'opt-icon'),
  edit:     pixelIcon(['.....##', '....###', '...###.', '..###..', '.###...', '.##....', '#......'], 'opt-icon'),
  delete:   pixelIcon(['#.....#', '##...##', '.##.##.', '..###..', '.##.##.', '##...##', '#.....#'], 'opt-icon'),
  back:     pixelIcon(['..#....', '.##....', '######.', '.##..#.', '..#..#.', '.....#.', '..####.'], 'opt-icon'),
};
function optionsHTML(opts, sel) {
  return `<div class="opts">${opts.map((o, i) =>
    `<div class="opt ${i === sel ? 'on' : ''} ${o.cls || ''}">${OPT_ICONS[o.act] || ''}${o.label}</div>`).join('')}</div>`;
}

/* --- quest command menu --- */
function openCommand(q) {
  const opts = q.status === 'active'
    ? [{ label: 'CONCLUIR', act: 'complete', cls: 'c-easy' }, { label: 'EDITAR', act: 'edit' }, { label: 'ABANDONAR', act: 'delete', cls: 'c-hard' }, { label: 'VOLTAR', act: 'back' }]
    : q.status === 'failed'
      ? [{ label: 'TENTAR DE NOVO', act: 'retry', cls: 'c-easy' }, { label: 'APAGAR', act: 'delete', cls: 'c-hard' }, { label: 'VOLTAR', act: 'back' }]
      : [{ label: 'APAGAR', act: 'delete', cls: 'c-hard' }, { label: 'VOLTAR', act: 'back' }];
  ui.modal = { type: 'command', id: q.id, opts, sel: 0 };
  sfx.open(); renderCommand();
}
function renderCommand() {
  const m = ui.modal, q = byId(m.id);
  $('#modal-root').innerHTML = `
  <div class="modal cmd-modal" role="dialog">
    <div class="modal-head"><span class="modal-kicker">${DIFF[q.diff].label} · ${q.status === 'active' ? 'ATIVA' : q.status === 'done' ? 'CONCLUIDA' : 'FALHADA'}</span>
    <h2>${esc(q.title)}</h2></div>
    ${optionsHTML(m.opts, m.sel)}
  </div>`;
}
function commandInput(b) {
  const m = ui.modal, q = byId(m.id);
  if (!q) return closeModal(true);
  if (b === 'up' || b === 'down') { m.sel = wrap(m.sel + (b === 'down' ? 1 : -1), m.opts.length); sfx.move(); return renderCommand(); }
  if (b === 'b') return closeModal();
  if (b !== 'a') return;
  switch (m.opts[m.sel].act) {
    case 'complete': closeModal(true); return completeQuest(q);
    case 'edit': case 'retry': return openForm(q);
    case 'delete': return openConfirm(q);
    case 'back': return closeModal();
  }
}

/* --- quest form --- */
function openForm(q) {
  const retry = !!q && q.status === 'failed';
  ui.modal = {
    type: 'form', editId: q ? q.id : null, retry,
    createdAt: q ? q.createdAt : Date.now(), // shown read-only next to the deadline
    title: q ? q.title : '',
    diff: q ? q.diff : 'medium',
    deadline: q && !retry ? new Date(q.deadline) : defaultDeadline(),
    row: retry ? 2 : 0, error: '', btn: 0, // btn: 0 = accept, 1 = cancel
    editingDate: false, seg: 0,
    naming: !q,
  };
  sfx.open(); renderForm();
}

function countdownHTML(deadline) {
  const ms = deadline - Date.now();
  return `<div class="f-countdown ${ms > 0 ? '' : 'bad'}" id="f-countdown">${ms > 0 ? `faltam ${fmtCountdown(ms)}` : 'ESSA DATA JÁ PASSOU'}</div>`;
}

function renderForm() {
  const m = ui.modal;
  if (m.naming) return renderName();
  const head = m.retry ? ['RETRY', 'TENTAR DE NOVO'] : m.editId ? ['EDITAR', 'EDITAR QUEST'] : ['NOVA', 'NOVA QUEST'];
  const row = (key, label, body) =>
    `<div class="f-row r-${key} ${FORM_ROWS[m.row] === key ? 'active' : ''}"><div class="f-label">${label}</div>${body}</div>`;
  const d = m.deadline;
  const segVals = [pad(d.getDate()), pad(d.getMonth() + 1), d.getFullYear()];
  const c = new Date(m.createdAt);
  const createdText = `${pad(c.getDate())}/${pad(c.getMonth() + 1)}/${c.getFullYear()}`;
  const seg = i => `<span class="seg ${m.editingDate && m.seg === i ? 'on' : ''}">${segVals[i]}</span>`;

  // A new quest doesn't need the countdown yet; only warn if the chosen date is already past.
  const showCountdown = m.editId || d.getTime() <= Date.now();
  const dateHint = m.editingDate ? `<div class="f-hint">← → ${DATE_SEGS[m.seg]} · ↑ ↓ AJUSTA</div>` : '';

  $('#modal-root').innerHTML = `
  <div class="modal form-modal" role="dialog">
    <div class="modal-head"><span class="modal-kicker">${head[0]}</span><h2>${head[1]}</h2></div>
    ${row('name', 'NOME', `<div class="f-val">${m.title ? esc(m.title) : '<span class="ph">— SEM NOME —</span>'}</div>`)}
    ${row('diff', 'DIFICULDADE', `<div class="diff-pick">${DIFFS.map(k =>
      `<div class="diff-opt d-${k} ${m.diff === k ? 'on' : ''}">${MONSTERS[k]}${DIFF[k].label}<small>+${DIFF[k].xp} XP</small></div>`).join('')}</div>`)}
    ${row('date', '', `<div class="date-cols">
      <div class="created">
        <div class="f-label">CRIADO EM</div>
        <div class="created-val">${createdText}</div>
      </div>
      <div>
        <div class="f-label">PRAZO FINAL</div>
        <div class="date-line"><div class="f-val date ${m.editingDate ? 'editing' : ''}">${seg(0)}/${seg(1)}/${seg(2)}</div>${showCountdown ? countdownHTML(d) : ''}</div>${dateHint}
      </div>
    </div>`)}
    ${row('actions', '', `<div class="f-btns">
      <div class="f-btn ok ${m.btn === 0 ? 'on' : ''}">${ICON_CHECK}${m.retry ? 'REINICIAR QUEST' : m.editId ? 'SALVAR' : 'ACEITAR QUEST'}</div>
      <div class="f-btn cancel ${m.btn === 1 ? 'on' : ''}">${ICON_X}CANCELAR</div>
    </div>`)}
    <div class="f-error">${m.error}</div>
  </div>`;
}

function adjustDate(dir) {
  const m = ui.modal, d = new Date(m.deadline);
  switch (m.seg) {
    case 0: d.setDate(d.getDate() + dir); break;
    case 1: d.setMonth(d.getMonth() + dir); break;
    case 2: d.setFullYear(d.getFullYear() + dir); break;
  }
  atDeadlineHour(d);
  m.deadline = d;
}

function formInput(b) {
  const m = ui.modal;
  m.error = '';
  if (m.editingDate) {
    if (b === 'left' || b === 'right') { m.seg = wrap(m.seg + (b === 'right' ? 1 : -1), DATE_SEGS.length); sfx.move(); }
    else if (b === 'up' || b === 'down') { adjustDate(b === 'up' ? 1 : -1); sfx.move(); }
    else { m.editingDate = false; sfx.confirm(); }
    return renderForm();
  }
  const key = FORM_ROWS[m.row];
  if (b === 'up' || b === 'down') { m.row = wrap(m.row + (b === 'down' ? 1 : -1), FORM_ROWS.length); sfx.move(); return renderForm(); }
  if (b === 'b') return closeModal();
  if (b === 'left' || b === 'right') {
    const dir = b === 'right' ? 1 : -1;
    if (key === 'diff') { m.diff = DIFFS[wrap(DIFFS.indexOf(m.diff) + dir, 3)]; sfx.move(); }
    else if (key === 'actions') { m.btn = 1 - m.btn; sfx.move(); }
    else return;
    return renderForm();
  }
  if (b !== 'a') return;
  switch (key) {
    case 'name': m.naming = true; sfx.open(); break;
    case 'diff': m.row++; sfx.move(); break;
    case 'date': m.editingDate = true; m.seg = 0; sfx.open(); break;
    case 'actions': return m.btn === 0 ? submitForm() : closeModal();
  }
  renderForm();
}

function formError(msg, rowKey) {
  const m = ui.modal;
  m.error = msg; m.row = FORM_ROWS.indexOf(rowKey);
  sfx.error(); renderForm(); shake($('.form-modal'));
}
function submitForm() {
  const m = ui.modal;
  const title = m.title.trim();
  if (!title) return formError('A QUEST PRECISA DE UM NOME', 'name');
  if (m.deadline.getTime() <= Date.now()) return formError('O PRAZO PRECISA SER NO FUTURO', 'date');

  const now = Date.now(), dl = m.deadline.getTime();
  let id;
  if (m.editId) {
    const q = byId(m.editId);
    if (q) {
      id = q.id;
      q.title = title; q.diff = m.diff;
      if (q.deadline !== dl || m.retry) { q.deadline = dl; q.startAt = now; }
      if (m.retry) { q.status = 'active'; delete q.failedAt; }
    }
    toast(m.retry ? 'QUEST REINICIADA' : 'QUEST ATUALIZADA', title, 'info');
  } else {
    id = uid();
    state.quests.push({ id, title, diff: m.diff, deadline: dl, createdAt: now, startAt: now, status: 'active' });
    toast('QUEST ACEITA!', `${title} · ${DIFF[m.diff].label} · +${DIFF[m.diff].xp} XP`, 'info');
  }
  save(); sfx.confirm();
  closeModal(true);
  ui.tab = 0;
  ui.cursor = Math.max(0, itemsFor(0).findIndex(it => it.q && it.q.id === id));
  render();
}

/* --- quest name: typed on the real keyboard --- */
// The one screen where every key types. ENTER confirms, ESC goes back.
function renderName() {
  const m = ui.modal;
  m.nameBefore = m.title;
  $('#modal-root').innerHTML = `
  <div class="modal name-modal" role="dialog">
    <div class="modal-head"><span class="modal-kicker">NOME DA QUEST</span><h2>DIGITE O NOME</h2></div>
    <div class="name-field">
      <input id="name-input" class="name-display" maxlength="${NAME_MAX}" autocomplete="off" spellcheck="false" value="${esc(m.title)}">
      <span class="name-caret" id="name-caret" aria-hidden="true"></span>
    </div>
    <div class="name-foot"><span>ENTER CONFIRMA · ESC VOLTA</span><span id="name-count">${m.title.length}/${NAME_MAX}</span></div>
  </div>`;
  const input = $('#name-input');
  input.addEventListener('input', () => {
    m.title = input.value;
    $('#name-count').textContent = `${input.value.length}/${NAME_MAX}`;
    placeCaret();
  });
  // The native caret is a 1px line; we draw our own thick pixel bar instead.
  ['keydown', 'keyup', 'mouseup', 'focus', 'select'].forEach(ev =>
    input.addEventListener(ev, () => requestAnimationFrame(placeCaret)));
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
  placeCaret();
}

// Press Start 2P is monospaced (every glyph is 1em wide), so the caret's x is just
// padding + characters before it, minus how far the field has scrolled.
function placeCaret() {
  const input = $('#name-input'), caret = $('#name-caret');
  if (!input || !caret) return;
  const cs = getComputedStyle(input);
  const cw = parseFloat(cs.fontSize);
  const x = parseFloat(cs.paddingLeft) + 1 + (input.selectionEnd ?? input.value.length) * cw - input.scrollLeft;
  caret.style.left = Math.max(0, Math.min(x, input.clientWidth - 4)) + 'px';
  // Like a real caret: stay solid while typing/moving, restart the blink afterwards.
  caret.style.animation = 'none';
  void caret.offsetWidth;
  caret.style.animation = '';
}

function finishName() {
  const m = ui.modal;
  m.title = m.title.trim();
  m.naming = false;
  if (m.title && m.row === 0) m.row = 1; // jump straight to difficulty
  sfx.confirm(); renderForm();
}

function nameKey(e) {
  const m = ui.modal;
  if (e.key === 'Enter') { e.preventDefault(); return finishName(); }
  if (e.key === 'Escape') {
    e.preventDefault();
    m.title = m.nameBefore;
    if (!m.editId && !m.title) return closeModal(); // brand-new quest, nothing typed: cancel it
    m.naming = false; sfx.close(); return renderForm();
  }
  // Everything else is ordinary typing in the input.
}

/* --- confirm --- */
function openConfirm(q) {
  ui.modal = { type: 'confirm', id: q.id, abandon: q.status === 'active', sel: 1 };
  sfx.open(); renderConfirm();
}
function renderConfirm() {
  const m = ui.modal, q = byId(m.id);
  $('#modal-root').innerHTML = `
  <div class="modal confirm-modal" role="alertdialog">
    <div class="modal-head"><span class="modal-kicker">${m.abandon ? 'ABANDONAR' : 'APAGAR'}</span>
    <h2>${m.abandon ? 'ABANDONAR ESTA QUEST?' : 'APAGAR DO REGISTRO?'}</h2></div>
    <div class="q-name">“${esc(q.title)}”</div>
    <div class="choice">${['SIM', 'NÃO'].map((l, i) => `<div class="${i === m.sel ? 'on' : ''}">${l}</div>`).join('')}</div>
  </div>`;
}
function confirmInput(b) {
  const m = ui.modal;
  if (['left', 'right', 'up', 'down'].includes(b)) { m.sel = 1 - m.sel; sfx.move(); return renderConfirm(); }
  const yes = b === 'a' && m.sel === 0;
  const id = m.id;
  closeModal(yes);
  if (yes) { deleteQuest(id); sfx.error(); toast('QUEST REMOVIDA', 'Sem XP, sem penalidade.', 'info'); }
}

/* --- help --- */
function openHelp() {
  ui.modal = { type: 'help' };
  $('#modal-root').innerHTML = `
  <div class="modal help-modal" role="dialog">
    <div class="modal-head"><span class="modal-kicker">MANUAL</span><h2>CONTROLES</h2></div>
    <div class="help-grid">
      <span class="keys"><span class="dpad"></span></span><span>SETAS · mover o cursor e trocar de aba</span>
      <span class="keys"><span class="btn">Z</span></span><span>selecionar, confirmar, inserir letra</span>
      <span class="keys"><span class="btn">X</span></span><span>voltar, cancelar, apagar letra</span>
    </div>
    <div class="help-rules">
      <b>COMO JOGAR</b><br>
      Em ATIVAS, escolha <b>+ NOVA QUEST</b> e aperte Z.
      O nome é escrito no teclado da tela: setas escolhem a letra, Z insere, X apaga. Escolha <b>FIM</b> para terminar.
      No <b>PRAZO</b>, Z entra na edição: ← → escolhe dia, mês, ano, hora ou minuto; ↑ ↓ ajusta.
      Aperte Z numa quest para concluir, editar ou abandonar.
      <br><br>
      <b>REGRAS</b><br>
      EASY vale <b>+10 XP</b>, MEDIUM <b>+25 XP</b>, HARD <b>+50 XP</b>.
      Cada quest que passa do prazo custa <b>1 ♥</b>. Subir de nivel devolve 1 ♥ (maximo 3).
      Se o HP chegar a zero: <b class="c-hard">GAME OVER</b>.
    </div>
  </div>`;
  sfx.open();
}

/* --- game over --- */
// HP hit zero: the hero dies on a black screen (fall + soul), then the GAME OVER screen.
// skipDeath: the app was opened already at zero HP, so go straight to GAME OVER.
function openGameOver(skipDeath) {
  if (ui.modal && ui.modal.type === 'gameover') return;
  ui.modal = { type: 'gameover', ready: false };
  if (skipDeath) return showGameOverScreen();
  $('#modal-root').innerHTML = `<div class="gameover"><div class="t-hero death-hero" id="death-hero"></div></div>`;
  animateDeath($('#death-hero'), showGameOverScreen);
}
function showGameOverScreen() {
  if (!ui.modal || ui.modal.type !== 'gameover') return;
  const p = state.player;
  $('#modal-root').innerHTML = `
  <div class="gameover">
    <div>
      <h1 class="go-title">GAME OVER</h1>
      <p class="go-text">Seu HP chegou a zero. Prazos demais ficaram para trás.</p>
      <div class="go-stats"><span>LV ${p.level}</span><span class="c-easy">CLEAR ${p.completed}</span><span class="c-hard">FAIL ${p.failed}</span></div>
      <p class="press">CONTINUE? ${btnA('')}</p>
      <p class="go-small">Continuar restaura o HP, mas o XP do nivel atual é perdido.</p>
    </div>
  </div>`;
  sfx.gameover();
  setTimeout(() => { if (ui.modal) ui.modal.ready = true; }, 900); // avoid skipping it by accident
}
function gameOverInput(b) {
  if (b !== 'a' || !ui.modal.ready) return;
  state.player.hp = MAX_HP;
  state.player.xp = 0;
  save(); closeModal(true); sfx.start();
  toast('CONTINUE!', 'HP restaurado. Não deixe os prazos passarem.', 'gold');
  render();
}

function modalInput(b) {
  switch (ui.modal.type) {
    case 'command': return commandInput(b);
    case 'form': return formInput(b);
    case 'confirm': return confirmInput(b);
    case 'gameover': return gameOverInput(b);
    case 'help': if (b === 'a' || b === 'b') closeModal(); return;
    case 'levelup': if (b === 'a' || b === 'b') { closeModal(true); sfx.confirm(); } return;
  }
}

// ---------------------------------------------------------------- input: arrows + A (Z) + B (X), nothing else
function readButton(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  switch (e.key) {
    case 'ArrowUp': return 'up';
    case 'ArrowDown': return 'down';
    case 'ArrowLeft': return 'left';
    case 'ArrowRight': return 'right';
  }
  const k = e.key.toLowerCase();
  if (k === KEY_A) return 'a';
  if (k === KEY_B) return 'b';
  return null;
}

function startGame() {
  ui.started = true;
  $('#title-screen').classList.add('hidden');
  sfx.start();
  render();
  if (state.player.hp <= 0) openGameOver(true);
  else if (ui.pendingLevelUp) { const l = ui.pendingLevelUp; ui.pendingLevelUp = null; openLevelUp(l.level, l.fact); }
}

// ---------------------------------------------------------------- title screen: START / OPÇÕES
// screen: 'menu' | 'options' | 'setup' | 'naming' | 'confirm' (reset) | 'save' (new hero) | 'dying'
// flow: which screen the name entry returns to ('options' or 'setup').
const title = { screen: 'menu', flow: 'options', sel: 0, opt: 0, yes: 1, error: '' };
// Before the first hero is created (first run or after a reset), the menu offers only START.
const titleMenu = () => (state.setupDone ? ['START', 'OPÇÕES'] : ['START']);
// COR only exists from LV 100 on: until then it's a secret, not a locked row.
const optRows = () => (isMaxLevel()
  ? ['sound', 'name', 'skin', 'color', 'reset', 'back']
  : ['sound', 'name', 'skin', 'reset', 'back']);
// First START (or after a reset): create the hero before playing.
const SETUP_ROWS = ['name', 'done']; // every hero starts as TRABALHADOR: only the name is chosen
const TRI_L = pixelIcon(['....#..', '...##..', '..###..', '.####..', '..###..', '...##..', '....#..'], 'tri');
const TRI_R = pixelIcon(['..#....', '..##...', '..###..', '..####.', '..###..', '..##...', '..#....'], 'tri');

function renderTitle() {
  const t = title, el = $('#title-inner');
  el.classList.remove('dying');
  // Control legend on the menus; not while typing a name or during the reset animation.
  const showLegend = t.screen !== 'naming' && t.screen !== 'dying';
  $('#title-prompts').innerHTML = showLegend ? LEGEND : '';
  if (t.screen === 'menu') {
    el.innerHTML = `
      <div class="title-sub">Your corporate journey</div>
      <h1 class="title-logo">TaskQuest</h1>
      <div class="t-menu">${titleMenu().map((l, i) => `<div class="t-opt ${i === t.sel ? 'on' : ''}">${l}</div>`).join('')}</div>`;
    return;
  }
  let body;
  if (t.screen === 'naming') {
    body = `
      <div class="t-name">
        <div class="f-label">NOME DO PERSONAGEM</div>
        <div class="name-field">
          <input id="name-input" class="name-display" maxlength="${HERO_NAME_MAX}" autocomplete="off" spellcheck="false" value="${esc(state.name)}">
          <span class="name-caret" id="name-caret" aria-hidden="true"></span>
        </div>
        <div class="name-foot"><span>ENTER CONFIRMA · ESC VOLTA</span><span id="name-count">${state.name.length}/${HERO_NAME_MAX}</span></div>
      </div>`;
  } else if (t.screen === 'save') {
    body = `
      <div class="t-confirm">
        <p class="t-q t-q-save">SALVAR PERSONAGEM?</p>
        <p class="t-sub">${esc(state.name)} · ${SKINS[state.skin].label}</p>
        <div class="choice">${['SIM', 'NÃO'].map((l, i) => `<div class="${i === t.yes ? 'on' : ''}">${l}</div>`).join('')}</div>
      </div>`;
  } else if (t.screen === 'setup') {
    const row = (key, label, val = '') =>
      `<div class="t-row ${SETUP_ROWS[t.opt] === key ? 'on' : ''}"><span>${label}</span><span class="t-val">${val}</span></div>`;
    body = `<div class="t-rows">
      ${row('name', 'NOME', state.name ? esc(state.name) : '<span class="t-empty">APERTE Z</span>')}
      <div class="t-opt t-done ${SETUP_ROWS[t.opt] === 'done' ? 'on' : ''}">CONFIRMAR</div>
      <div class="t-error">${t.error}</div>
    </div>`;
  } else if (t.screen === 'confirm' || t.screen === 'dying') {
    body = `
      <div class="t-confirm ${t.screen === 'dying' ? 'is-dying' : ''}">
        <p class="t-q">TEM CERTEZA?</p>
        <p class="t-sub">LV, XP E HP VOLTAM AO INICIO.<br>TODAS AS QUESTS SERÃO APAGADAS.</p>
        <div class="choice">${['SIM', 'NÃO'].map((l, i) => `<div class="${i === t.yes ? 'on' : ''}">${l}</div>`).join('')}</div>
      </div>`;
  } else {
    const row = (key, label, val = '') =>
      `<div class="t-row ${optRows()[t.opt] === key ? 'on' : ''}"><span>${label}</span><span class="t-val">${val}</span></div>`;
    body = `<div class="t-rows">
      ${row('sound', 'SOM', state.sound ? 'LIGADO' : 'DESLIGADO')}
      ${row('name', 'NOME', esc(state.name))}
      ${row('skin', 'SKIN', unlockedSkins().length > 1
        ? `${TRI_L}<span class="t-skin">${SKINS[state.skin].label}</span>${TRI_R}`
        : SKINS[state.skin].label)}
      ${isMaxLevel() ? row('color', 'COR', `${TRI_L}<span class="t-skin">${HERO_COLORS[state.color || 'white'].label}</span>${TRI_R}`) : ''}
      ${row('reset', 'RESET')}
      ${row('back', 'VOLTAR')}
    </div>`;
  }
  el.innerHTML = `
    <div class="t-head">${t.flow === 'setup' ? 'NOVO PERSONAGEM' : 'OPÇÕES'}</div>
    <div class="hero-card t-hero" id="t-hero" data-hero></div>
    ${body}`;
  el.classList.toggle('dying', t.screen === 'dying');
  renderHero();
  if (t.screen === 'naming') {
    const input = $('#name-input');
    input.addEventListener('input', () => { $('#name-count').textContent = `${input.value.length}/${HERO_NAME_MAX}`; placeCaret(); });
    ['keydown', 'keyup', 'mouseup', 'focus', 'select'].forEach(ev => input.addEventListener(ev, () => requestAnimationFrame(placeCaret)));
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    placeCaret();
  }
}

function titleInput(b) {
  const t = title;
  if (t.screen === 'dying') return;
  if (t.screen === 'menu') {
    if (b === 'up' || b === 'down') {
      const n = titleMenu().length;
      if (n < 2) return;
      t.sel = wrap(t.sel + (b === 'down' ? 1 : -1), n); sfx.move(); return renderTitle();
    }
    if (t.sel >= titleMenu().length) t.sel = 0;
    if (b !== 'a') return;
    if (t.sel === 0) {
      if (state.setupDone) return startGame();
      state.skin = 'worker'; // new heroes start as TRABALHADOR
      t.flow = 'setup'; t.screen = 'setup'; t.opt = 0; t.error = ''; sfx.open(); renderTitle();
      showHeroFrame(heroAnim.frame, true); return;
    }
    t.flow = 'options'; t.screen = 'options'; t.opt = 0; sfx.open(); return renderTitle();
  }
  if (t.screen === 'save') {
    if (b === 'left' || b === 'right') { t.yes = 1 - t.yes; sfx.move(); return renderTitle(); }
    if (b === 'b' || (b === 'a' && t.yes === 1)) { t.screen = 'setup'; sfx.close(); return renderTitle(); }
    if (b === 'a') {
      state.setupDone = true; save();
      t.screen = 'menu'; t.flow = 'options'; renderTitle();
      return startGame();
    }
    return;
  }
  if (t.screen === 'setup') {
    // Nothing is saved until the confirmation screen says SIM.
    const key = SETUP_ROWS[t.opt];
    if (b === 'up' || b === 'down') { t.opt = wrap(t.opt + (b === 'down' ? 1 : -1), SETUP_ROWS.length); t.error = ''; sfx.move(); return renderTitle(); }
    if (b === 'b') { t.screen = 'menu'; t.flow = 'options'; sfx.close(); return renderTitle(); }
    if (b !== 'a') return;
    if (key === 'name') { t.screen = 'naming'; sfx.open(); return renderTitle(); }
    if (key === 'done') {
      if (!state.name) { t.error = 'DIGITE UM NOME'; sfx.error(); return renderTitle(); }
      t.screen = 'save'; t.yes = 0; sfx.open(); return renderTitle();
    }
    return;
  }
  if (t.screen === 'confirm') {
    if (b === 'left' || b === 'right') { t.yes = 1 - t.yes; sfx.move(); return renderTitle(); }
    if (b === 'b' || (b === 'a' && t.yes === 1)) { t.screen = 'options'; sfx.close(); return renderTitle(); }
    if (b === 'a') return playDeath();
    return;
  }
  // options
  const rows = optRows(), key = rows[t.opt];
  if (b === 'up' || b === 'down') { t.opt = wrap(t.opt + (b === 'down' ? 1 : -1), rows.length); sfx.move(); return renderTitle(); }
  if (b === 'b') { t.screen = 'menu'; sfx.close(); return renderTitle(); }
  if (key === 'sound' && (b === 'a' || b === 'left' || b === 'right')) {
    state.sound = !state.sound; save(); sfx.confirm(); return renderTitle();
  }
  if (key === 'skin' && (b === 'a' || b === 'left' || b === 'right')) {
    // Only the skins this level has unlocked.
    const list = unlockedSkins();
    if (list.length < 2) return sfx.error();
    const i = Math.max(0, list.indexOf(state.skin));
    state.skin = list[wrap(i + (b === 'left' ? -1 : 1), list.length)];
    save(); sfx.move(); renderTitle(); showHeroFrame(heroAnim.frame, true); return;
  }
  if (key === 'color' && (b === 'a' || b === 'left' || b === 'right')) {
    const i = Math.max(0, COLOR_KEYS.indexOf(state.color || 'white'));
    state.color = COLOR_KEYS[wrap(i + (b === 'left' ? -1 : 1), COLOR_KEYS.length)];
    save(); sfx.move(); applyHeroColor(); return renderTitle();
  }
  if (b !== 'a') return;
  if (key === 'name') { t.screen = 'naming'; t.nameBefore = state.name; sfx.open(); return renderTitle(); }
  if (key === 'reset') { t.screen = 'confirm'; t.yes = 1; sfx.open(); return renderTitle(); }
  if (key === 'back') { t.screen = 'menu'; sfx.close(); return renderTitle(); }
}

// Naming the hero: the real keyboard types. ENTER confirms, ESC keeps the old name.
function titleNameKey(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    const v = $('#name-input').value.trim().toUpperCase();
    if (v) state.name = v;
    if (title.flow === 'options') save(); // the new-hero flow saves only on confirmation
    render(); sfx.confirm();
    title.error = '';
    title.screen = title.flow; return renderTitle();
  }
  if (e.key === 'Escape') { e.preventDefault(); title.screen = title.flow; sfx.close(); return renderTitle(); }
}

// Reset: the hero falls, lies on the floor, the soul floats up and fades. Then the
// character starts over and we go back to the title menu.
// The death animation, shared by RESET and by running out of HP: the hero falls, lies on
// the floor, and the soul floats up and fades. Calls onDone when it's over (~3s).
function animateDeath(card, onDone) {
  card.removeAttribute('data-hero'); // stop the walk/rest loop on this card
  const F = heroFrames();
  const at = (ms, fn) => setTimeout(fn, ms);
  sfx.fail();
  card.innerHTML = F.fall;
  at(350, () => { card.innerHTML = F.dead; });
  // The soul rises from the body in 2px steps, its tail waving, then blinks out.
  at(900, () => {
    const soul = document.createElement('div');
    soul.className = 'soul-wrap';
    card.appendChild(soul);
    let y = 0, f = 0;
    const step = setInterval(() => {
      y += 2; f = 1 - f;
      soul.innerHTML = SOUL[f];
      soul.style.transform = `translateY(${-y}px)`;
      if (y >= 36) soul.style.opacity = y >= 44 ? 0 : .5;
      if (y >= 46) clearInterval(step);
    }, 90);
  });
  at(3000, onDone);
}

function playDeath() {
  const t = title;
  t.screen = 'dying';
  renderTitle();
  const at = (ms, fn) => setTimeout(fn, ms);
  // Then GAME OVER on the black screen, and only after that back to the menu.
  animateDeath($('#t-hero'), () => {
    state.player = defaults().player;
    state.quests = []; // a fresh start: every quest goes too
    // ...and a new hero: the next START asks for a name and skin again.
    state.setupDone = false; state.name = ''; state.skin = 'worker'; state.color = 'white';
    ui.cursor = 0;
    save(); render();
    $('#title-inner').innerHTML = `<h1 class="go-title">GAME OVER</h1>`;
    sfx.gameover();
    at(2600, () => {
      t.screen = 'menu'; t.sel = 0;
      renderTitle();
    });
  });
}

document.addEventListener('keydown', e => {
  // Typing the quest name: the keyboard is a keyboard, Z and X are just letters.
  if (ui.modal && ui.modal.type === 'form' && ui.modal.naming) return nameKey(e);
  if (!ui.started && title.screen === 'naming') return titleNameKey(e);
  const b = readButton(e);
  if (!b) return;
  e.preventDefault();
  if (e.repeat && (b === 'a' || b === 'b')) return; // holding A/B shouldn't machine-gun actions
  if (!ui.started) return titleInput(b);
  if (ui.busy) return;
  if (ui.modal) return modalInput(b);
  mainInput(b);
});

// The pixel font has no arrow glyphs: wrap them so CSS can use a system font.
const ARROW = /[←→↑↓]/;
function fixArrows(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (ARROW.test(n.nodeValue) && !n.parentElement.closest('.arw')) nodes.push(n);
  }
  nodes.forEach(n => {
    const frag = document.createDocumentFragment();
    n.nodeValue.split(/([←→↑↓])/).forEach(part => {
      if (!part) return;
      if (ARROW.test(part)) { const i = document.createElement('i'); i.className = 'arw'; i.textContent = part; frag.appendChild(i); }
      else frag.appendChild(document.createTextNode(part));
    });
    n.replaceWith(frag);
  });
}
const arrowObserver = new MutationObserver(muts => muts.forEach(m => fixArrows(m.target)));
['#modal-root', '#prompts', '#title-screen'].forEach(s => {
  arrowObserver.observe($(s), { childList: true, subtree: true });
  fixArrows($(s));
});

// ---------------------------------------------------------------- fixed window size
// In the desktop shortcut (an Edge app window) the window snaps back to exactly fit the
// 360×480 screen whenever it's resized. In a normal browser tab resizeTo is ignored.
(() => {
  const W = 360, H = 480;
  if (window.self !== window.top) return; // embedded somewhere: leave the window alone
  const fit = () => {
    if (window.innerWidth === W && window.innerHeight === H) return;
    try { window.resizeTo(W + (window.outerWidth - window.innerWidth), H + (window.outerHeight - window.innerHeight)); } catch (e) { /* not allowed here */ }
  };
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fit, 120); });
  window.addEventListener('load', fit);
  fit();
})();

// ---------------------------------------------------------------- boot
renderTitle();
render();
tick();
setInterval(tick, 1000);
})();
