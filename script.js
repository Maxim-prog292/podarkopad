const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = 1920;
canvas.height = 1080;

// --- ⚙️ НОВЫЕ ССЫЛКИ НА HTML-ЭЛЕМЕНТЫ ---
const menuScreen = document.getElementById("menu-screen");
const gameoverScreen = document.getElementById("gameover-screen");
const pauseScreen = document.getElementById("pause-screen"); // <-- НОВОЕ
const startButton = document.getElementById("start-button");
const restartButton = document.getElementById("restart-button");
const menuHighScore = document.getElementById("menu-high-score");
const finalScore = document.getElementById("final-score");
const gameoverHighScore = document.getElementById("gameover-high-score");
// Ссылки на HUD
const gameHud = document.getElementById("game-hud"); // <-- НОВОЕ
const hudScore = document.getElementById("hud-score"); // <-- НОВОЕ
const hudLives = document.getElementById("hud-lives"); // <-- НОВОЕ
const hudHighScore = document.getElementById("hud-high-score"); // <-- НОВОЕ
// ------------------------------------------

// --- 🖼️ Загрузка изображений ---
const basketImg = new Image();
const goodGiftImg = new Image();
const badGiftImg = new Image();
const bonusGiftImg = new Image();
const backgroundImg = new Image();

basketImg.src = "images/basket.png";
goodGiftImg.src = "images/good-gift.png";
badGiftImg.src = "images/bad-gift.png";
bonusGiftImg.src = "images/bonus-gift.png";
backgroundImg.src = "images/background.jpg";

let imagesToLoad = 5;
function onImageLoad() {
  imagesToLoad--;
  if (imagesToLoad === 0) {
    menuHighScore.textContent = `Рекорд: ${highScore}`;
    menuScreen.classList.remove("hidden");
    initSnowflakes();
    loop();
  }
}
basketImg.onload = onImageLoad;
goodGiftImg.onload = onImageLoad;
badGiftImg.onload = onImageLoad;
bonusGiftImg.onload = onImageLoad;
backgroundImg.onload = onImageLoad;

// --- ⚙️ ПЕРЕМЕННЫЕ ИГРЫ ---
let gameState = "menu";
let isPaused = false;
let gifts = [],
  score = 0,
  lives = 5,
  highScore = localStorage.getItem("giftCatcherHighScore") || 0;

let basket = { x: canvas.width / 2, y: canvas.height - 100, w: 200, h: 100 };

let showHitboxes = false; // Отладочная переменная для показа хитбоксов
// --- ⚡ POWER-UP VARIABLES (НОВЫЕ) ---
let slowMode = false; // Slow Time
let slowModeTimer = 0;
const SLOW_DURATION = 300; // 5 секунд @ 60 FPS

let magnetMode = false; // Magnet
let magnetTimer = 0;
const MAGNET_DURATION = 360; // 6 секунд
const MAGNET_STRENGTH = 0.05; // Сила притяжения (0.05 - хорошо)

let doubleScoreMode = false; // Double Score
let doubleScoreTimer = 0;
const DOUBLE_SCORE_DURATION = 600; // 10 секунд

// Имена бустов, которые будут использоваться для случайного выбора
const POWER_UP_TYPES = ["slow", "magnet", "doubleScore", "screenClear"];

/**
 * Выбирает случайный буст и активирует его.
 * Эта функция заменяет старый вызов activateRandomPowerUp().
 */
function pickAndActivateRandomPowerUp() {
  const powerUpType =
    POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
  activatePowerUp(powerUpType);
}

// --- 📈 Переменные сложности / Снежинки ---
let baseSpeed = 3;
let speedMultiplier = 0.5;
let spawnInterval = 800;
let spawnTimer = 0;
let spawnGiftInterval;
const maxSnowflakes = 150;
let snowflakes = [];
const windSpeed = 1.5;
const windVariation = 0.5;

// --- ФУНКЦИЯ ОБНОВЛЕНИЯ HUD ---
function updateHUD() {
  hudScore.textContent = `Очки: ${score}`;
  hudHighScore.textContent = `Рекорд: ${highScore}`;
  // Визуальное отображение жизней
  let heartIcons = "";
  for (let i = 0; i < lives; i++) {
    heartIcons += "❤️";
  }
  hudLives.textContent = `Жизни: ${heartIcons}`;
}

