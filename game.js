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

/* ================= IMAGE LOADING ================= */

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

setInterval(() => state === STATE.RUNNING && cakes.push({ x: canvas.width + 40, lane: Math.random()*3|0 }), 1200);
setInterval(() => state === STATE.RUNNING && obstacles.push({ x: canvas.width + 40, lane: Math.random()*3|0 }), 2500);
setInterval(() => state === STATE.RUNNING && enemies.push({ x: canvas.width + 40, lane: Math.random()*3|0 }), 4000);

/* ================= TIMERS ================= */

let startTime = 0;
let birthdayUnlockTime = 0;
let resultTime = 0;

/* ================= JOKE ================= */

let agreeW = 180, agreeH = 60;
let noClicks = 0;

/* ✅ FIX: initial NO always below sentence */
let noX = canvas.width/2 - 100;
let noY = canvas.height/2 + 120;

/* ================= INPUT ================= */

let touchStartY = null;

canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  tryFullscreen();

  if (state === STATE.START) return startGame();
  if (state === STATE.GAMEOVER) return resetGame();

  if (state === STATE.BIRTHDAY) {
    if (Date.now() < birthdayUnlockTime) return;
    state = STATE.JOKE;

    // ensure first NO is safe
    noX = canvas.width/2 - 100;
    noY = canvas.height/2 + 120;
    return;
  }

  const x = e.touches[0].clientX;
  const y = e.touches[0].clientY;

  if (state === STATE.JOKE) {
    const agree = { x: canvas.width/2 - agreeW/2, y: canvas.height/2, w: agreeW, h: agreeH };
    const no = { x: noX, y: noY, w: 200, h: 60 };

    if (x > agree.x && x < agree.x + agree.w && y > agree.y && y < agree.y + agree.h) {
      state = STATE.RESULT;
      resultTime = Date.now();
      return;
    }

    if (x > no.x && x < no.x + no.w && y > no.y && y < no.y + no.h) {
      noClicks++;

      if (noClicks <= 3) {
        noX = Math.random() * (canvas.width - 200);
        noY = Math.random() * (canvas.height - 200);

        // ✅ FIX: NEVER allow NO above sentence
        if (noY < canvas.height/2 + 80) {
          noY = canvas.height/2 + 80;
        }
      }
      else if (noClicks <= 6) {
        agreeW += 120;
        agreeH += 80;
      }
      else {
        agreeW = canvas.width;
        agreeH = canvas.height;
      }
    }
    return;
  }

  if (state === STATE.RUNNING) touchStartY = y;
},{passive:false});

canvas.addEventListener("touchend", e => {
  e.preventDefault();
  if (state !== STATE.RUNNING || touchStartY === null) return;

  const diff = touchStartY - e.changedTouches[0].clientY;
  if (diff > 40 && lane > 0) lane--;
  else if (diff < -40 && lane < 2) lane++;

  player.y = lanes[lane];
  touchStartY = null;
},{passive:false});

/* ================= GAME FLOW ================= */

function startGame(){
  state = STATE.RUNNING;
  startTime = Date.now();
}

function resetGame(){
  state = STATE.START;
  cakes=[]; obstacles=[]; enemies=[];
  cakeCount=0; bgScroll=0;
  agreeW=180; agreeH=60; noClicks=0;
  calcLanes();
}

/* ================= UPDATE ================= */

function update(){

  if (state === STATE.RUNNING) {
    animTimer+=16;
    if(animTimer>animSpeed){animFrame=(animFrame+1)%4;animTimer=0;}

    bgScroll+=speed;
    cakes.forEach(o=>o.x-=speed);

    cakes=cakes.filter(o=>{
      if(o.x<player.x+player.w){ cakeCount++; return false; }
      return o.x>-50;
    });

    if(Date.now()-startTime>15000){
      state=STATE.BIRTHDAY;
      birthdayUnlockTime=Date.now()+2000;
    }
  }

  /* ✅ FIX: resume after yay */
  if (state === STATE.RESULT && Date.now() - resultTime > 2000) {
    state = STATE.RUNNING;
    startTime = Date.now();
  }
}

/* ================= DRAW ================= */

function draw(){
  drawBackground();

  ctx.fillStyle="#fff";
  ctx.font="20px Arial";
  ctx.fillText("🍰 "+cakeCount,20,30);

  if(state===STATE.START) drawOverlay("Tap to Start");
  if(state===STATE.BIRTHDAY) drawOverlay("Happy Birthday 😌🥳");
  if(state===STATE.RESULT) drawOverlay("yayy 🎉");

  if(state===STATE.JOKE){
    drawOverlay("Sonat is asking for chelav");

    ctx.fillStyle="#2ecc71";
    ctx.fillRect(canvas.width/2-agreeW/2,canvas.height/2,agreeW,agreeH);
    ctx.fillStyle="#000";
    ctx.fillText("AGREE",canvas.width/2,canvas.height/2+agreeH/2+10);

    if(agreeW<canvas.width){
      ctx.fillStyle="#e74c3c";
      ctx.fillRect(noX,noY,200,60);
      ctx.fillStyle="#000";
      ctx.fillText("NO",noX+100,noY+40);
    }
  }
}

function drawOverlay(t){
  ctx.fillStyle="rgba(0,0,0,0.6)";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="#fff";
  ctx.font="32px Arial";
  ctx.textAlign="center";
  ctx.fillText(t,canvas.width/2,canvas.height/2);
}

/* ================= LOOP ================= */

function loop(){
  update();
  draw();
  requestAnimationFrame(loop);
            }
 
 
