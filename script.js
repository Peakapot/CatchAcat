const world = document.getElementById("world");
const viewport = document.getElementById("viewport");
const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const finalScoreEl = document.getElementById("finalScore");
const overlay = document.getElementById("overlay");
const restartBtn = document.getElementById("restart");

const WORLD = { width: 2300, height: 1500 };
const game = {
  score: 0,
  time: 60,
  running: true,
  keys: new Set(),
  lastCast: 0,
};

const obstacles = [
  { x: 370, y: 280, w: 210, h: 95, type: "bench", icon: "🪑" },
  { x: 800, y: 520, w: 260, h: 110, type: "slide", icon: "🛝" },
  { x: 1450, y: 360, w: 220, h: 120, type: "swing", icon: "🎠" },
  { x: 1840, y: 880, w: 240, h: 110, type: "bench", icon: "🪑" },
  { x: 590, y: 1050, w: 230, h: 120, type: "swing", icon: "🎠" },
  { x: 1260, y: 1160, w: 260, h: 120, type: "slide", icon: "🛝" },
  { x: 2000, y: 510, w: 220, h: 110, type: "bench", icon: "🪑" },
  { x: 230, y: 760, w: 220, h: 100, type: "slide", icon: "🛝" },
];

const kittyColors = ["c1", "c2", "c3", "c4", "c5"];

const warden = {
  x: 240,
  y: 220,
  speed: 5,
  size: 24,
  node: makeNode("warden", "🕵️"),
};

const kittens = Array.from({ length: 11 }, (_, i) => {
  const cat = {
    x: 300 + Math.random() * 1800,
    y: 200 + Math.random() * 1100,
    vx: (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 1.7),
    vy: (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 1.7),
    size: 17,
    node: makeNode(`kitten ${kittyColors[i % kittyColors.length]}`, "🐱"),
  };
  return cat;
});

setup();
let timer = setInterval(tickClock, 1000);
requestAnimationFrame(loop);

function setup() {
  world.innerHTML = "";
  world.appendChild(warden.node);
  drawObstacles();
  kittens.forEach((cat) => world.appendChild(cat.node));
  updateHUD();
  overlay.classList.add("hidden");
}

function drawObstacles() {
  obstacles.forEach((o) => {
    const node = document.createElement("div");
    node.className = `obstacle ${o.type}`;
    node.style.left = `${o.x}px`;
    node.style.top = `${o.y}px`;
    node.style.width = `${o.w}px`;
    node.style.height = `${o.h}px`;
    node.textContent = o.icon;
    world.appendChild(node);
  });
}

function makeNode(className, emoji) {
  const el = document.createElement("div");
  el.className = `entity ${className}`;
  el.textContent = emoji;
  return el;
}

function loop(now) {
  if (game.running) {
    moveWarden();
    moveKittens();
    render();
    if (game.keys.has(" ") && now - game.lastCast > 280) {
      game.lastCast = now;
      castNet();
    }
  }
  requestAnimationFrame(loop);
}

function moveWarden() {
  let dx = 0;
  let dy = 0;
  if (game.keys.has("arrowup") || game.keys.has("w")) dy -= warden.speed;
  if (game.keys.has("arrowdown") || game.keys.has("s")) dy += warden.speed;
  if (game.keys.has("arrowleft") || game.keys.has("a")) dx -= warden.speed;
  if (game.keys.has("arrowright") || game.keys.has("d")) dx += warden.speed;

  const next = { x: warden.x + dx, y: warden.y + dy };
  if (!hitsObstacle(next.x, next.y, warden.size)) {
    warden.x = clamp(next.x, warden.size, WORLD.width - warden.size);
    warden.y = clamp(next.y, warden.size, WORLD.height - warden.size);
  }
}

function moveKittens() {
  for (const cat of kittens) {
    let nx = cat.x + cat.vx;
    let ny = cat.y + cat.vy;

    if (hitsObstacle(nx, ny, cat.size)) {
      cat.vx *= -1;
      cat.vy *= -1;
      nx = cat.x + cat.vx;
      ny = cat.y + cat.vy;
    }

    if (nx < cat.size || nx > WORLD.width - cat.size) cat.vx *= -1;
    if (ny < cat.size || ny > WORLD.height - cat.size) cat.vy *= -1;

    cat.x = clamp(nx, cat.size, WORLD.width - cat.size);
    cat.y = clamp(ny, cat.size, WORLD.height - cat.size);

    if (Math.random() < 0.006) {
      cat.vx += (Math.random() - 0.5) * 0.8;
      cat.vy += (Math.random() - 0.5) * 0.8;
      cat.vx = clamp(cat.vx, -3.2, 3.2);
      cat.vy = clamp(cat.vy, -3.2, 3.2);
    }
  }
}

function castNet() {
  const net = document.createElement("div");
  net.className = "net";
  net.style.left = `${warden.x}px`;
  net.style.top = `${warden.y}px`;
  world.appendChild(net);
  setTimeout(() => net.remove(), 170);

  const catchRadius = 88;
  for (const cat of kittens) {
    const d = Math.hypot(cat.x - warden.x, cat.y - warden.y);
    if (d <= catchRadius) {
      game.score += 10;
      respawnKitten(cat);
    }
  }
  updateHUD();
}

function respawnKitten(cat) {
  for (let tries = 0; tries < 20; tries++) {
    const x = 60 + Math.random() * (WORLD.width - 120);
    const y = 60 + Math.random() * (WORLD.height - 120);
    if (!hitsObstacle(x, y, cat.size + 8)) {
      cat.x = x;
      cat.y = y;
      return;
    }
  }
}

function hitsObstacle(x, y, radius) {
  return obstacles.some((o) => {
    const left = o.x - radius;
    const right = o.x + o.w + radius;
    const top = o.y - radius;
    const bottom = o.y + o.h + radius;
    return x > left && x < right && y > top && y < bottom;
  });
}

function render() {
  positionNode(warden.node, warden.x, warden.y);
  kittens.forEach((cat) => positionNode(cat.node, cat.x, cat.y));

  const targetX = clamp(warden.x - viewport.clientWidth / 2, 0, WORLD.width - viewport.clientWidth);
  const targetY = clamp(warden.y - viewport.clientHeight / 2, 0, WORLD.height - viewport.clientHeight);
  world.style.transform = `translate(${-targetX}px, ${-targetY}px)`;
}

function positionNode(node, x, y) {
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
}

function tickClock() {
  if (!game.running) return;
  game.time -= 1;
  updateHUD();
  if (game.time <= 0) {
    clearInterval(timer);
    game.running = false;
    finalScoreEl.textContent = game.score;
    overlay.classList.remove("hidden");
  }
}

function updateHUD() {
  scoreEl.textContent = game.score;
  timeEl.textContent = game.time;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function resetGame() {
  game.score = 0;
  game.time = 60;
  game.running = true;
  warden.x = 240;
  warden.y = 220;
  kittens.forEach((cat) => respawnKitten(cat));
  updateHUD();
  overlay.classList.add("hidden");
  clearInterval(timer);
  timer = setInterval(tickClock, 1000);
}

window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
    e.preventDefault();
  }
  game.keys.add(e.key.toLowerCase());
});

window.addEventListener("keyup", (e) => {
  game.keys.delete(e.key.toLowerCase());
});

restartBtn.addEventListener("click", resetGame);