// --- 🎮 ОБРАБОТЧИКИ ВВОДА ---

function handleMove(clientX) {
  if (gameState !== "playing" || isPaused) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  basket.x = (clientX - rect.left) * scaleX;
}

canvas.addEventListener("mousemove", (e) => {
  handleMove(e.clientX);
});
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    handleMove(e.touches[0].clientX);
  },
  { passive: false }
);
canvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    handleMove(e.touches[0].clientX);
  },
  { passive: false }
);
// --- ЛОГИКА ПАУЗЫ ---
window.addEventListener("keydown", (e) => {
  if (e.key === "p" || e.key === "P" || e.key === "З" || e.key === "з") {
    if (gameState === "playing") {
      isPaused = !isPaused;
      if (isPaused) {
        // pauseScreen.classList.remove('hidden'); // <-- УДАЛЕНО
        clearInterval(spawnGiftInterval);
        console.log("Game Paused (Dev Mode)"); // Сообщение для разработчика
      } else {
        // pauseScreen.classList.add('hidden'); // <-- УДАЛЕНО
        startSpawning();
        console.log("Game Resumed (Dev Mode)"); // Сообщение для разработчика
      }
    }
  }
  // Отладочные клавиши для разработчика (активируются только в режиме игры)
  if (gameState === "playing") {
    // H/h: хитбоксы
    if (e.key === "h" || e.key === "H") showHitboxes = !showHitboxes;

    // --- НОВЫЕ ОТЛАДОЧНЫЕ КЛАВИШИ БУСТОВ ---
    if (e.key === "1") {
      activatePowerUp("slow"); // Замедление (1)
    } else if (e.key === "2") {
      activatePowerUp("magnet"); // Магнит (2)
    } else if (e.key === "4") {
      activatePowerUp("doubleScore"); // x2 Очки (4)
    } else if (e.key === "5") {
      activatePowerUp("screenClear"); // Очистка экрана (5)
    }
    // ----------------------------------------
  }
});

// --- НОВЫЕ ОБРАБОТЧИКИ КНОПОК ---
startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", () => {
  resetGame();
  menuHighScore.textContent = `Рекорд: ${highScore}`;
  gameoverScreen.classList.add("hidden");
  menuScreen.classList.remove("hidden");
  gameState = "menu";
});

// --- 🕹️ ЛОГИКА ИГРЫ ---

function startSpawning() {
  if (spawnGiftInterval) clearInterval(spawnGiftInterval);
  spawnGiftInterval = setInterval(spawnGift, spawnInterval);
}

function resetGame() {
  score = 0;
  lives = 5;
  gifts = [];
  isPaused = false;
  baseSpeed = 3;
  spawnInterval = 800;
  spawnTimer = 0;
  updateHUD(); // Обновляем HUD при сбросе
}

function startGame() {
  menuScreen.classList.add("hidden");
  gameHud.classList.remove("hidden"); // Показываем HUD
  resetGame();
  gameState = "playing";
  startSpawning();
}

function spawnGift() {
  // 1. Определяем булевы флаги (как и было)
  const isBad = Math.random() < 0.2;
  const isBonus = !isBad && Math.random() < 0.1;

  // 2. Определяем строковый тип (НОВОЕ)
  let giftType = "good";
  if (isBad) {
    giftType = "bad";
  } else if (isBonus) {
    giftType = "bonus";
  }

  gifts.push({
    x: Math.random() * (canvas.width - 40) + 20,
    y: -20,
    r: 25,
    vy: baseSpeed + Math.random() * 3,

    // Используем строковое поле 'type', которое ожидает update()
    type: giftType,

    // (Булевы флаги 'bad' и 'bonus' теперь не используются в логике update(), но могут остаться)
    // bad: isBad,
    // bonus: isBonus,

    isCaught: false,
  });
}
/**
 * Активирует буст на основе его типа и устанавливает переменные для отображения
 */
/**
 * Активирует буст на основе его типа и устанавливает переменные для отображения
 */
