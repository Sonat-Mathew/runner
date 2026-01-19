const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let birthdayShown = false;

/* ================= IMAGE LOADING ================= */

const images = {};
function loadImage(key, src) {
  const img = new Image();
  img.src = src;
  images[key] = img;
}

loadImage("playerRun", "assets/player_run.png");
loadImage("cake", "assets/cake.png");
loadImage("obstacle", "assets/obstacle.png");
loadImage("enemy", "assets/enemy.png");
loadImage("lane", "assets/lane.png");

/* ================= CANVAS ================= */

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

/* ================= STATES ================= */

const STATE = {
  START: 0,
  RUNNING: 1,
  BIRTHDAY: 2,
  SONAT: 3,
  GAMEOVER: 4
};
let state = STATE.START;

/* ================= WORLD ================= */

const speed = 6;
const groundH = 80;

/* ================= PLAYER ================= */

const player = { x: 120, y: 0, w: 50, h: 80 };

/* ================= LANES ================= */

const laneGap = 120;
let lanes = [];
let lane = 1;

function calcLanes() {
  const bottom = canvas.height - groundH - player.h - 10;
  const middle = bottom - laneGap;
  const top = middle - laneGap;
  lanes = [top, middle, bottom];
  player.y = lanes[lane];
}
calcLanes();

/* ================= PLAYER SPRITE DATA ================= */

const PLAYER_FRAME_Y = 341;
const PLAYER_FRAME_HEIGHT = 479;

const playerFrames = [
  { x: 0, w: 256 },
  { x: 256, w: 247 },
  { x: 503, w: 265 },
  { x: 768, w: 344 },
  { x: 1140, w: 396 }
];

let animFrame = 0;
let animTimer = 0;
const animSpeed = 120;
let punching = false;

/* ================= LANE SPRITE DATA ================= */

const LANE_X_START = 94;
const LANE_WIDTH = 1355;
const LANE_DRAW_WIDTH = 600;
const LANE_DRAW_HEIGHT = 50;

const LANE_SPRITES = [
  { y: 69, h: 269 },
  { y: 387, h: 275 },
  { y: 719, h: 267 }
];

let laneScroll = 0;

/* ================= OBJECTS ================= */

let cakes = [];
let obstacles = [];
let enemies = [];
let cakeCount = 0;

/* ================= TIME ================= */

let startTime = 0;
let sonatDone = false;

/* ================= SONAT ================= */

function resolveSonat(choice) {
  if (choice === 2) cakeCount = 0;
  state = STATE.RUNNING;
}

/* ================= INPUT ================= */

window.addEventListener("keydown", e => {
  if (state === STATE.SONAT) {
    if (e.key === "1") resolveSonat(1);
    if (e.key === "2") resolveSonat(2);
    return;
  }

  if (state !== STATE.RUNNING) return;

  if (e.key === "ArrowUp" && lane > 0) lane--;
  if (e.key === "ArrowDown" && lane < 2) lane++;
  if (e.key === " ") punch();

  player.y = lanes[lane];
});

canvas.addEventListener("click", e => {
  if (state === STATE.START) startGame();
  else if (state === STATE.BIRTHDAY) state = STATE.RUNNING;
  else if (state === STATE.SONAT) {
    if (e.clientX < canvas.width / 2) resolveSonat(1);
    else resolveSonat(2);
  }
  else if (state === STATE.GAMEOVER) resetGame();
});

/* ================= GAME FLOW ================= */

function startGame() {
  state = STATE.RUNNING;
  startTime = Date.now();
}

function resetGame() {
  state = STATE.START;
  cakes = [];
  obstacles = [];
  enemies = [];
  cakeCount = 0;
  sonatDone = false;
  birthdayShown = false;
  laneScroll = 0;
}

/* ================= SPAWNING ================= */

setInterval(() => {
  if (state === STATE.RUNNING)
    cakes.push({ x: canvas.width + 40, lane: Math.floor(Math.random() * 3) });
}, 1200);

setInterval(() => {
  if (state === STATE.RUNNING)
    obstacles.push({ x: canvas.width + 40, lane: Math.floor(Math.random() * 3) });
}, 2500);

setInterval(() => {
  if (state === STATE.RUNNING)
    enemies.push({ x: canvas.width + 40, lane: Math.floor(Math.random() * 3) });
}, 4000);

/* ================= COLLISION ================= */

