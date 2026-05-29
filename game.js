const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const W = 1280;
const H = 720;
const theme = {
  skyTop: [18, 24, 58],
  skyBottom: [58, 41, 95],
  ground: [65, 98, 75],
  groundDark: [28, 54, 47],
  accent: [112, 245, 196],
  gold: [255, 218, 105],
  pink: [255, 116, 213],
  hazard: [255, 91, 91],
};

const games = [
  { key: "runner", name: "Prism Runner", desc: "A crystal platformer with worlds, levels, and abilities." },
  { key: "rally", name: "Prism Rally", desc: "A pseudo-3D racing game with auto-drive and crystals." },
  { key: "dash", name: "Prism Dash", desc: "A Geometry Dash-style rhythm platformer." },
];

const state = {
  mode: "hub",
  tab: "games",
  time: 0,
  crystals: 0,
  score: 0,
  best: { runner: 0, rally: 0, dash: 0 },
  keys: new Set(),
  buttons: [],
  showControls: false,
  player: { x: 150, y: 540, w: 42, h: 42, vy: 0, onGround: true },
  rally: { x: 0, speed: 0, distance: 0, objects: [] },
  dash: { scroll: 0, speed: 6, jumpHeld: false, items: [] },
  particles: [],
};

function rgb(c, a = 1) {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function text(value, x, y, size = 24, color = "#f5f8ff", align = "left", weight = "700") {
  ctx.font = `${weight} ${size}px Segoe UI, system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillText(value, x, y);
}

function round(x, y, w, h, r, fill, stroke = null, lw = 2) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

function bg(camera = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, rgb(theme.skyTop));
  g.addColorStop(1, rgb(theme.skyBottom));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let layer = 0; layer < 3; layer++) {
    ctx.fillStyle = rgb(layer === 0 ? [38, 67, 89] : layer === 1 ? [52, 68, 98] : [70, 110, 99]);
    ctx.beginPath();
    ctx.moveTo(-80, H);
    for (let x = -100; x <= W + 120; x += 120) {
      const y = 390 + layer * 72 + Math.sin((x + camera * (0.08 + layer * 0.12)) * 0.01 + state.time * 0.015) * (70 - layer * 18);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W + 80, H);
    ctx.fill();
  }
  for (let i = 0; i < 48; i++) {
    ctx.fillStyle = rgb(theme.accent, 0.38);
    ctx.beginPath();
    ctx.arc((i * 263 - camera * 0.12) % W, 42 + (i * 91) % 250, 1 + i % 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function button(id, x, y, w, h, label, active = false) {
  round(x, y, w, h, 8, "rgba(13,18,35,0.92)", rgb(active ? theme.accent : theme.gold), 2);
  text(label, x + w / 2, y + h / 2 - 10, 18, "#f5f8ff", "center", "700");
  state.buttons.push({ id, x, y, w, h });
}

function wrap(value, maxWidth) {
  ctx.font = "600 18px Segoe UI, system-ui, sans-serif";
  const words = value.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

function drawControls() {
  ctx.fillStyle = "rgba(3,6,16,0.78)";
  ctx.fillRect(0, 0, W, H);
  round(270, 104, 740, 510, 8, "rgba(14,20,36,0.97)", rgb(theme.accent), 2);
  text("CONTROLS", W / 2, 138, 42, "#f5f8ff", "center", "800");
  const lines = [
    "Hub: click a game card to play",
    "Esc: return to The Crystal Series hub",
    "Prism Runner: A/D move, W/Up/Space jump, C or click ability",
    "Prism Rally: auto-drive, A/D steer, S/Down brake, W/Up boost",
    "Prism Dash: hold Space, W, Up, C, or mouse to auto-jump",
    "Bottom-right Controls button opens this screen",
  ];
  lines.forEach((line, i) => text(line, 330, 224 + i * 48, 22, i === 0 ? rgb(theme.gold) : "#dce6ee", "left", "600"));
  button("closeControls", 830, 548, 130, 42, "Close", true);
}

function drawHub() {
  state.buttons = [];
  bg();
  ctx.fillStyle = "rgba(3,6,16,0.72)";
  ctx.fillRect(0, 0, W, H);
  text("THE CRYSTAL SERIES", W / 2, 42, 58, "#f5f8ff", "center", "800");
  text(`Crystals ${state.crystals}`, W / 2, 108, 24, rgb(theme.accent), "center", "700");
  button("tab:games", 278, 136, 220, 48, "Games", state.tab === "games");
  button("tab:levels", 530, 136, 220, 48, "Levels", state.tab === "levels");
  button("tab:characters", 782, 136, 220, 48, "Characters", state.tab === "characters");

  if (state.tab === "games") {
    games.forEach((game, i) => {
      const x = 103 + i * 372;
      const y = 244;
      round(x, y, 330, 300, 8, "rgba(14,20,36,0.94)", rgb([theme.accent, theme.gold, theme.pink][i]), 2);
      ctx.fillStyle = rgb([theme.accent, theme.gold, theme.pink][i], 0.3);
      ctx.beginPath();
      ctx.arc(x + 165, y + 78, 48, 0, Math.PI * 2);
      ctx.fill();
      if (game.key === "dash") {
        round(x + 132, y + 74, 34, 34, 4, rgb(theme.pink));
        ctx.fillStyle = rgb(theme.hazard);
        ctx.beginPath();
        ctx.moveTo(x + 190, y + 112);
        ctx.lineTo(x + 208, y + 76);
        ctx.lineTo(x + 226, y + 112);
        ctx.fill();
      } else if (game.key === "rally") {
        round(x + 134, y + 88, 62, 30, 8, rgb(theme.gold));
        ctx.fillStyle = rgb(theme.groundDark);
        ctx.fillRect(x + 120, y + 122, 90, 6);
      } else {
        round(x + 138, y + 76, 52, 38, 8, rgb(theme.accent));
      }
      text(game.name, x + 165, y + 146, 24, "#f5f8ff", "center", "800");
      wrap(game.desc, 278).forEach((line, n) => text(line, x + 165, y + 182 + n * 22, 18, "#dce6ee", "center", "600"));
      button(`play:${game.key}`, x + 62, y + 236, 206, 42, "Play", true);
    });
  }
  if (state.tab === "levels") {
    text("Level select coming from the full build", W / 2, 310, 30, "#f5f8ff", "center");
    text("Use the Games tab to play the browser versions.", W / 2, 354, 22, "#dce6ee", "center", "600");
  }
  if (state.tab === "characters") {
    text("Characters and upgrades are part of the game system.", W / 2, 310, 30, "#f5f8ff", "center");
    text("Collect crystals in games to grow the series.", W / 2, 354, 22, "#dce6ee", "center", "600");
  }
  button("controls", 1090, 642, 150, 46, "Controls", false);
  if (state.showControls) drawControls();
}

function resetRunner() {
  state.score = 0;
  state.player = { x: 150, y: 540, w: 42, h: 42, vy: 0, onGround: true };
}

function resetRally() {
  state.rally = {
    x: 0,
    speed: 0,
    distance: 0,
    objects: Array.from({ length: 42 }, (_, i) => ({
      z: 420 + i * 150,
      x: [-0.65, -0.3, 0, 0.3, 0.65][Math.floor(Math.random() * 5)],
      kind: i % 3 ? "crystal" : "hazard",
      hit: false,
    })),
  };
}

function resetDash() {
  const ground = 590;
  const course = [
    ["spike", 520, 0, 42, 38], ["crystal", 650, -116, 28, 28], ["block", 820, -92, 116, 34],
    ["spike", 1080, 0, 42, 38], ["spike", 1134, 0, 42, 38], ["block", 1390, -118, 92, 34],
    ["block", 1496, -154, 92, 34], ["crystal", 1528, -210, 28, 28], ["spike", 1760, 0, 42, 38],
    ["crystal", 1890, -120, 28, 28], ["spike", 2020, 0, 42, 38], ["block", 2260, -88, 82, 34],
    ["spike", 2420, 0, 42, 38], ["block", 2580, -128, 136, 34], ["crystal", 2628, -188, 28, 28],
    ["spike", 2860, 0, 42, 38], ["spike", 2914, 0, 42, 38], ["spike", 2968, 0, 42, 38],
  ];
  state.dash = {
    ground,
    scroll: 0,
    speed: 6,
    vy: 0,
    jumpHeld: false,
    onSurface: true,
    player: { x: 160, y: ground - 42, w: 42, h: 42 },
    collected: new Set(),
    items: course.map(([kind, x, yOffset, w, h]) => ({ kind, rect: { x, y: kind === "spike" ? ground - h : ground + yOffset, w, h } })),
  };
}

function startGame(key) {
  state.showControls = false;
  state.mode = key;
  if (key === "runner") resetRunner();
  if (key === "rally") resetRally();
  if (key === "dash") resetDash();
}

function jumpDash() {
  const d = state.dash;
  if (d.onSurface || d.player.y + d.player.h >= d.ground - 2) {
    d.vy = -16;
    d.onSurface = false;
  }
}

function update() {
  state.time++;
  if (state.mode === "runner") {
    const p = state.player;
    if ((state.keys.has("w") || state.keys.has("arrowup") || state.keys.has(" ")) && p.onGround) {
      p.vy = -17;
      p.onGround = false;
    }
    p.vy = Math.min(18, p.vy + 0.85);
    p.y += p.vy;
    if (p.y + p.h >= 590) {
      p.y = 590 - p.h;
      p.vy = 0;
      p.onGround = true;
    }
  }
  if (state.mode === "rally") {
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
      if (o.z - r.distance > -20 && o.z - r.distance < 34 && Math.abs(o.x - r.x) < 0.16) {
        o.hit = true;
        if (o.kind === "crystal") state.crystals++;
        else r.speed *= 0.42;
      }
    });
  }
  if (state.mode === "dash") {
    const d = state.dash;
    d.jumpHeld = state.keys.has(" ") || state.keys.has("w") || state.keys.has("arrowup") || state.keys.has("c") || state.mouseDown;
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
      if (d.jumpHeld) jumpDash();
    }
    const cube = { x: d.scroll + d.player.x, y: d.player.y, w: d.player.w, h: d.player.h };
    d.items.forEach((item, i) => {
      if (item.kind === "crystal" && !d.collected.has(i) && rects(cube, item.rect)) {
        d.collected.add(i);
        state.crystals++;
      }
      if (item.kind === "block" && rects(cube, item.rect)) {
        if (d.vy >= 0 && prevBottom <= item.rect.y + 8) {
          d.player.y = item.rect.y - d.player.h;
          d.vy = 0;
          d.onSurface = true;
          if (d.jumpHeld) jumpDash();
        } else resetDash();
      }
      if (item.kind === "spike" && rects(cube, { x: item.rect.x + 8, y: item.rect.y + 4, w: item.rect.w - 16, h: item.rect.h - 4 })) resetDash();
    });
  }
}

function drawCrystal(x, y, size, color = theme.accent) {
  ctx.fillStyle = rgb(color);
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
  ctx.fill();
}

function hud(title, line) {
  round(20, 18, 520, 84, 8, "rgba(8,12,24,0.78)", rgb(theme.accent), 2);
  text(title, 38, 28, 24);
  text(`${line}   Crystals ${state.crystals}`, 38, 62, 18, rgb(theme.gold));
}

function drawRunner() {
  bg(state.time * 2);
  ctx.fillStyle = rgb(theme.groundDark);
  ctx.fillRect(0, 590, W, 130);
  ctx.strokeStyle = rgb(theme.accent);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 590);
  ctx.lineTo(W, 590);
  ctx.stroke();
  const p = state.player;
  round(p.x, p.y, p.w, p.h, 8, rgb(theme.accent), "#f5f8ff", 2);
  hud("Prism Runner", "Browser platformer mode");
}

function drawRally() {
  const r = state.rally;
  bg(r.distance);
  const horizon = 292;
  ctx.fillStyle = rgb(theme.groundDark);
  ctx.beginPath();
  ctx.moveTo(190, H);
  ctx.lineTo(1090, H);
  ctx.lineTo(735, horizon);
  ctx.lineTo(545, horizon);
  ctx.fill();
  for (let i = 0; i < 18; i++) {
    const z = i / 17;
    const y = H - z * (H - horizon);
    const half = 455 * (1 - z) + 95 * z;
    ctx.strokeStyle = rgb(theme.accent, 0.42);
    ctx.beginPath();
    ctx.moveTo(W / 2 - half, y);
    ctx.lineTo(W / 2 + half, y);
    ctx.stroke();
  }
  r.objects.forEach((o) => {
    if (o.hit) return;
    const dz = o.z - r.distance;
    if (dz < 0 || dz > 1150) return;
    const s = 1 - dz / 1150;
    const x = W / 2 + o.x * (95 + 360 * s);
    const y = horizon + (H - horizon) * s;
    if (o.kind === "crystal") drawCrystal(x, y, 18 + 36 * s, theme.gold);
    else {
      ctx.fillStyle = rgb(theme.hazard);
      ctx.beginPath();
      ctx.moveTo(x - 34 * s, y + 34 * s);
      ctx.lineTo(x, y - 34 * s);
      ctx.lineTo(x + 34 * s, y + 34 * s);
      ctx.fill();
    }
  });
  round(W / 2 + r.x * 310 - 38, H - 104, 76, 34, 10, rgb(theme.gold), "#f5f8ff", 2);
  hud("Prism Rally", `Speed ${Math.floor(r.speed * 9)}`);
}

function drawDash() {
  const d = state.dash;
  bg(d.scroll);
  ctx.fillStyle = rgb(theme.groundDark);
  ctx.fillRect(0, d.ground, W, H - d.ground);
  ctx.strokeStyle = rgb(theme.pink);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, d.ground);
  ctx.lineTo(W, d.ground);
  ctx.stroke();
  d.items.forEach((item, i) => {
    if (item.kind === "crystal" && d.collected.has(i)) return;
    const r = { ...item.rect, x: item.rect.x - d.scroll };
    if (r.x < -80 || r.x > W + 80) return;
    if (item.kind === "spike") {
      ctx.fillStyle = rgb(theme.hazard);
      ctx.beginPath();
      ctx.moveTo(r.x, r.y + r.h);
      ctx.lineTo(r.x + r.w / 2, r.y);
      ctx.lineTo(r.x + r.w, r.y + r.h);
      ctx.fill();
    } else if (item.kind === "block") round(r.x, r.y, r.w, r.h, 6, rgb(theme.ground), rgb(theme.accent), 2);
    else drawCrystal(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, theme.gold);
  });
  const p = d.player;
  ctx.save();
  ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
  ctx.rotate((d.scroll * 0.08) % (Math.PI * 2));
  round(-p.w / 2, -p.h / 2, p.w, p.h, 4, rgb(theme.pink), "#f5f8ff", 2);
  ctx.restore();
  hud("Prism Dash", `${Math.floor(d.scroll / 52)}%`);
}

function draw() {
  if (state.mode === "hub") drawHub();
  if (state.mode === "runner") drawRunner();
  if (state.mode === "rally") drawRally();
  if (state.mode === "dash") drawDash();
}

function clickButton(id) {
  if (id === "controls") {
    state.showControls = true;
    return;
  }
  if (id === "closeControls") {
    state.showControls = false;
    return;
  }
  if (state.showControls) return;
  if (id.startsWith("tab:")) state.tab = id.slice(4);
  if (id.startsWith("play:")) startGame(id.slice(5));
}

function pointer(event) {
  const r = canvas.getBoundingClientRect();
  return { x: (event.clientX - r.left) * (W / r.width), y: (event.clientY - r.top) * (H / r.height) };
}

canvas.addEventListener("mousedown", (event) => {
  state.mouseDown = true;
  const p = pointer(event);
  const hit = state.buttons.find((b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h);
  if (hit) clickButton(hit.id);
  else if (state.mode === "dash") jumpDash();
});

window.addEventListener("mouseup", () => {
  state.mouseDown = false;
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  state.keys.add(key);
  if (key === "escape") {
    if (state.showControls) state.showControls = false;
    else if (state.mode !== "hub") state.mode = "hub";
  }
  if (state.mode === "dash" && [" ", "w", "arrowup", "c"].includes(key)) jumpDash();
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.key.toLowerCase());
});

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

resetRunner();
resetRally();
resetDash();
loop();
