const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WIDTH = 1280;
const HEIGHT = 720;
const GRAVITY = 0.85;
const TILE = 48;

const themes = [
  { name: "Aurora Cliffs", skyTop: [18, 24, 58], skyBottom: [83, 172, 181], ground: [65, 98, 75], groundDark: [28, 54, 47], accent: [255, 218, 105], glow: [112, 245, 196], hazard: [255, 91, 91], bg1: [38, 67, 89], bg2: [70, 110, 99] },
  { name: "Crystal Cavern", skyTop: [23, 14, 44], skyBottom: [58, 41, 95], ground: [73, 61, 120], groundDark: [39, 33, 73], accent: [151, 239, 255], glow: [196, 120, 255], hazard: [250, 80, 137], bg1: [32, 29, 61], bg2: [52, 45, 92] },
  { name: "Ember Foundry", skyTop: [72, 25, 24], skyBottom: [224, 98, 49], ground: [98, 64, 54], groundDark: [50, 40, 43], accent: [255, 185, 66], glow: [255, 94, 43], hazard: [255, 62, 44], bg1: [75, 42, 45], bg2: [122, 59, 50] },
];

const gameCards = [
  { key: "runner", name: "Prism Runner", description: "A 30-level world-hopping platformer." },
  { key: "rally", name: "Prism Rally", description: "A full pseudo-3D crystal racing game." },
  { key: "dash", name: "Prism Dash", description: "A full rhythm platformer with spikes, blocks, and crystals." },
];

const characters = [
  { name: "Prism Runner", ability: "Blaster", description: "Balanced crystal shot.", color: [118, 223, 255], cooldown: 300, attack: "blaster" },
  { name: "Kickstar", ability: "Kicks", description: "Fast close-range kick.", color: [255, 218, 105], cooldown: 120, attack: "kick" },
  { name: "Knuckle Nova", ability: "Fists", description: "Twin punch burst.", color: [255, 116, 213], cooldown: 180, attack: "fists" },
  { name: "Volt Mystic", ability: "Power", description: "Piercing volt beam.", color: [126, 255, 171], cooldown: 240, attack: "power" },
];

const levelMaps = [
  [
    "........................................................................................",
    "...............................................................C........................",
    ".....................C.....................C............................................",
    "..........P......#####..............#####..............###..............C..............G.",
    "......########..................C..................####.............########........#####",
    "...........................#########....................................................",
    ".....................E...........................E...........^^^........................",
    "################..######################..##############################..##############",
  ],
  [
    "...............................C.....................C..................................",
    ".....................######...............####..................C.......................",
    ".......P.................................................####.............######......G..",
    "....########.....C.............####...........C.................................########",
    "................#####.....................########..............E.......................",
    "..........................^^^^.......................######.........^^^^.................",
    "#############..####################..########################..#########################",
  ],
  [
    "...............C.................C.............C...................C....................",
    ".......P....####.........E....####...........####..............#########.............G..",
    "...########...........########...........^^^...........#####.....................#######",
    "..................C.................###########......................E.................",
    ".............#########......^^^^..................#########......########..............",
    "######################..##########..######################..###############..##########",
  ],
];

const state = {
  mode: "hub",
  tab: "games",
  time: 0,
  keys: new Set(),
  mouseDown: false,
  buttons: [],
  particles: [],
  crystals: 0,
  levelsCompleted: 0,
  highestUnlocked: 0,
  selectedCharacter: 0,
  ownedCharacters: new Set([0]),
  characterLevels: [0, 0, 0, 0],
  message: "",
  theme: themes[0],
  runner: null,
  rally: null,
  dash: null,
};

function rgb(c, a = 1) {
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
}

function mix(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function addParticles(x, y, color, count = 12, power = 4) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * power;
    state.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 18 + Math.random() * 22, color });
  }
}

function updateParticles() {
  state.particles = state.particles.filter((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.16;
    p.life -= 1;
    return p.life > 0;
  });
}

