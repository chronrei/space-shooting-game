// 🎮 우주 슈팅 게임 
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ▶ 전투기 이미지 로드
const playerImage = new Image();
playerImage.src = "images/fighter.png"; // 플레이어 전투기 이미지

// ▶ 외계인 적 이미지 로드  
const alienImage = new Image();
alienImage.src = "images/ufo.png"; // 외계인 적 이미지 경로 

// ▶ 플레이어 설정 
const player = {
  x: 180,
  y: 550,
  width: 40,
  height: 40,
  speed: 5,
};

// 🔽 [추가] 게임 상태 관리 🔽
let gameState = 'START_SCREEN'; // 'START_SCREEN', 'PLAYING', 'PAUSED', 'COUNTDOWN', 'GAME_OVER'
let animationId = null;
let spawnEnemyInterval = null;
let countdownInterval = null;
const ENEMY_BULLET_COLOR = "red";

// 🔽 [추가] HTML 요소 가져오기 🔽
const gameUI = document.getElementById('game-ui');
const startMenu = document.getElementById('start-menu');
const pauseMenu = document.getElementById('pause-menu');
const gameOverMenu = document.getElementById('game-over-menu');

const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');
const resumeButton = document.getElementById('resume-button');
const restartButton = document.getElementById('restart-button');
const restartGameOverButton = document.getElementById('restart-game-over-button');

const countdownOverlay = document.getElementById('countdown-overlay');

const difficultyMenu = document.getElementById('difficulty-menu');
const easyButton = document.getElementById('easy-button');
const normalButton = document.getElementById('normal-button');
const hardButton = document.getElementById('hard-button');

const settingsMenu = document.getElementById('settings-menu');
const settingsButton = document.getElementById('settings-button');
const hitboxToggle = document.getElementById('hitbox-toggle');
const autofireToggle = document.getElementById('autofire-toggle');
const settingsBackButton = document.getElementById('settings-back-button');

const mainMenuHighScore = document.getElementById('main-menu-high-score');
const gameOverScore = document.getElementById('game-over-score');
const gameOverHighScore = document.getElementById('game-over-high-score');

const bossHealthBarContainer = document.getElementById('boss-health-bar-container');
const bossHealthBar = document.getElementById('boss-health-bar');

// ▶ 상태 변수
let bullets = [];
let enemies = [];
let enemyBullets = [];  // 1️⃣ 적 총알
let items = [];    // 3️⃣ 아이템
let effects = [];  // 2️⃣ 폭발 이펙트
let score = 0;
let keys = {};
let lives = 3;
const lifeIconSize = 30;
const lifeIconPadding = 10;
let fireRate = 75; // 75ms (0.075초) 마다 1발 발사
let lastShotTime = 0; // 마지막으로 발사한 시간
let isInvincible = false;
let invincibleTime = 1000; // 1초 무적
let invincibleTimer = 0; // 👈 [추가] 남은 무적 시간(ms)
let lastFrameTime = 0; // 👈 [추가] Delta Time 계산용
let bulletLevel = 1;
let enemyBaseHealth = 10;
let scorePerKill = 1;
let highScore = 0;
let showHitbox = false;
let autoFire = false;
let killCount = 0; // 30마리 카운트
let isBossActive = false; // 보스전 진행 중 플래그
let boss = null; // 보스 객체를 저장할 변수
let bossBaseHealth = 500; // 난이도별 기본 체력
let bossHealthBonus = 0; // 재등장 시 추가 체력
let bossHealthScaling = 50; // 난이도별 체력 증가량
let scorePerBoss = 10; // 기본값 (쉬움)

// ▶ 별 배경 (움직이는 우주 느낌)
const stars = Array.from({ length: 50 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  size: Math.random() * 2 + 1,
  speed: Math.random() * 1 + 0.5
}));

