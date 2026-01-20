const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

/* ===== MOBILE FIX ===== */
document.body.style.touchAction = "none";
document.body.style.overflow = "hidden";

/* ================= FULLSCREEN ================= */

function tryFullscreen() {
  if (document.fullscreenElement) return;
  document.documentElement.requestFullscreen?.();
}

/* ================= BACKGROUND MUSIC (FIXED PROPERLY) ================= */

// ❗ DO NOT create Audio here
let bgMusic = null;
let musicStarted = false;

/* ================= IMAGE LOADING (FIXED) ================= */

const images = {};
let imagesLoaded = 0;
const TOTAL_IMAGES = 6;

function loadImage(key, src) {
  const img = new Image();
  img.onload = () => {
    imagesLoaded++;
    if (imagesLoaded === TOTAL_IMAGES) {
      resize();
      loop();
    }
  };
  img.src = src;
  images[key] = img;
}

loadImage("background", "assets/background.png");
loadImage("playerRun", "assets/player_run.png");
loadImage("cake", "assets/cake.png");
loadImage("obstacle", "assets/obstacle.png");
loadImage("enemy", "assets/enemy.png");
loadImage("lane", "assets/lane.png");

/* ================= CANVAS ================= */

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  calcLanes();
}
window.addEventListener("resize", resize);

/* ================= STATES ================= */