function rectHit(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

/* ================= PUNCH ================= */

function punch() {
  punching = true;
  animFrame = 4;

  const box = { x: player.x + player.w, y: player.y, w: 60, h: player.h };

  enemies = enemies.filter(e =>
    !rectHit(box, { x: e.x, y: lanes[e.lane], w: 50, h: 80 })
  );

  setTimeout(() => {
    punching = false;
    animFrame = 0;
  }, 150);
}

/* ================= UPDATE ================= */

function update() {
  animTimer += 16;
  if (!punching && animTimer > animSpeed) {
    animFrame = (animFrame + 1) % 4;
    animTimer = 0;
  }

  laneScroll += speed;

  cakes.forEach(o => o.x -= speed);
  obstacles.forEach(o => o.x -= speed);
  enemies.forEach(o => o.x -= speed);

  // cake collision
  cakes = cakes.filter(o => {
    if (rectHit(player, { x:o.x, y:lanes[o.lane]+25, w:30, h:30 })) {
      cakeCount++;
      return false;
    }
    return o.x > -50;
  });

  // obstacle collision
  for (const o of obstacles) {
    if (rectHit(player, { x:o.x, y:lanes[o.lane], w:50, h:80 })) {
      state = STATE.GAMEOVER;
      return;
    }
  }

  // zombie collision (NEW)
  for (const e of enemies) {
    if (rectHit(player, { x:e.x, y:lanes[e.lane], w:50, h:80 })) {
      state = STATE.GAMEOVER;
      return;
    }
  }

  enemies = enemies.filter(o => o.x > -50);

  // birthday event
  if (!birthdayShown && Date.now() - startTime > 30000) {
    state = STATE.BIRTHDAY;
    birthdayShown = true;
  }

  // sonat event
  if (state === STATE.RUNNING && Date.now() - startTime > 33000 && !sonatDone) {
    state = STATE.SONAT;
    sonatDone = true;
  }
}

/* ================= DRAW ================= */

function drawLaneBackgrounds() {
  if (state !== STATE.RUNNING) return;

  for (let i = 0; i < 3; i++) {
    const y = lanes[i] + player.h - 10;
    const sprite = LANE_SPRITES[i];

    for (let x = -laneScroll % LANE_DRAW_WIDTH; x < canvas.width; x += LANE_DRAW_WIDTH) {
      ctx.drawImage(
        images.lane,
        LANE_X_START, sprite.y, LANE_WIDTH, sprite.h,
        x, y,
        LANE_DRAW_WIDTH, LANE_DRAW_HEIGHT
      );
    }
  }
}

function draw() {
  ctx.fillStyle = "#87ceeb";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  drawLaneBackgrounds();

  ctx.fillStyle = "#444";
  ctx.fillRect(0,canvas.height-groundH,canvas.width,groundH);

  const f = playerFrames[animFrame];
  ctx.drawImage(
    images.playerRun,
    f.x, PLAYER_FRAME_Y, f.w, PLAYER_FRAME_HEIGHT,
    player.x, player.y,
    player.w, player.h
  );

  cakes.forEach(o => ctx.drawImage(images.cake, o.x, lanes[o.lane]+25, 30, 30));
  obstacles.forEach(o => ctx.drawImage(images.obstacle, o.x, lanes[o.lane], 50, 80));
  enemies.forEach(o => ctx.drawImage(images.enemy, o.x, lanes[o.lane], 50, 80));

  ctx.fillStyle = "#000";
  ctx.font = "20px Arial";
  ctx.fillText("🍰 " + cakeCount, 20, 30);

  ctx.textAlign = "center";
  if (state === STATE.START) ctx.fillText("CLICK TO START", canvas.width/2, canvas.height/2);
  if (state === STATE.BIRTHDAY) ctx.fillText("🎉 Happy Birthday 🎉 — Click", canvas.width/2, canvas.height/2);
  if (state === STATE.SONAT) {
    ctx.fillText("Sonat asks for chelav", canvas.width/2, canvas.height/2 - 40);
    ctx.fillText("1. Agree", canvas.width/2, canvas.height/2);
    ctx.fillText("2. Hit", canvas.width/2, canvas.height/2 + 40);
  }
  if (state === STATE.GAMEOVER) ctx.fillText("Game Over — Click to Restart", canvas.width/2, canvas.height/2);
}

/* ================= LOOP ================= */

function loop() {
  if (state === STATE.RUNNING) update();
  draw();
  requestAnimationFrame(loop);
}
loop();