// ▶ 키 입력 처리
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// ▶ 플레이어 총알 발사
function shoot() {
  const playerCenter = player.x + player.width / 2;
  const bulletSpacing = 6; // 총알 간 간격 (조절 가능)
  const yOffsetPerStep = 5; // 중앙에서 1칸 멀어질 때마다 5px씩 아래에서 발사

  // (조건 3) 총알 개수에 따른 전체 너비 및 시작점 계산
  const totalSpread = (bulletLevel - 1) * bulletSpacing;
  const startX = playerCenter - totalSpread / 2;
  const centerIndex = (bulletLevel - 1) / 2;

  for (let i = 0; i < bulletLevel; i++) {
    const bulletX = startX + i * bulletSpacing;
    const distanceFromCenter = Math.abs(i - centerIndex);
    const yStep = Math.floor(distanceFromCenter); 
    const bulletY = player.y + (yStep * yOffsetPerStep);
    bullets.push({
      x: bulletX - 2,
      y: bulletY,
      width: 4,
      height: 10,
      speed: 7,
      damage: 2
    });
  }
}

// ▶ 적 생성
function spawnEnemy() {
  const x = Math.random() * (canvas.width - 40); // 너비 고려
  enemies.push({
    x: x, 
    y: 0, 
    width: 40, 
    height: 40, 
    speed: 2, 
    health: enemyBaseHealth,
    lastShotTime: Date.now(),
    fireTimer: 500
  });
}

// ▶ 충돌 판정
function isColliding(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

function isCollidingCircleRect(circle, rect) {
  // 원의 중심에서 가장 가까운 사각형 위의 점(testX, testY)을 찾습니다.
  let testX = circle.x;
  let testY = circle.y;

  // X축 검사
  if (circle.x < rect.x) { // 원이 사각형의 왼쪽에 있을 때
    testX = rect.x;
  } else if (circle.x > rect.x + rect.width) { // 오른쪽에 있을 때
    testX = rect.x + rect.width;
  }
  
  // Y축 검사
  if (circle.y < rect.y) { // 위쪽에 있을 때
    testY = rect.y;
  } else if (circle.y > rect.y + rect.height) { // 아래쪽에 있을 때
    testY = rect.y + rect.height;
  }

  // 원 중심과 가장 가까운 점 사이의 거리 계산
  const distX = circle.x - testX;
  const distY = circle.y - testY;
  const distance = Math.sqrt((distX * distX) + (distY * distY));

  // 거리가 원의 반지름보다 작으면 충돌
  return distance <= circle.radius;
}

function getPlayerHitbox() {
  const hitboxSize = 5; // 👈 피격 판정 정사각형의 한 변 길이 (조절 가능)
  return {
    x: player.x + (player.width / 2) - (hitboxSize / 2),
    y: player.y + (player.height / 2) - (hitboxSize / 2),
    width: hitboxSize,
    height: hitboxSize
  };
}

// ▶ 폭발 이펙트 생성
function spawnEffect(x, y) {
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2 + 1;
    effects.push({
      x,
      y,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 3,
      life: 30,
      color: `hsl(${Math.random() * 360}, 100%, 60%)`
    });
  }
}


// ▶ 아이템 생성
function spawnItem(x, y) {
  items.push({
    x,
    y,
    width: 12,
    height: 12,
    speed: 2
  });
}

function spawnBoss() {
  isBossActive = true;
  killCount = 0; // 킬 카운트 리셋

  // (조건 2) 일반 몹 생성 중지
  clearInterval(spawnEnemyInterval);
  spawnEnemyInterval = null; // 인터벌 ID 비우기

  enemies = [];
  enemyBullets = [];

  // (조건 5) 보스 객체 생성
  boss = {
    x: 150,
    y: 50, // 상단에 고정
    width: 100, // 보스 크기 (이미지에 맞게 조절)
    height: 80,
    speed: 3, // 좌우 이동 속도
    // (조건 6, 8) 체력 설정
    health: bossBaseHealth + bossHealthBonus,
    maxHealth: bossBaseHealth + bossHealthBonus,
    // (조건 4) 총알 발사 타이머 (deltaTime)
    fireTimer: 1000, // 첫 등장은 1초 후 발사
    burstShotCount: 0, // 5발 카운트
    burstDelay: 300,   // 0.3초 (발사 간격)
    reloadTime: 1000   // 1.0초 (재장전 시간)
  };

  // 보스 체력 바 표시
  bossHealthBar.style.width = '100%';
  bossHealthBarContainer.style.display = 'block';
}

// ▶ 별 배경 업데이트
function updateStars() {
  for (let s of stars) {
    s.y += s.speed;
    if (s.y > canvas.height) {
      s.y = 0;
      s.x = Math.random() * canvas.width;
    }
  }
}