function drawRoundedRect(x, y, w, h, r, fill, stroke = null, lineWidth = 2) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawBackground(theme = state.theme, camera = 0) {
  const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  grad.addColorStop(0, rgb(theme.skyTop));
  grad.addColorStop(1, rgb(theme.skyBottom));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = rgb(theme.glow, 0.08 - i * 0.015);
    ctx.beginPath();
    ctx.arc(WIDTH - 190, 150, 430 - i * 110, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let layer = 0; layer < 3; layer++) {
    const color = layer === 0 ? theme.bg1 : layer === 1 ? mix(theme.bg1, theme.bg2, 0.45) : theme.bg2;
    const base = [382, 468, 540][layer];
    const amp = [85, 62, 42][layer];
    const speed = [0.08, 0.18, 0.32][layer];
    ctx.fillStyle = rgb(color);
    ctx.beginPath();
    ctx.moveTo(-80, HEIGHT);
    for (let x = -120; x < WIDTH + 180; x += 130 - layer * 22) {
      const wx = x + camera * speed;
      const y = base + Math.sin(wx * 0.009 + state.time * 0.015) * amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(WIDTH + 80, HEIGHT);
    ctx.closePath();
    ctx.fill();
  }

  for (let i = 0; i < 48; i++) {
    const x = (i * 263 - camera * 0.12) % WIDTH;
    const y = 38 + ((i * 97) % 260);
    ctx.fillStyle = rgb(theme.accent, 0.42);
    ctx.beginPath();
    ctx.arc(x < 0 ? x + WIDTH : x, y, 1 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawText(text, x, y, size = 24, color = "#f5f8ff", align = "left", weight = "600") {
  ctx.font = `${weight} ${size}px Segoe UI, system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillText(text, x, y);
}

function button(id, rect, label, active = false, enabled = true) {
  const theme = state.theme;
  drawRoundedRect(rect.x, rect.y, rect.w, rect.h, 8, enabled ? "rgba(13,18,35,0.92)" : "rgba(34,38,48,0.9)", enabled ? rgb(active ? theme.glow : theme.accent) : "rgba(90,96,110,0.8)", 2);
  drawText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 - 9, 18, enabled ? "#f5f8ff" : "#89909a", "center", "600");
  state.buttons.push({ id, rect, enabled });
}

function wrapText(text, maxWidth, size = 18, maxLines = 2) {
  ctx.font = `500 ${size}px Segoe UI, system-ui, sans-serif`;
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function drawHub() {
  state.buttons = [];
  drawBackground(themes[1], 0);
  ctx.fillStyle = "rgba(3,6,16,0.72)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawText("THE CRYSTAL SERIES", WIDTH / 2, 42, 58, "#f5f8ff", "center", "800");
  drawText(`Crystals ${state.crystals}   Levels completed ${state.levelsCompleted}/30`, WIDTH / 2, 106, 24, rgb(state.theme.accent), "center");

  button("tab:games", { x: 278, y: 136, w: 220, h: 48 }, "Games", state.tab === "games");
  button("tab:levels", { x: 530, y: 136, w: 220, h: 48 }, "Levels", state.tab === "levels");
  button("tab:characters", { x: 782, y: 136, w: 220, h: 48 }, "Characters", state.tab === "characters");

  if (state.tab === "games") drawGameCards();
  if (state.tab === "levels") drawLevelsTab();
  if (state.tab === "characters") drawCharactersTab();
  drawParticles();
}

function drawGameCards() {
  const cardW = 330;
  const gap = 42;
  const startX = (WIDTH - (cardW * gameCards.length + gap * (gameCards.length - 1))) / 2;
  gameCards.forEach((card, index) => {
    const x = startX + index * (cardW + gap);
    const y = 244;
    const color = themes[index].accent;
    drawRoundedRect(x, y, cardW, 300, 8, "rgba(14,20,36,0.94)", rgb(color), 2);
    ctx.fillStyle = rgb(color, 0.28);
    ctx.beginPath();
    ctx.arc(x + cardW / 2, y + 76, 48, 0, Math.PI * 2);
    ctx.fill();
    drawCardIcon(card.key, x + cardW / 2, y + 76, color);
    drawText(card.name, x + cardW / 2, y + 146, 24, "#f5f8ff", "center", "700");
    wrapText(card.description, cardW - 44, 18, 2).forEach((line, i) => {
      drawText(line, x + cardW / 2, y + 180 + i * 22, 18, "#dce6ee", "center", "500");
    });
    button(`play:${card.key}`, { x: x + 62, y: y + 236, w: cardW - 124, h: 42 }, "Play", true);
  });
}

function drawCardIcon(key, x, y, color) {
  if (key === "runner") {
    drawRoundedRect(x - 24, y - 12, 48, 36, 8, rgb(color));
    ctx.fillStyle = "#f5f8ff";
    ctx.beginPath();
    ctx.arc(x + 12, y - 4, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (key === "rally") {
    ctx.fillStyle = rgb(state.theme.groundDark);
    ctx.beginPath();
    ctx.moveTo(x - 44, y + 38);
    ctx.lineTo(x + 44, y + 38);
    ctx.lineTo(x + 16, y - 36);
    ctx.lineTo(x - 16, y - 36);
    ctx.closePath();
    ctx.fill();
    drawRoundedRect(x - 28, y + 10, 56, 28, 8, rgb(color));
  } else {
    drawRoundedRect(x - 34, y + 8, 34, 34, 4, rgb(color));
    ctx.fillStyle = rgb(state.theme.hazard);
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 42);
    ctx.lineTo(x + 36, y + 6);
    ctx.lineTo(x + 54, y + 42);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#f5f8ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 52, y + 46);
    ctx.lineTo(x + 58, y + 46);
    ctx.stroke();
  }
}

function drawLevelsTab() {
  const startX = 143;
  const startY = 228;
  for (let world = 0; world < 3; world++) {
    drawText(`World ${world + 1}`, startX, startY + world * 120 - 34, 24);
    for (let level = 0; level < 10; level++) {
      const idx = world * 10 + level;
      const rect = { x: startX + level * 100, y: startY + world * 120, w: 84, h: 54 };
      const unlocked = idx <= state.highestUnlocked;
      button(`level:${idx}`, rect, unlocked ? `${level + 1}` : "--", idx === state.runner?.levelIndex, unlocked);
    }
  }
}

function drawCharactersTab() {
  const cardW = 244;
  const gap = 28;
  const startX = (WIDTH - (cardW * characters.length + gap * (characters.length - 1))) / 2;
  characters.forEach((character, index) => {
    const owned = state.ownedCharacters.has(index);
    const x = startX + index * (cardW + gap);
    const y = 220;
    drawRoundedRect(x, y, cardW, 270, 8, owned ? "rgba(14,20,36,0.94)" : "rgba(36,38,48,0.94)", rgb(owned ? character.color : [77, 82, 95]), state.selectedCharacter === index ? 3 : 2);
    ctx.fillStyle = rgb(character.color, owned ? 0.32 : 0.14);
    ctx.beginPath();
    ctx.arc(x + cardW / 2, y + 52, 34, 0, Math.PI * 2);
    ctx.fill();
    drawText(owned ? character.name : "Locked", x + cardW / 2, y + 96, 23, owned ? "#f5f8ff" : "#9198a4", "center", "700");
    drawText(character.ability, x + cardW / 2, y + 128, 18, rgb(owned ? character.color : [145, 152, 164]), "center");
    drawText(owned ? character.description : "Roll to unlock", x + cardW / 2, y + 156, 17, "#dce6ee", "center", "500");
    drawText(`Upgrade L${state.characterLevels[index]}/3`, x + cardW / 2, y + 184, 17, "#dce6ee", "center", "500");
    button(`char:${index}`, { x: x + 26, y: y + 214, w: 88, h: 38 }, "Equip", state.selectedCharacter === index, owned);
    const cost = [15, 30, 50][state.characterLevels[index]];
    button(`upgrade:${index}`, { x: x + 122, y: y + 214, w: 96, h: 38 }, cost ? `Up ${cost}` : "Max", false, owned && Boolean(cost) && state.crystals >= cost);
  });
  button("rollCharacter", { x: 494, y: 594, w: 292, h: 54 }, "Roll Character - 10 crystals", false, state.crystals >= 10);
  if (state.message) drawText(state.message, WIDTH / 2, 660, 24, rgb(state.theme.accent), "center");
}

function resetRunner(levelIndex = 0) {
  const map = levelMaps[levelIndex % levelMaps.length];
  const runner = {
    levelIndex,
    world: Math.floor(levelIndex / 10),
    map,
    solids: [],
    hazards: [],
    crystals: [],
    enemies: [],
    bullets: [],
    totalCrystals: 0,
    collectedThisLevel: 0,
    camera: 0,
    lives: 3,
    player: { x: 120, y: 260, w: 34, h: 46, vx: 0, vy: 0, facing: 1, onGround: false, cooldown: 0 },
    goal: { x: 3600, y: 400, w: 48, h: 96 },
  };
  map.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const px = x * TILE;
      const py = y * TILE + 96;
      if (ch === "#") runner.solids.push({ x: px, y: py, w: TILE, h: TILE });
      if (ch === "^") runner.hazards.push({ x: px, y: py + 16, w: TILE, h: 32 });
      if (ch === "C") runner.crystals.push({ x: px + 13, y: py + 13, w: 22, h: 22 });
      if (ch === "E") runner.enemies.push({ x: px + 4, y: py + 12, w: 40, h: 34, vx: 2, home: px + 4 });
      if (ch === "P") {
        runner.player.x = px + 6;
        runner.player.y = py + 2;
      }
      if (ch === "G") runner.goal = { x: px, y: py - 48, w: 48, h: 96 };
    });
  });
  for (let x = 84; x < 144; x++) {
    const px = x * TILE;
    runner.solids.push({ x: px, y: 480, w: TILE, h: TILE });
    if (x % 11 === 3) runner.solids.push({ x: px, y: 336 - ((x % 3) * 48), w: TILE * 3, h: TILE });
    if (x % 13 === 4) runner.crystals.push({ x: px + 20, y: 280, w: 22, h: 22 });
    if (x % 19 === 8) runner.hazards.push({ x: px + 5, y: 448, w: 38, h: 32 });
  }
  runner.totalCrystals = runner.crystals.length;
  state.runner = runner;
}

function selectedCooldown() {
  const base = characters[state.selectedCharacter].cooldown;
  return Math.max(60, Math.round(base * (1 - state.characterLevels[state.selectedCharacter] * 0.16)));
}

function startGame(key) {
  state.mode = key === "runner" ? "runner" : key;
  if (key === "runner" && !state.runner) resetRunner(0);
  if (key === "rally") resetRally();
  if (key === "dash") resetDash();
}

function resetRally() {
  state.rally = {
    x: 0,
    speed: 0,
    distance: 0,
    length: 7200,
    score: 0,
    best: state.rally?.best || 0,
    objects: Array.from({ length: 54 }, (_, i) => ({
      z: 420 + i * 135,
      x: [-0.68, -0.34, 0, 0.34, 0.68][Math.floor(Math.random() * 5)],
      kind: i % 3 ? "crystal" : "hazard",
      hit: false,
    })),
  };
}

function resetDash() {
  const ground = 590;
  const course = [
    ["spike", 520, 0, 42, 38], ["crystal", 650, -116, 28, 28],
    ["block", 820, -92, 116, 34], ["crystal", 852, -150, 28, 28],
    ["spike", 1080, 0, 42, 38], ["spike", 1134, 0, 42, 38],
    ["block", 1390, -118, 92, 34], ["block", 1496, -154, 92, 34], ["crystal", 1528, -210, 28, 28],
    ["spike", 1760, 0, 42, 38], ["crystal", 1890, -120, 28, 28], ["spike", 2020, 0, 42, 38],
    ["block", 2260, -88, 82, 34], ["spike", 2420, 0, 42, 38], ["block", 2580, -128, 136, 34],
    ["crystal", 2628, -188, 28, 28], ["spike", 2860, 0, 42, 38], ["spike", 2914, 0, 42, 38], ["spike", 2968, 0, 42, 38],
    ["block", 3220, -104, 112, 34], ["block", 3370, -168, 112, 34], ["crystal", 3410, -224, 28, 28],
    ["spike", 3680, 0, 42, 38], ["block", 3830, -96, 86, 34], ["crystal", 3860, -152, 28, 28],
    ["spike", 4100, 0, 42, 38], ["spike", 4190, 0, 42, 38], ["block", 4370, -132, 146, 34],
    ["crystal", 4428, -190, 28, 28], ["spike", 4660, 0, 42, 38], ["block", 4820, -92, 120, 34],
  ];
  state.dash = {
    player: { x: 160, y: ground - 42, w: 42, h: 42 },
    vy: 0,
    scroll: 0,
    speed: 6,
    ground,
    length: 5200,
    score: 0,
    best: state.dash?.best || 0,
    collected: new Set(),
    jumpHeld: false,
    onSurface: true,
    items: course.map(([kind, x, yOffset, w, h]) => ({ kind, rect: { x, y: kind === "spike" ? ground - h : ground + yOffset, w, h } })),
  };
}

function updateRunner() {
  const r = state.runner;
  const p = r.player;
  const left = state.keys.has("a") || state.keys.has("arrowleft");
  const right = state.keys.has("d") || state.keys.has("arrowright");
  const jump = state.keys.has("w") || state.keys.has("arrowup") || state.keys.has(" ");
  p.vx = (right ? 8.4 : 0) - (left ? 8.4 : 0);
  if (p.vx) p.facing = p.vx > 0 ? 1 : -1;
  if (jump && p.onGround) {
    p.vy = -17.5;
    p.onGround = false;
  }
  p.vy = Math.min(22, p.vy + GRAVITY);
  p.x += p.vx;
  collideSolids(p, r.solids, "x");
  p.y += p.vy;
  p.onGround = false;
  collideSolids(p, r.solids, "y");
  r.camera = Math.max(r.camera, clamp(p.x - WIDTH * 0.42, 0, 6500));
  if (p.cooldown > 0) p.cooldown--;

  r.bullets.forEach((b) => {
    b.x += b.vx;
    b.life--;
  });
  r.bullets = r.bullets.filter((b) => b.life > 0 && b.x > 0 && b.x < 8000);

  r.enemies.forEach((e) => {
    e.x += e.vx;
    if (Math.abs(e.x - e.home) > 190) e.vx *= -1;
    if (rectsOverlap(p, e)) damageRunner();
    r.bullets.forEach((b) => {
      if (rectsOverlap(b, e)) {
        e.dead = true;
        b.life = 0;
        addParticles(e.x - r.camera, e.y, state.theme.hazard, 22, 6);
      }
    });
  });
  r.enemies = r.enemies.filter((e) => !e.dead);

  r.crystals.forEach((c) => {
    if (!c.hit && rectsOverlap(p, c)) {
      c.hit = true;
      r.collectedThisLevel++;
      state.crystals++;
      addParticles(c.x - r.camera, c.y, state.theme.accent, 16, 5);
    }
  });
  r.hazards.forEach((h) => {
    if (rectsOverlap(p, h)) damageRunner();
  });
  if (p.y > HEIGHT + 120) damageRunner();
  if (rectsOverlap(p, r.goal)) {
    const next = r.levelIndex + 1;
    state.levelsCompleted = Math.max(state.levelsCompleted, Math.min(next, 30));
    state.highestUnlocked = Math.max(state.highestUnlocked, Math.min(next, 29));
    resetRunner(next % 30);
  }
}

function collideSolids(p, solids, axis) {
  solids.forEach((s) => {
    if (!rectsOverlap(p, s)) return;
    if (axis === "x") {
      if (p.vx > 0) p.x = s.x - p.w;
      if (p.vx < 0) p.x = s.x + s.w;
    } else {
      if (p.vy > 0) {
        p.y = s.y - p.h;
        p.vy = 0;
        p.onGround = true;
      }
      if (p.vy < 0) {
        p.y = s.y + s.h;
        p.vy = 0;
      }
    }
  });
}

function damageRunner() {
  const r = state.runner;
  r.lives--;
  addParticles(r.player.x - r.camera, r.player.y, state.theme.hazard, 24, 6);
  if (r.lives <= 0) {
    resetRunner(0);
  } else {
    r.player.x = 120;
    r.player.y = 260;
    r.player.vx = 0;
    r.player.vy = 0;
    r.camera = 0;
  }
}

function useAbility() {
  if (state.mode !== "runner") return;
  const r = state.runner;
  const p = r.player;
  if (p.cooldown > 0) return;
  const character = characters[state.selectedCharacter];
  const level = state.characterLevels[state.selectedCharacter];
  const width = character.attack === "kick" ? 72 + level * 16 : character.attack === "power" ? 48 + level * 12 : 28 + level * 6;
  r.bullets.push({ x: p.facing > 0 ? p.x + p.w : p.x - width, y: p.y + p.h / 2 - 8, w: width, h: 16 + level * 2, vx: p.facing * (16 + level * 2), life: 80, color: character.color });
  p.cooldown = selectedCooldown();
}

function updateRally() {
  const r = state.rally;
  let accel = 0.13;
  if (state.keys.has("w") || state.keys.has("arrowup")) accel += 0.07;
  if (state.keys.has("s") || state.keys.has("arrowdown")) accel -= 0.28;
  r.speed = clamp(r.speed + accel, 0, 19);
  const steer = (state.keys.has("d") || state.keys.has("arrowright") ? 1 : 0) - (state.keys.has("a") || state.keys.has("arrowleft") ? 1 : 0);
  r.x = clamp(r.x + steer * (0.018 + r.speed * 0.0018), -0.96, 0.96);
  r.distance += r.speed;
  r.objects.forEach((o) => {
    if (o.hit) return;
    const dz = o.z - r.distance;
    if (dz > -20 && dz < 34 && Math.abs(o.x - r.x) < 0.16) {
      o.hit = true;
      if (o.kind === "crystal") {
        r.score++;
        state.crystals++;
      } else {
        r.speed *= 0.42;
        addParticles(WIDTH / 2, HEIGHT - 115, state.theme.hazard, 28, 7);
      }
    }
  });
  if (r.distance >= r.length) {
    const reward = Math.max(5, Math.floor(r.speed) + Math.floor(r.score / 2));
    state.crystals += reward;
    r.best = Math.max(r.best, r.score + reward);
    resetRally();
  }
}

function dashJump() {
  const d = state.dash;
  if (d.onSurface || d.player.y + d.player.h >= d.ground - 2) {
    d.vy = -16;
    d.onSurface = false;
    addParticles(d.player.x, d.player.y + d.player.h, state.theme.accent, 12, 4);
  }
}

function updateDash() {
  const d = state.dash;
  const keyHeld = state.keys.has(" ") || state.keys.has("w") || state.keys.has("arrowup") || state.keys.has("c") || state.mouseDown;
  d.jumpHeld = keyHeld;
  d.speed = Math.min(8.6, 6 + d.scroll / 3600);
  d.scroll += d.speed;
  const prevBottom = d.player.y + d.player.h;
  d.onSurface = false;
  d.vy = Math.min(18, d.vy + 0.82);
  d.player.y += d.vy;
  if (d.player.y + d.player.h >= d.ground) {
    d.player.y = d.ground - d.player.h;
    d.vy = 0;
    d.onSurface = true;
    if (d.jumpHeld) dashJump();
  }
  const worldPlayer = { x: d.scroll + d.player.x, y: d.player.y, w: d.player.w, h: d.player.h };
  for (let i = 0; i < d.items.length; i++) {
    const item = d.items[i];
    if (item.rect.x + item.rect.w < d.scroll - 120 || item.rect.x > d.scroll + WIDTH + 160) continue;
    if (item.kind === "crystal" && !d.collected.has(i) && rectsOverlap(worldPlayer, item.rect)) {
      d.collected.add(i);
      d.score++;
      state.crystals++;
      addParticles(item.rect.x - d.scroll, item.rect.y, state.theme.accent, 16, 5);
    }
    if (item.kind === "block" && rectsOverlap(worldPlayer, item.rect)) {
      if (d.vy >= 0 && prevBottom <= item.rect.y + 8) {
        d.player.y = item.rect.y - d.player.h;
        d.vy = 0;
        d.onSurface = true;
        if (d.jumpHeld) dashJump();
      } else {
        d.best = Math.max(d.best, d.score);
        resetDash();
        return;
      }
    }
    if (item.kind === "spike" && rectsOverlap(worldPlayer, { x: item.rect.x + 8, y: item.rect.y + 4, w: item.rect.w - 16, h: item.rect.h - 4 })) {
      d.best = Math.max(d.best, d.score);
      resetDash();
      return;
    }
  }
  if (d.scroll >= d.length) {
    const reward = 10 + d.score;
    state.crystals += reward;
    d.best = Math.max(d.best, d.score + reward);
    resetDash();
  }
}

function update() {
  state.time++;
  updateParticles();
  if (state.mode === "runner") updateRunner();
  if (state.mode === "rally") updateRally();
  if (state.mode === "dash") updateDash();
}

function drawParticles() {
  state.particles.forEach((p) => {
    ctx.fillStyle = rgb(p.color, clamp(p.life / 34, 0, 1));
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(2, p.life / 8), 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawRunner() {
  const r = state.runner;
  state.theme = themes[r.levelIndex % themes.length];
  drawBackground(state.theme, r.camera);
  const view = { x: r.camera - 80, y: -100, w: WIDTH + 160, h: HEIGHT + 160 };
  r.solids.forEach((s) => {
    if (!rectsOverlap(s, view)) return;
    drawRoundedRect(s.x - r.camera, s.y, s.w, s.h, 7, rgb(state.theme.groundDark), rgb(state.theme.glow, 0.65), 1);
    drawRoundedRect(s.x - r.camera + 5, s.y + 5, s.w - 10, s.h - 10, 5, rgb(state.theme.ground));
  });
  r.hazards.forEach((h) => {
    const x = h.x - r.camera;
    ctx.fillStyle = rgb(state.theme.hazard);
    ctx.beginPath();
    ctx.moveTo(x, h.y + h.h);
    ctx.lineTo(x + h.w / 2, h.y);
    ctx.lineTo(x + h.w, h.y + h.h);
    ctx.fill();
  });
  r.crystals.forEach((c) => {
    if (c.hit) return;
    drawCrystal(c.x - r.camera + c.w / 2, c.y + c.h / 2, 16, state.theme.accent);
  });
  r.enemies.forEach((e) => drawRoundedRect(e.x - r.camera, e.y, e.w, e.h, 10, rgb(state.theme.hazard)));
  r.bullets.forEach((b) => drawRoundedRect(b.x - r.camera, b.y, b.w, b.h, 4, "#f5f8ff", rgb(b.color), 2));
  drawRoundedRect(r.goal.x - r.camera + 14, r.goal.y, 18, r.goal.h, 8, rgb(state.theme.glow));
  drawPlayer(r.player.x - r.camera, r.player.y);
  drawHud(`World ${Math.floor(r.levelIndex / 10) + 1}/3 - Level ${(r.levelIndex % 10) + 1}/10`, `Level crystals ${r.collectedThisLevel}/${r.totalCrystals}`, `Lives ${r.lives}/3`);
  drawParticles();
}

function drawPlayer(x, y) {
  const color = characters[state.selectedCharacter].color;
  ctx.fillStyle = rgb(color, 0.25);
  ctx.beginPath();
  ctx.ellipse(x + 17, y + 24, 44, 48, 0, 0, Math.PI * 2);
  ctx.fill();
  drawRoundedRect(x, y + 7, 34, 39, 10, "#f1f7ff", rgb(color), 3);
  drawRoundedRect(x + 3, y, 28, 26, 12, "#1c2236");
  ctx.fillStyle = rgb(color);
  ctx.beginPath();
  ctx.arc(x + 22, y + 13, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawHud(title, line, extra) {
  drawRoundedRect(20, 18, 650, 96, 8, "rgba(8,12,24,0.78)", rgb(state.theme.glow), 2);
  drawText(title, 38, 28, 24);
  drawText(line, 38, 58, 18, rgb(state.theme.accent));
  drawText(`Total crystals ${state.crystals}`, 230, 58, 18);
  drawText(`Levels completed ${state.levelsCompleted}/30`, 388, 58, 18);
  drawText(extra, 500, 82, 18);
  button("home", { x: 1030, y: 22, w: 118, h: 38 }, "Home");
}

function drawCrystal(x, y, size, color) {
  ctx.fillStyle = rgb(color);
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f5f8ff";
  ctx.beginPath();
  ctx.moveTo(x, y - size + 5);
  ctx.lineTo(x + 6, y);
  ctx.lineTo(x, y + 5);
  ctx.lineTo(x - 6, y);
  ctx.fill();
}

function drawRally() {
  state.theme = themes[1];
  const r = state.rally;
  drawBackground(state.theme, r.distance);
  const horizon = 292;
  ctx.fillStyle = rgb(mix(state.theme.ground, state.theme.bg2, 0.35));
  ctx.beginPath();
  ctx.moveTo(0, HEIGHT);
  ctx.lineTo(WIDTH, HEIGHT);
  ctx.lineTo(760, horizon);
  ctx.lineTo(520, horizon);
  ctx.fill();
  ctx.fillStyle = rgb(mix(state.theme.groundDark, [8, 12, 24], 0.24));
  ctx.beginPath();
  ctx.moveTo(190, HEIGHT);
  ctx.lineTo(1090, HEIGHT);
  ctx.lineTo(735, horizon);
  ctx.lineTo(545, horizon);
  ctx.fill();
  for (let i = 0; i < 18; i++) {
    const z = i / 17;
    const y = HEIGHT - z * (HEIGHT - horizon);
    const half = 455 * (1 - z) + 95 * z;
    const center = WIDTH / 2 + Math.sin(r.distance * 0.004 + i * 0.55) * 40 * (1 - z);
    ctx.strokeStyle = rgb(state.theme.glow, 0.38);
    ctx.beginPath();
    ctx.moveTo(center - half, y);
    ctx.lineTo(center + half, y);
    ctx.stroke();
  }
  r.objects.slice().sort((a, b) => b.z - a.z).forEach((o) => {
    if (o.hit) return;
    const dz = o.z - r.distance;
    if (dz < 0 || dz > 1150) return;
    const scale = 1 - dz / 1150;
    const y = horizon + (HEIGHT - horizon) * scale;
    const x = WIDTH / 2 + o.x * (95 + 360 * scale);
    const size = 18 + 36 * scale;
    if (o.kind === "crystal") drawCrystal(x, y, size, state.theme.accent);
    else {
      ctx.fillStyle = rgb(state.theme.hazard);
      ctx.beginPath();
      ctx.moveTo(x - size, y + size);
      ctx.lineTo(x, y - size);
      ctx.lineTo(x + size, y + size);
      ctx.fill();
    }
  });
  const carX = WIDTH / 2 + r.x * 310;
  const carY = HEIGHT - 96;
  drawRoundedRect(carX - 46, carY + 8, 92, 32, 10, rgb(state.theme.groundDark));
  drawRoundedRect(carX - 38, carY - 8, 76, 34, 10, rgb(state.theme.accent));
  drawArcadeHud("Prism Rally", `${Math.min(100, Math.floor(r.distance / r.length * 100))}%  Speed ${Math.floor(r.speed * 9)}`, r.best);
}

function drawDash() {
  state.theme = themes[2];
  const d = state.dash;
  drawBackground(state.theme, d.scroll);
  ctx.fillStyle = rgb(state.theme.groundDark);
  ctx.fillRect(0, d.ground, WIDTH, HEIGHT - d.ground);
  ctx.strokeStyle = rgb(state.theme.accent);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, d.ground);
  ctx.lineTo(WIDTH, d.ground);
  ctx.stroke();
  d.items.forEach((item, i) => {
    if (item.kind === "crystal" && d.collected.has(i)) return;
    const r = { ...item.rect, x: item.rect.x - d.scroll };
    if (r.x + r.w < -80 || r.x > WIDTH + 80) return;
    if (item.kind === "spike") {
      ctx.fillStyle = rgb(state.theme.hazard);
      ctx.beginPath();
      ctx.moveTo(r.x, r.y + r.h);
      ctx.lineTo(r.x + r.w / 2, r.y);
      ctx.lineTo(r.x + r.w, r.y + r.h);
      ctx.fill();
    } else if (item.kind === "block") {
      drawRoundedRect(r.x, r.y, r.w, r.h, 6, rgb(state.theme.ground), rgb(state.theme.glow), 2);
    } else {
      drawCrystal(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, state.theme.accent);
    }
  });
  const p = d.player;
  const angle = (d.scroll * 0.08) % (Math.PI * 2);
  ctx.save();
  ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
  ctx.rotate(angle);
  drawRoundedRect(-p.w / 2, -p.h / 2, p.w, p.h, 4, rgb(state.theme.accent), "#f5f8ff", 2);
  ctx.restore();
  drawArcadeHud("Prism Dash", `${Math.min(100, Math.floor(d.scroll / d.length * 100))}%  Crystals ${d.score}`, d.best);
  drawParticles();
}

function drawArcadeHud(title, score, best) {
  drawRoundedRect(20, 18, 520, 84, 8, "rgba(8,12,24,0.78)", rgb(state.theme.glow), 2);
  drawText(title, 38, 28, 24);
  drawText(`Score ${score}   Best ${best}   Crystals ${state.crystals}`, 38, 62, 18, rgb(state.theme.accent));
}

function render() {
  state.buttons = [];
  if (state.mode === "hub") drawHub();
  if (state.mode === "runner") drawRunner();
  if (state.mode === "rally") drawRally();
  if (state.mode === "dash") drawDash();
}

function handleButton(id) {
  if (id.startsWith("tab:")) state.tab = id.slice(4);
  if (id.startsWith("play:")) startGame(id.slice(5));
  if (id === "home") state.mode = "hub";
  if (id.startsWith("level:")) {
    const index = Number(id.slice(6));
    if (index <= state.highestUnlocked) {
      resetRunner(index);
      state.mode = "runner";
    }
  }
  if (id.startsWith("char:")) {
    const index = Number(id.slice(5));
    if (state.ownedCharacters.has(index)) {
      state.selectedCharacter = index;
      state.message = `Equipped ${characters[index].name}`;
    }
  }
  if (id.startsWith("upgrade:")) {
    const index = Number(id.slice(8));
    const cost = [15, 30, 50][state.characterLevels[index]];
    if (state.ownedCharacters.has(index) && cost && state.crystals >= cost) {
      state.crystals -= cost;
      state.characterLevels[index]++;
      state.message = `Upgraded ${characters[index].name}`;
    }
  }
  if (id === "rollCharacter" && state.crystals >= 10) {
    state.crystals -= 10;
    const locked = characters.map((_, i) => i).filter((i) => !state.ownedCharacters.has(i));
    if (locked.length) {
      const won = locked[Math.floor(Math.random() * locked.length)];
      state.ownedCharacters.add(won);
      state.selectedCharacter = won;
      state.message = `Unlocked ${characters[won].name}`;
    } else {
      state.crystals += 3;
      state.message = "All unlocked - refunded 3";
    }
  }
}

function pointerToCanvas(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (WIDTH / rect.width),
    y: (event.clientY - rect.top) * (HEIGHT / rect.height),
  };
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  state.keys.add(key);
  if (key === "escape") {
    if (state.mode === "hub") return;
    state.mode = "hub";
  }
  if (state.mode === "runner" && key === "c") useAbility();
  if (state.mode === "dash" && [" ", "w", "arrowup", "c"].includes(key)) {
    state.dash.jumpHeld = true;
    dashJump();
  }
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.key.toLowerCase());
});

canvas.addEventListener("mousedown", (event) => {
  state.mouseDown = true;
  const pos = pointerToCanvas(event);
  const hit = state.buttons.find((b) => b.enabled && pos.x >= b.rect.x && pos.x <= b.rect.x + b.rect.w && pos.y >= b.rect.y && pos.y <= b.rect.y + b.rect.h);
  if (hit) {
    handleButton(hit.id);
  } else if (state.mode === "runner") {
    useAbility();
  } else if (state.mode === "dash") {
    state.dash.jumpHeld = true;
    dashJump();
  }
});

window.addEventListener("mouseup", () => {
  state.mouseDown = false;
});

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

resetRunner(0);
resetRally();
resetDash();
loop();