function activatePowerUp(type) {
  // Сброс всех таймеров/флагов
  slowMode = false;
  magnetMode = false;
  doubleScoreMode = false;
  slowModeTimer = 0;
  magnetTimer = 0;
  doubleScoreTimer = 0;

  score += 10; // Очки за поимку бонуса

  switch (type) {
    case "slow":
      slowMode = true;
      slowModeTimer = SLOW_DURATION; // Устанавливаем начальное значение
      break;
    case "magnet":
      magnetMode = true;
      magnetTimer = MAGNET_DURATION; // Устанавливаем начальное значение
      break;
    case "doubleScore":
      doubleScoreMode = true;
      doubleScoreTimer = DOUBLE_SCORE_DURATION; // Устанавливаем начальное значение
      break;
    case "screenClear":
      clearBadGifts();
      return; // Мгновенный буст
  }
}

/**
 * Реализация буста "Очистка Экрана" (5)
 */
function clearBadGifts() {
  // 5. Очистка Экрана: фильтруем массив, оставляя только те подарки, которые НЕ являются плохими
  gifts = gifts.filter((g) => g.type !== "bad"); // Проверяем g.type, а не g.bad
  // Даем небольшой бонус за очистку
  score += 15;
  updateHUD();
}

// --- ❄️ ФУНКЦИИ ДЛЯ СНЕЖИНОК (без изменений) ---
function initSnowflakes() {
  for (let i = 0; i < maxSnowflakes; i++) {
    snowflakes.push(createSnowflake(true));
  }
}
function createSnowflake(startRandomly = false) {
  return {
    x: startRandomly
      ? Math.random() * canvas.width
      : Math.random() * canvas.width,
    y: startRandomly ? Math.random() * canvas.height : -10,
    radius: Math.random() * 2 + 1,
    speed: Math.random() * 1.5 + 0.5,
    opacity: Math.random() * 0.5 + 0.5,
    wind: (Math.random() - 0.5) * windVariation * 2 + windSpeed,
  };
}
function updateSnowflakes() {
  for (let i = 0; i < snowflakes.length; i++) {
    let flake = snowflakes[i];
    flake.y += flake.speed;
    flake.x += flake.wind;
    if (
      flake.y > canvas.height + 10 ||
      flake.x < -10 ||
      flake.x > canvas.width + 10
    ) {
      snowflakes[i] = createSnowflake();
    }
  }
}

function update() {
  if (gameState !== "playing" || isPaused) return;

  // --- ⚡ POWER-UP MANAGEMENT LOGIC (ОБРАТНЫЙ ОТСЧЕТ) ---

  // 1. Slow Mode Timer & Logic
  if (slowMode) {
    slowModeTimer--;
    if (slowModeTimer <= 0) {
      slowMode = false;
    }
  }

  // 2. Magnet Mode Timer & Logic
  if (magnetMode) {
    magnetTimer--;
    if (magnetTimer <= 0) {
      magnetMode = false;
    } else {
      // ИСПРАВЛЕНИЕ МАГНИТА: Притягиваем только 'good' или 'bonus'
      for (const g of gifts) {
        if (g.type === "good" || g.type === "bonus") {
          const dx = basket.x - g.x;
          g.x += dx * MAGNET_STRENGTH;
        }
      }
    }
  }

  // 4. Double Score Mode Timer & Logic
  if (doubleScoreMode) {
    doubleScoreTimer--;
    if (doubleScoreTimer <= 0) {
      doubleScoreMode = false;
    }
  }
  // ------------------------------------

  updateSnowflakes();
  const speedDamping = slowMode ? 0.5 : 1;
  // Движение подарков (с учетом замедления)
  for (const g of gifts) {
    // g.vy уже хранит базовую скорость. Применяем только общий демпфер.
    g.y += g.vy * speedDamping;
  }

  // Проверка столкновений с корзиной
  for (const g of gifts) {
    if (
      g.y > canvas.height - 130 &&
      g.y < canvas.height - 50 &&
      Math.abs(g.x - basket.x) < basket.w / 2
    ) {
      // Столкновение!

      if (g.type === "bonus") {
        pickAndActivateRandomPowerUp();
      } else if (g.type === "bad") {
        // ИСПРАВЛЕНИЕ 1: При поимке плохого подарка отнимаем жизнь
        score -= 5;
        lives--; // <-- УБЕДИТЕСЬ, ЧТО ЭТО ЕСТЬ
      } else {
        // 'good' gift
        // ... (начисление очков) ...
        const points = doubleScoreMode ? 10 : 5;
        score += points;
      }

      g.y = canvas.height + 100;
      g.isCaught = true;
    }
  }

  // ... (остальная логика spawnTimer, newGifts, updateHUD и game over)

  spawnTimer++;
  if (spawnTimer % 500 === 0) {
    baseSpeed += speedMultiplier;
    spawnInterval = Math.max(200, spawnInterval - 50);
    startSpawning();
  }

  let newGifts = [];
  for (const g of gifts) {
    if (g.y < canvas.height + 50) {
      newGifts.push(g);
    } else {
      if (!g.isCaught) {
        // ИСПРАВЛЕНИЕ 2: Только пропущенный 'good' подарок отнимает жизнь
        if (g.type === "good") {
          lives--; // <-- УБЕДИТЕСЬ, ЧТО ЭТО ЕСТЬ
        }
      }
    }
  }
  gifts = newGifts;

  updateHUD();

  if (lives <= 0) {
    gameState = "gameover";
    gameHud.classList.add("hidden");
    clearInterval(spawnGiftInterval);

    if (score > highScore) {
      highScore = score;
      localStorage.setItem("giftCatcherHighScore", highScore);
    }

    finalScore.textContent = `Ваш счет: ${score}`;
    gameoverHighScore.textContent = `Рекорд: ${highScore}`;
    gameoverScreen.classList.remove("hidden");
  }
}