// ▶ 이펙트 업데이트
function updateEffects() {
  effects.forEach(e => {
    e.x += e.dx;
    e.y += e.dy;
    e.life--;
  });
  effects = effects.filter(e => e.life > 0);
}

// ▶ 아이템 업데이트
function updateItems() {
  items.forEach(item => {
    item.y += item.speed;

    // 👈 [추가] 플레이어와 충돌했는지 확인
    if (isColliding(item, player)) { 
      if (bulletLevel < 5) {
        bulletLevel++; // 5발이 될 때까지 레벨업
      }
      else {
        score += 5; // 최대 레벨 시 보너스 점수 5점
      }
      item.collected = true;
    }
  });
  items = items.filter(i => i.y < canvas.height && !i.collected);
}

// ▶ 배경 별 그리기
function drawStars() {
  ctx.fillStyle = "#6f879eff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  for (let s of stars) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ▶ 이펙트 그리기
function drawEffects() {
  for (let e of effects) {
    const alpha = e.life / 30;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// 아이템 그리기
function drawItems() {
  ctx.fillStyle = "orange";
  for (let item of items) {
    ctx.beginPath();
    ctx.fillRect(item.x, item.y, item.width, item.height);
  }
}

function drawLives() {
  const y = lifeIconPadding; // Y좌표는 상단 여백으로 고정

  // 조건 2: 남은 수(lives)만큼 아이콘으로 표현
  for (let i = 0; i < lives; i++) {
    // 조건 3: 캔버스 우측 상단에 표시
    // (캔버스 너비 - 오른쪽 여백 - 아이콘 너비 - (아이콘 개수 * (너비+여백)))
    const x = lifeIconPadding + (i * (lifeIconSize + lifeIconPadding));
    
    // 플레이어 이미지를 아이콘으로 사용
    ctx.drawImage(playerImage, x, y, lifeIconSize, lifeIconSize);
  }
}

function loadHighScore() {
  highScore = parseInt(localStorage.getItem('shootingGameHighScore')) || 0;
}

/**
 * 게임을 초기화하는 함수 (조건 4: 재시작)
 */
function resetGame() {
  lives = 3;
  score = 0;
  player.x = 180;
  player.y = 550;
  bullets = [];
  enemies = [];
  enemyBullets = [];
  items = [];
  effects = [];
  isInvincible = false;
  invincibleTimer = 0; // 👈 [추가]
  lastShotTime = 0;
  lastFrameTime = 0; // 👈 [추가]
  bulletLevel = 1;
  // 🔽 [추가] 보스 변수 초기화 🔽
  killCount = 0;
  isBossActive = false;
  boss = null;
  bossHealthBonus = 0;
  bossHealthBarContainer.style.display = 'none'; // 체력 바 숨기기
}

/**
 * 게임 시작 (조건 1, 4)
 */
function startGame() {
  resetGame();
  gameState = 'PLAYING';
  
  // UI 업데이트
  gameUI.style.display = 'none'; // 전체 오버레이 숨김
  pauseButton.style.display = 'block'; // 일시정지 버튼 보임 (조건 2)

  // 게임 인터벌 시작
  if (!isBossActive) {
    spawnEnemyInterval = setInterval(spawnEnemy, 1000);
  }

  // 게임 루프 시작
  update();
}

/**
 * 게임 오버 처리
 */
function showGameOver() {
  gameState = 'GAME_OVER';

  // 모든 루프 및 인터벌 정지
  cancelAnimationFrame(animationId);
  clearInterval(spawnEnemyInterval);

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('shootingGameHighScore', highScore); // 로컬 스토리지에 저장
  }
  gameOverScore.innerText = score;
  gameOverHighScore.innerText = highScore;
  
  // UI 업데이트
  gameUI.style.display = 'flex'; // 오버레이 보임
  pauseButton.style.display = 'none'; // 일시정지 버튼 숨김
  gameOverMenu.style.display = 'block'; // 게임오버 메뉴 보임
  
  // 다른 메뉴 숨김
  startMenu.style.display = 'none';
  pauseMenu.style.display = 'none';
  countdownOverlay.style.display = 'none';
}

/**
 * 일시 정지 (조건 3)
 */
function pauseGame() {
  // PLAYING 상태일 때만 일시정지 가능
  if (gameState !== 'PLAYING') return; 

  gameState = 'PAUSED';

  // 게임 루프 및 인터벌 정지
  cancelAnimationFrame(animationId);
  if (spawnEnemyInterval) {
    clearInterval(spawnEnemyInterval);
  }
  
  // UI 업데이트 (조건 3)
  gameUI.style.display = 'flex'; // 오버레이 보임
  pauseMenu.style.display = 'block'; // 일시정지 메뉴 보임
  pauseButton.style.display = 'none'; // 일시정지 버튼 숨김
  
  // 다른 메뉴 숨김
  startMenu.style.display = 'none';
  gameOverMenu.style.display = 'none';
  countdownOverlay.style.display = 'none';
  difficultyMenu.style.display = 'none';
}

/**
 * 카운트다운 후 게임 재개 (조건 5)
 */
function startCountdown() {
  gameState = 'COUNTDOWN';
  
  // UI 업데이트
  pauseMenu.style.display = 'none'; // 일시정지 메뉴 숨김
  countdownOverlay.style.display = 'block'; // 카운트다운 보임

  let count = 3;
  countdownOverlay.innerText = count;

  countdownInterval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownOverlay.innerText = count;
    } else {
      // 카운트다운 종료
      clearInterval(countdownInterval);
      countdownOverlay.style.display = 'none';
      resumeGame();
    }
  }, 1000);
}

