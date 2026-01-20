const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

/* ===== MOBILE FIX ===== */
document.body.style.touchAction = "none";
document.body.style.overflow = "hidden";

/* ================= FULLSCREEN ================= */

function tryFullscreen() {
  if (window.innerWidth > window.innerHeight) {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }
}

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
  calcLanes();
}
window.addEventListener("resize", resize);

/* ================= STATES ================= */

const STATE = {
  START: 0,
  RUNNING: 1,
  BIRTHDAY: 2,
  SONAT: 3,
  SONAT_RESULT: 4,
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

/* ================= LANE SPRITES ================= */

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

/* ================= TIMERS & FLAGS ================= */

let startTime = 0;
let birthdayTime = 0;
let sonatResultTime = 0;
let sonatMessage = "";

let birthdayDone = false;
let sonatDone = false;

/* ================= INPUT ================= */

let touchStartY = null;

canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  tryFullscreen();

  if (state === STATE.START) {
    startGame();
    return;
  }

  if (state === STATE.GAMEOVER) {
    resetGame();
    return;
  }

  if (state === STATE.SONAT) {
    const x = e.touches[0].clientX;
    if (x < canvas.width / 2) {
      sonatMessage = "yayyy 🎉";
    } else {
      sonatMessage = "kolladi 🖐\nsonat took all the cakes";
      cakeCount = 0;
    }
    sonatResultTime = Date.now();
    state = STATE.SONAT_RESULT;
    sonatDone = true;
    return;
  }

  if (state !== STATE.RUNNING) return;

  touchStartY = e.touches[0].clientY;
}, { passive:false });

canvas.addEventListener("touchend", e => {
  e.preventDefault();
  if (state !== STATE.RUNNING || touchStartY === null) return;

  const diff = touchStartY - e.changedTouches[0].clientY;

  if (diff > 40 && lane > 0) lane--;
  else if (diff < -40 && lane < 2) lane++;
  else punch();

  player.y = lanes[lane];
  touchStartY = null;
}, { passive:false });

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
  laneScroll = 0;
  lane = 1;
  animFrame = 0;
  animTimer = 0;
  punching = false;
  birthdayDone = false;
  sonatDone = false;
  calcLanes();
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

  cakes = cakes.filter(o => {
    if (rectHit(player,{x:o.x,y:lanes[o.lane]+25,w:30,h:30})) {
      cakeCount++;
      return false;
    }
    return o.x > -50;
  });

  for (const o of [...obstacles, ...enemies]) {
    if (rectHit(player,{x:o.x,y:lanes[o.lane],w:50,h:80})) {
      state = STATE.GAMEOVER;
      return;
    }
  }

  const now = Date.now();

  if (state === STATE.RUNNING && !birthdayDone && now - startTime > 30000) {
    state = STATE.BIRTHDAY;
    birthdayTime = now;
    birthdayDone = true;
  }

  if (state === STATE.BIRTHDAY && !sonatDone && now - birthdayTime > 2000) {
    state = STATE.SONAT;
  }

  if (state === STATE.SONAT_RESULT && now - sonatResultTime > 3000) {
    state = STATE.RUNNING;
    birthdayDone = true;
    sonatDone = true;
    startTime = Date.now();
  }
}

/* ================= LOOP ================= */

function loop() {
  if (
    state === STATE.RUNNING ||
    state === STATE.BIRTHDAY ||
    state === STATE.SONAT_RESULT
  ) update();

  draw();
  requestAnimationFrame(loop);
}

/* ================= INIT ================= */

resize();
loop();

 