// --- 🎨 ФУНКЦИИ РИСОВАНИЯ (БЕЗ HUD) ---

function drawBackground() {
  if (backgroundImg.complete && backgroundImg.naturalWidth !== 0) {
    ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#ADD8E6";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawSnowflakes() {
  for (const flake of snowflakes) {
    ctx.beginPath();
    ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
    ctx.fill();
  }
}

function drawGameObjectsAndHUD() {
  // Объекты
  ctx.drawImage(
    basketImg,
    basket.x - basket.w / 2,
    basket.y,
    basket.w,
    basket.h
  );
  if (showHitboxes) {
    ctx.strokeStyle = "rgba(0, 255, 0, 0.7)";
    ctx.strokeRect(basket.x - basket.w / 2, basket.y, basket.w, basket.h);
  }

  for (const g of gifts) {
    let giftImg = goodGiftImg;
    if (g.type === "bad") {
      giftImg = badGiftImg;
    } else if (g.type === "bonus") {
      giftImg = bonusGiftImg;
    }

    const size = g.r * 2;
    const drawX = g.x - g.r;
    const drawY = g.y - g.r;

    ctx.drawImage(giftImg, drawX, drawY, size, size);

    if (showHitboxes) {
      ctx.strokeStyle = "rgba(255, 0, 0, 0.7)";
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // HUD теперь в HTML, его рисовать здесь НЕ НАДО!
}

function draw() {
  drawBackground();
  drawSnowflakes();

  if (gameState === "playing") {
    drawGameObjectsAndHUD();
  }
}

function loop() {
  // Снежинки обновляются всегда, чтобы обеспечить фоновый эффект
  updateSnowflakes();

  // Логика игры (движение подарков, столкновения) только если не на паузе и играем
  if (gameState === "playing" && !isPaused) {
    update();
  }

  draw();
  requestAnimationFrame(loop);
}

// --- 🛑 ЗАПРЕТ ДЕФОЛТНЫХ ДЕЙСТВИЙ БРАУЗЕРА (НОВОЕ) ---

// 1. Запрет контекстного меню (правая кнопка мыши)
document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});

// 2. Запрет выхода из полноэкранного режима по Esc (F11 не перехватывается)
// Добавляем слушателя на document, т.к. exit fullscreen по Esc - это стандартное действие
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.fullscreenElement) {
    // Чтобы не отключать полностью Esc, мы просто предотвращаем его
    // дефолтное действие, если мы в полноэкранном режиме
    // (Это частично работает, но браузер может иметь приоритет)
    e.preventDefault();
  }
  // Также запрещаем F5 (обновление)
  if (e.key === "F5") {
    e.preventDefault();
  }
});

// 3. Запрет выделения текста (частично сделан в CSS: user-select: none)
// Дополнительный запрет на drag and drop
document.addEventListener("dragstart", (e) => {
  e.preventDefault();
});

window.addEventListener("load", initSnowflakes);