/**
 * 게임 재개 (카운트다운 이후 호출됨)
 */
function resumeGame() {
  gameState = 'PLAYING';

  // UI 업데이트
  gameUI.style.display = 'none'; // 전체 오버레이 숨김
  pauseButton.style.display = 'block'; // 일시정지 버튼 보임
  
  // 인터벌 재시작
  if (!isBossActive && !spawnEnemyInterval) {
     spawnEnemyInterval = setInterval(spawnEnemy, 1000);
  }

  lastFrameTime = 0;

  // 게임 루프 재시작
  update();
}

function backToMainMenu() {
  // 모든 루프 및 인터벌 정지 (게임오버 또는 일시정지 상태에서 호출될 수 있으므로)
  cancelAnimationFrame(animationId);
  clearInterval(spawnEnemyInterval);
  clearInterval(countdownInterval);

  loadHighScore(); 
  mainMenuHighScore.innerText = highScore;
  
  // UI 초기화
  gameUI.style.display = 'flex';
  startMenu.style.display = 'block';
  difficultyMenu.style.display = 'none';
  pauseMenu.style.display = 'none';
  gameOverMenu.style.display = 'none';
  pauseButton.style.display = 'none';
  countdownOverlay.style.display = 'none';
  
  // 게임 상태 초기화
  gameState = 'START_SCREEN';
}