const STATE = {
  START: 0,
  RUNNING: 1,
  BIRTHDAY: 2,
  JOKE: 3,
  RESULT: 4,
  GAMEOVER: 5
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

/* ================= PLAYER SPRITE ================= */

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

/* ================= LANE ================= */

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

/* ================= BACKGROUND ================= */

let bgScroll = 0;
const bgSpeed = 1.2;

function drawBackground() {
  const img = images.background;
  if (!img.width) return;

  bgScroll += bgSpeed;
  const x = -bgScroll % img.width;
  ctx.drawImage(img, x, 0, img.width, canvas.height);
  ctx.drawImage(img, x + img.width, 0, img.width, canvas.height);
}

/* ================= OBJECTS ================= */

let cakes = [];
let obstacles = [];
let enemies = [];
let cakeCount = 0;

/* ================= SPAWNING ================= */

setInterval(() => state === STATE.RUNNING && cakes.push({ x: canvas.width + 40, lane: Math.random() * 3 | 0 }), 1200);
setInterval(() => state === STATE.RUNNING && obstacles.push({ x: canvas.width + 40, lane: Math.random() * 3 | 0 }), 2500);
setInterval(() => state === STATE.RUNNING && enemies.push({ x: canvas.width + 40, lane: Math.random() * 3 | 0 }), 4000);

/* ================= TIMERS ================= */

let startTime = 0;
let birthdayTime = 0;
let birthdayUnlockTime = 0;
let resultTime = 0;

/* ================= JOKE ================= */

let agreeW = 180, agreeH = 60;
let noClicks = 0;
let noX = canvas.width / 2 - 100;
let noY = canvas.height / 2 + 100;

/* ================= INPUT ================= */

let touchStartY = null;

canvas.addEventListener("touchstart", e => {

  // 🎵 REAL FIX: create Audio INSIDE user interaction
  if (!musicStarted) {
    bgMusic = new Audio("assets/bg_music.mp3");
    bgMusic.loop = true;
    bgMusic.volume = 0.4;
    bgMusic.play();
    musicStarted = true;
  }

  e.preventDefault();
  tryFullscreen();

  if (state === STATE.START) return startGame();
  if (state === STATE.GAMEOVER) return resetGame();

  if (state === STATE.BIRTHDAY) {
    if (Date.now() < birthdayUnlockTime) return;
    state = STATE.JOKE;
    return;
  }

  const x = e.touches[0].clientX;
  const y = e.touches[0].clientY;

  if (state === STATE.JOKE) {
    const agree = { x: canvas.width / 2 - agreeW / 2, y: canvas.height / 2, w: agreeW, h: agreeH };
    const no = { x: noX, y: noY, w: 200, h: 60 };

    if (x > no.x && x < no.x + no.w && y > no.y && y < no.y + no.h) {
      noClicks++;
      if (noClicks <= 3) {
        noX = Math.random() * (canvas.width - 200);
        noY = Math.random() * (canvas.height - 200);
      } else if (noClicks <= 6) {
        agreeW += 120;
        agreeH += 80;
      } else {
        agreeW = canvas.width;
        agreeH = canvas.height;
      }
      return;
    }

    if (x > agree.x && x < agree.x + agree.w && y > agree.y && y < agree.y + agree.h) {
      state = STATE.RESULT;
      resultTime = Date.now();
      return;
    }
    return;
  }

  if (state === STATE.RUNNING) touchStartY = y;
}, { passive: false });

canvas.addEventListener("touchend", e => {
  e.preventDefault();
  if (state !== STATE.RUNNING || touchStartY === null) return;

  const diff = touchStartY - e.changedTouches[0].clientY;
  if (diff > 40 && lane > 0) lane--;
  else if (diff < -40 && lane < 2) lane++;
  else punch();

  player.y = lanes[lane];
  touchStartY = null;
}, { passive: false });

/* ================= GAME FLOW ================= */

function startGame() {
  state = STATE.RUNNING;
  startTime = Date.now();
}

function resetGame() {
  state = STATE.START;
  cakes = []; obstacles = []; enemies = [];
  cakeCount = 0; laneScroll = 0; bgScroll = 0;
  lane = 1; animFrame = 0; animTimer = 0;
  agreeW = 180; agreeH = 60; noClicks = 0;
  calcLanes();
}

/* ================= COLLISION ================= */

const rectHit = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x &&
  a.y < b.y + b.h && a.y + a.h > b.y;

/* ================= PUNCH ================= */

function punch() {
  punching = true; animFrame = 4;
  const box = { x: player.x + player.w, y: player.y, w: 60, h: player.h };
  enemies = enemies.filter(e => !rectHit(box, { x: e.x, y: lanes[e.lane], w: 50, h: 80 }));
  setTimeout(() => { punching = false; animFrame = 0; }, 150);
}

/* ================= UPDATE ================= */

function update() {

  if (state === STATE.RUNNING) {
    animTimer += 16;
    if (!punching && animTimer > animSpeed) {
      animFrame = (animFrame + 1) % 4;
      animTimer = 0;
    }

    laneScroll += speed;
    cakes.forEach(o => o.x -= speed);
    obstacles.forEach(o => o.x -= speed);
    enemies.forEach(o => o.x -= speed);

    cakes = cakes.filter(o => {
      if (rectHit(player, { x: o.x, y: lanes[o.lane] + 25, w: 30, h: 30 })) {
        cakeCount++; return false;
      }
      return o.x > -50;
    });

    for (const o of [...obstacles, ...enemies]) {
      if (rectHit(player, { x: o.x, y: lanes[o.lane], w: 50, h: 80 })) {
        state = STATE.GAMEOVER;
        if (bgMusic) bgMusic.pause();
        return;
      }
    }

    if (Date.now() - startTime > 15000) {
      state = STATE.BIRTHDAY;
      birthdayTime = Date.now();
      birthdayUnlockTime = birthdayTime + 2000;
    }
  }

  if (state === STATE.RESULT && Date.now() - resultTime > 2000) {
    state = STATE.RUNNING;
    startTime = Date.now();
  }
}

/* ================= DRAW ================= */

function draw() {
  drawBackground();
  drawLaneBackgrounds();

  const f = playerFrames[animFrame];
  ctx.drawImage(images.playerRun, f.x, PLAYER_FRAME_Y, f.w, PLAYER_FRAME_HEIGHT,
    player.x, player.y, player.w, player.h);

  cakes.forEach(o => ctx.drawImage(images.cake, o.x, lanes[o.lane] + 25, 30, 30));
  obstacles.forEach(o => ctx.drawImage(images.obstacle, o.x, lanes[o.lane], 50, 80));
  enemies.forEach(o => ctx.drawImage(images.enemy, o.x, lanes[o.lane], 50, 80));

  ctx.fillStyle = "#000"; ctx.font = "20px Arial";
  ctx.fillText("🍰 " + cakeCount, 20, 30);

  if (state === STATE.START) drawOverlay("Tap to Start");
  if (state === STATE.GAMEOVER) drawOverlay("Game Over");
  if (state === STATE.BIRTHDAY) drawOverlay("Happy Birthday 😌🥳");
  if (state === STATE.RESULT) drawOverlay("yayy 🎉");

  if (state === STATE.JOKE) {
    drawOverlay("Sonat is asking for chelav");

    ctx.fillStyle = "#2ecc71";
    ctx.fillRect(canvas.width / 2 - agreeW / 2, canvas.height / 2, agreeW, agreeH);
    ctx.fillStyle = "#000";
    ctx.fillText("AGREE", canvas.width / 2, canvas.height / 2 + agreeH / 2 + 10);

    if (agreeW < canvas.width) {
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(noX, noY, 200, 60);
      ctx.fillStyle = "#000";
      ctx.fillText("NO", noX + 100, noY + 40);
    }
  }
}

function drawLaneBackgrounds() {
  for (let i = 0; i < 3; i++) {
    const y = lanes[i] + player.h - 10, s = LANE_SPRITES[i];
    for (let x = -laneScroll % LANE_DRAW_WIDTH; x < canvas.width; x += LANE_DRAW_WIDTH) {
      ctx.drawImage(images.lane, LANE_X_START, s.y, LANE_WIDTH, s.h,
        x, y, LANE_DRAW_WIDTH, LANE_DRAW_HEIGHT);
    }
  }
}

function drawOverlay(t) {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "32px Arial";
  ctx.textAlign = "center";
  ctx.fillText(t, canvas.width / 2, canvas.height / 2);
}

/* ================= LOOP ================= */

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
  }
 