// ▶ 메인 게임 루프
function update() {
  // 루프가 계속 돌지 않도록 상태 확인
  if (gameState !== 'PLAYING') return;


  // Delta Time 계산 (매 프레임 경과 시간)
  const now = Date.now();
  const deltaTime = (lastFrameTime > 0) ? (now - lastFrameTime) : 0; 
  lastFrameTime = now;

  // 무적 시간 갱신
  if (isInvincible) {
    invincibleTimer -= deltaTime; // 남은 시간(ms)에서 경과 시간을 뺌
    if (invincibleTimer <= 0) {
      isInvincible = false; // 무적 종료
        invincibleTimer = 0;
    }
  }

  updateStars();
  updateEffects();
  updateItems();    // 3️⃣ 아이템

  // 플레이어 이동
  if ((keys["ArrowLeft"] || keys["a"]) && player.x > 0) {
    player.x -= player.speed;
  }
  if ((keys["ArrowRight"] || keys["d"]) && player.x + player.width < canvas.width) {
    player.x += player.speed;
  }
  if ((keys["ArrowUp"] || keys["w"]) && player.y > 0) {
    player.y -= player.speed;
  }
  if ((keys["ArrowDown"] || keys["s"]) && player.y + player.height < canvas.height) {
    player.y += player.speed;
  }

  // 🔽 [수정] 총알 발사 (딜레이 체크) 🔽
  if (keys[" "] || autoFire) {
    const now = Date.now(); // 현재 시간
    if (now - lastShotTime > fireRate) {
      shoot(); // 총알 발사
      lastShotTime = now; // 마지막 발사 시간을 현재 시간으로 갱신
    }
  }

  // 총알 이동
  bullets.forEach(b => b.y -= b.speed);
  bullets = bullets.filter(b => b.y > 0);

  // 🔽 [수정] 보스 활성화 여부에 따라 로직 분기 🔽
  if (isBossActive && boss) {
    // ========================
    //  (A) 보스전 진행 로직
    // ========================

    // (조건 5) 보스 이동 (좌우)
    boss.x += boss.speed;
    if (boss.x <= 0 || boss.x + boss.width >= canvas.width) {
      boss.speed *= -1; // 방향 전환
    }

    // (조건 4) 보스 총알 발사 (deltaTime)
    boss.fireTimer -= deltaTime;
    if (boss.fireTimer <= 0) {
      boss.fireTimer = 300; // 0.3초 간격
      
      const bossCenterX = boss.x + boss.width / 2;
      const bossBottomY = boss.y + boss.height;

      // (조건 4-중앙) 플레이어 추적탄
      const targetX = player.x + player.width / 2;
      const targetY = player.y + player.height / 2;
      let dx = targetX - bossCenterX;
      let dy = targetY - bossBottomY;
      let dist = Math.sqrt(dx * dx + dy * dy);
      const bulletSpeed = 4; // 보스 총알 속도

      if (dist > 0) {
        enemyBullets.push({
          x: bossCenterX, y: bossBottomY, radius: 6, // 보스 총알 크기
          dx: (dx / dist) * bulletSpeed, 
          dy: (dy / dist) * bulletSpeed,
          damage: 1
        });
      }

      // (조건 4-좌/우) 세갈래탄 (중앙탄에서 각도 계산)
      const angle = Math.atan2(dy, dx); // 중앙탄 각도
      const leftAngle = angle - (Math.PI / 6); // -30도
      const rightAngle = angle + (Math.PI / 6); // +30도

      enemyBullets.push({
        x: bossCenterX, y: bossBottomY, radius: 6,
        dx: Math.cos(leftAngle) * bulletSpeed, 
        dy: Math.sin(leftAngle) * bulletSpeed,
        damage: 1
      });
      enemyBullets.push({
        x: bossCenterX, y: bossBottomY, radius: 6,
        dx: Math.cos(rightAngle) * bulletSpeed, 
        dy: Math.sin(rightAngle) * bulletSpeed,
        damage: 1
      });

      boss.burstShotCount++;
      if (boss.burstShotCount < 5) {
        // (조건 4) 5발 쏘는 중: 0.3초 간격
        boss.fireTimer = boss.burstDelay;
      } else {
        // (조건 5) 5발 다 쐈음: 1초 휴식 (재장전)
        boss.fireTimer = boss.reloadTime;
        boss.burstShotCount = 0; // 카운트 리셋
      }
    }

    // 보스-플레이어 총알 충돌 (보스 피격)
    bullets.forEach(b => {
      if (isColliding(b, boss)) {
        boss.health -= b.damage;
        bullets = bullets.filter(bullet => bullet !== b); // 총알 제거
        // 체력 바 업데이트
        bossHealthBar.style.width = `${(boss.health / boss.maxHealth) * 100}%`;
      }
    });

    // 보스-플레이어 본체 충돌 (플레이어 피격)
    // (히트박스 사용)
    if (isColliding(getPlayerHitbox(), boss)) {
      if (!isInvincible) {
        lives--;
        isInvincible = true;
        invincibleTimer = invincibleTime;
        if (lives <= 0) { showGameOver(); return; }
      }
    }

    // (조건 7, 8) 보스 처치
    if (boss.health <= 0) {
      score += scorePerBoss;

      isBossActive = false;
      bossHealthBarContainer.style.display = 'none';
      
      // (조건 8) 다음 보스 체력 증가
      bossHealthBonus += bossHealthScaling; 
      
      // (조건 3) 아이템 3개 드랍
      const dropY = boss.y + boss.height / 2; // 보스 Y위치 기준
      spawnItem(Math.random() * (canvas.width - 12), dropY);
      spawnItem(Math.random() * (canvas.width - 12), dropY);
      spawnItem(Math.random() * (canvas.width - 12), dropY);

      // (보스 폭발 이펙트)
      spawnEffect(boss.x + boss.width / 2, dropY);
      
      boss = null; // 보스 객체 제거

      enemyBullets = [];
      
      // (조건 7) 일반 몹 생성 재시작
      if (!spawnEnemyInterval) { // 중복 방지
         spawnEnemyInterval = setInterval(spawnEnemy, 1000);
      }
    }

  } else {
    // ========================
    //  (B) 일반 몹 진행 로직 (보스 없을 때)
    // ========================
    
    // (기존 적 총알 발사 로직)
    enemies.forEach(e => {
      e.fireTimer -= deltaTime;
      if (e.fireTimer <= 0) {
        const targetX = player.x + player.width / 2;
        const targetY = player.y + player.height / 2;
        const dx = targetX - (e.x + e.width / 2);
        const dy = targetY - (e.y + e.height);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
          const bulletSpeed = 3;
          const vx = (dx / distance) * bulletSpeed;
          const vy = (dy / distance) * bulletSpeed;
          enemyBullets.push({
            x: e.x + e.width / 2,
            y: e.y + e.height,
            radius: 5,
            dx: vx,
            dy: vy,
            speed: bulletSpeed,
            damage: 1
          });
        }
        e.fireTimer = 1500;
      }
    });

    // (기존 적 이동 및 플레이어 충돌)
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.y += e.speed;
      if (isColliding(e, getPlayerHitbox())) {
        if (!isInvincible) {
          lives--;
          isInvincible = true;
          invincibleTimer = invincibleTime;
          if (lives <= 0) {
            showGameOver();
            return false;
          }
        }
        e.health = 0; // 👈 부딪힌 적 즉시 사망
      }
    }

    // (기존 적 총알 피격 및 킬 카운트)
    enemies = enemies.filter(e => {
      // (플레이어와 부딪혀 체력이 0이 된 경우)
      if (e.health <= 0) {
        score += scorePerKill;
        spawnEffect(e.x + e.width / 2, e.y + e.height / 2);
        killCount++; // 👈 킬 카운트 증가
        if (Math.random() < 0.1) { 
          spawnItem(e.x + e.width / 2 - 6, e.y);
        }
        return false;
      }

      for (let b of bullets) {
        if (isColliding(e, b)) {
          e.health -= b.damage;
          bullets = bullets.filter(bullet => bullet !== b);
          if (e.health <= 0) {
            score += scorePerKill;
            spawnEffect(e.x + e.width / 2, e.y + e.height / 2);
            
            killCount++; // 👈 킬 카운트 증가

            if (Math.random() < 0.1) { 
              spawnItem(e.x + e.width / 2 - 6, e.y);
            }
            return false; 
          }
        }
      }
      return e.y < canvas.height;
    });

    // (조건 1) 보스 스폰 조건 확인
    if (killCount >= 30) {
      spawnBoss();
    }
  }


  // 적 총알 이동 및 충돌
  // 1. 모든 적 총알 이동
  enemyBullets.forEach(b => {
    b.x += b.dx;
    b.y += b.dy;
  });

  // 2. 총알 필터링 (화면 밖 or 플레이어 피격 시)
  enemyBullets = enemyBullets.filter(b => {
    // 플레이어와 총알 충돌 판정
    if (isCollidingCircleRect(b, getPlayerHitbox())) {
      if (!isInvincible) { // 👈 무적이 아닐 때만 피격
        lives--; // 목숨 감소
        isInvincible = true; // 👈 무적 시작
        invincibleTimer = invincibleTime;
        if (lives <= 0) {
          showGameOver();
          return;
        }
      }
      return false; // 총알 제거
    }
    
    // 화면 밖으로 나가지 않은 총알만 남김
    return b.x > -b.radius && b.x < canvas.width + b.radius &&
         b.y > -b.radius && b.y < canvas.height + b.radius;
  });


  // ▶ 그리기
  drawStars();       // 배경
  drawEffects();     // 2️⃣ 이펙트 폭발 효과
  drawItems();       // 3️⃣ 아이템

  // ▶ 적  
  if (isBossActive && boss) {
    // (임시) 보스를 외계인 이미지 크게 그리기
    ctx.drawImage(alienImage, boss.x, boss.y, boss.width, boss.height);
  } else {
    // (기존) 일반 적 그리기
    enemies.forEach(e => {
      ctx.drawImage(alienImage, e.x, e.y, e.width, e.height);
    });
  }

  // ▶ 플레이어 총알
  bullets.forEach(b => {
    ctx.fillStyle = "yellow";
    ctx.fillRect(b.x, b.y, b.width, b.height);
  });


  // ▶ 적 총알
  enemyBullets.forEach(b => {
    ctx.fillStyle = ENEMY_BULLET_COLOR; // 👈 변수 사용
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  });


  // ▶ 플레이어
  let drawPlayer = true;
  if (isInvincible) {
    // 100ms 간격으로 깜빡임 (현재 시간을 200으로 나눈 나머지가 100보다 작으면 숨김)
    if (Date.now() % 200 < 100) { 
      drawPlayer = false;
    }
  }

  if (drawPlayer) {
    ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
  }

  // ▶ 점수 표시
  drawLives();
  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  const scoreY = lifeIconPadding + lifeIconSize + 20; // (예: 10 + 30 + 20 = 60)
  ctx.fillText("Score: " + score, lifeIconPadding, scoreY);

  if (showHitbox) {
    const hitbox = getPlayerHitbox();
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 1;
    ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
  }

  animationId = requestAnimationFrame(update);
}

// 🔽 [추가] 버튼 이벤트 리스너 🔽
startButton.addEventListener('click', () => {
  startMenu.style.display = 'none';
  difficultyMenu.style.display = 'flex'; // 👈 난이도 메뉴 보이기
});

// 2. 난이도 버튼들: 체력 설정 후 게임 시작 (조건 3)
easyButton.addEventListener('click', () => {
  enemyBaseHealth = 10;
  scorePerKill = 1;
  scorePerBoss = 100;
  bossBaseHealth = 500; // 👈 [추가]
  bossHealthScaling = 50; // 👈 [추가]
  startGame();
});

normalButton.addEventListener('click', () => {
  enemyBaseHealth = 15;
  scorePerKill = 3;
  scorePerBoss = 300;
  bossBaseHealth = 600; // 👈 [추가]
  bossHealthScaling = 75; // 👈 [추가]
  startGame();
});

hardButton.addEventListener('click', () => {
  enemyBaseHealth = 20;
  scorePerKill = 5;
  scorePerBoss = 500;
  bossBaseHealth = 700; // 👈 [추가]
  bossHealthScaling = 100; // 👈 [추가]
  startGame();
});
pauseButton.addEventListener('click', pauseGame);
resumeButton.addEventListener('click', startCountdown);

// 재시작 버튼 2개 모두 동일한 기능(startGame) 수행
restartButton.addEventListener('click', backToMainMenu);
restartGameOverButton.addEventListener('click', backToMainMenu);

settingsButton.addEventListener('click', () => {
  startMenu.style.display = 'none';
  settingsMenu.style.display = 'flex'; // 'flex'로 해야 CSS 정렬이 먹힘
});

settingsBackButton.addEventListener('click', () => {
  settingsMenu.style.display = 'none';
  startMenu.style.display = 'block';
});

hitboxToggle.addEventListener('change', (e) => {
  showHitbox = e.target.checked;
});

autofireToggle.addEventListener('change', (e) => {
  autoFire = e.target.checked;
});

// 🔽 [추가] 탭 비활성화 시 자동 일시정지 🔽
document.addEventListener('visibilitychange', function() {
  // 탭이 숨겨졌고 (document.hidden === true)
  // 현재 게임 상태가 'PLAYING'일 때
  if (document.hidden && gameState === 'PLAYING') {
    
    // 👈 우리가 이미 만든 일시정지 함수를 그대로 호출합니다.
    pauseGame(); 
  }
});

// 🔽 [추가] 초기 UI 상태 설정 🔽
// (페이지 로드 시 시작 메뉴만 보이도록)
loadHighScore(); // 👈 [추가] 페이지 로드 시 최고 기록 불러오기
mainMenuHighScore.innerText = highScore; // 👈 [추가] 메인 메뉴에 표시
gameUI.style.display = 'flex';
startMenu.style.display = 'block';
difficultyMenu.style.display = 'none';
pauseMenu.style.display = 'none';
gameOverMenu.style.display = 'none';
pauseButton.style.display = 'none';
countdownOverlay.style.display = 'none';