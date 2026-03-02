const canvas = document.getElementById('game');
        const ctx = canvas.getContext('2d');
        const gridSize = 20;
        const tileCount = canvas.width / gridSize;
        let snake = [{x: 10, y: 10}];
        let direction = {x: 0, y: 0};
        let child = {x: 5, y: 5};
        let score = 0;
        let powerup = null;
        let powerupActive = false;
        let invincibilityPowerup = null;
        let invincible = false;
        let invincibilityTimer = 0;
        let speedPowerup = null;
        let speedBoostActive = false;
        let speedBoostTimer = 0;
        let gameSpeed = 100;
        let gameInterval;
        let highscore = localStorage.getItem('diddyHighScore') ? parseInt(localStorage.getItem('diddyHighScore')) : 0;
        document.getElementById('highscore').textContent = "High Score: " + highscore;
        const diddy = "👨🏿";
        const childSkins = [
            "👶🏻", "👶🏼", "👶🏽", "👶🏾", "👶🏿","👶",
            "🧒🏻", "🧒🏼", "🧒🏽", "🧒🏾", "🧒🏿","🧒",
        ];
        let childSkinIndex = 0;
        let childEmoji = childSkins[childSkinIndex];

        function drawTile(x, y, emoji) {
            ctx.font = `${gridSize}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(emoji, x * gridSize + gridSize/2, y * gridSize + gridSize/2);
        }
        let paused = false;
        function showPauseMenu(show) {
            document.getElementById('pauseMenu').style.display = show ? 'block' : 'none';
            document.getElementById('pauseToggleBtn').textContent = show ? "▶️" : "⏸️";
        }
        const pauseToggleBtn = document.getElementById('pauseToggleBtn');
        pauseToggleBtn.onclick = function() {
            paused = !paused;
            showPauseMenu(paused);
        };
        document.getElementById('resumeBtn').onclick = function() {
            paused = false;
            showPauseMenu(false);
        };
        const firebaseConfig = {
            apiKey: "apiKey",
            authDomain: "diddygame-dfd89.firebaseapp.com",
            databaseURL: "https://diddygame-dfd89-default-rtdb.asia-southeast1.firebasedatabase.app/",
            projectId: "diddygame-dfd89",
            storageBucket: "diddygame-dfd89.appspot.com",
            messagingSenderId: "662132817791",
            appId: "1:662132817791:web:7328705ae63440f01e244a"
        };
        firebase.initializeApp(firebaseConfig);
        const db = firebase.database();

        function updateLeaderboard() {
            db.ref('leaderboard').orderByChild('score').limitToLast(10).once('value', snapshot => {
                const items = [];
                snapshot.forEach(child => {
                    items.push(child.val());
                });
                items.reverse();
                const list = document.getElementById('leaderboardList');
                list.innerHTML = '';
                items.forEach((entry, i) => {
                    const li = document.createElement('li');
                    let dateStr = '';
                    if (entry.timestamp) {
                        const tzOffsetMs = 8 * 60 * 60 * 1000;
                        const tzDate = new Date(entry.timestamp + tzOffsetMs);
                        const day = String(tzDate.getUTCDate()).padStart(2, '0');
                        const month = String(tzDate.getUTCMonth() + 1).padStart(2, '0');
                        const year = String(tzDate.getUTCFullYear()).slice(-2);
                        dateStr = ` (${day}/${month}/${year})`;
                    }

                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = entry.name;
                    nameSpan.style.cursor = 'pointer';
                    nameSpan.tabIndex = 0;

                    const scoreSpan = document.createElement('span');
                    scoreSpan.textContent = ': ' + entry.score;

                    li.appendChild(nameSpan);
                    li.appendChild(scoreSpan);

                    if (dateStr) {
                        const tzOffsetMs = 8 * 60 * 60 * 1000;
                        const tzDate = new Date(entry.timestamp + tzOffsetMs);
                        const dDay = String(tzDate.getUTCDate()).padStart(2, '0');
                        const dMonth = String(tzDate.getUTCMonth() + 1).padStart(2, '0');
                        const dYear = String(tzDate.getUTCFullYear()).slice(-2);
                        const rawHour = tzDate.getUTCHours();
                        const dHour12 = (rawHour % 12) === 0 ? 12 : (rawHour % 12);
                        const ampm = rawHour >= 12 ? 'PM' : 'AM';
                        const dHour = String(dHour12).padStart(2, '0');
                        const dMin = String(tzDate.getUTCMinutes()).padStart(2, '0');
                        const dateText = `${dDay}/${dMonth}/${dYear}`;
                        const timeText = `${dHour}:${dMin} ${ampm} (UTC+8)`;
                        nameSpan.addEventListener('click', () => showCustomAlert(`This score was achieved on\n${dateText} at ${timeText}`));
                        nameSpan.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showCustomAlert(`This score was achieved on\n${dateText} at ${timeText}`); } });
                    }

                    list.appendChild(li);
                });
            });
        }
        let playerName = localStorage.getItem('diddyPlayerName');
        if (!playerName) {
            (async () => {
                playerName = await showCustomInput("Enter your name for the leaderboard:") || "Anonymous";
                localStorage.setItem('diddyPlayerName', playerName);
                updateLeaderboard();
            })();
        } else {
            updateLeaderboard();
        }
        function placeChild() {
            let valid = false;
            while (!valid) {
                child.x = Math.floor(Math.random() * tileCount);
                child.y = Math.floor(Math.random() * tileCount);
                valid = !snake.some(segment => segment.x === child.x && segment.y === child.y)
                    && !police.some(p => p.x === child.x && p.y === child.y);
            }
        }

        let police = [];
        let policeChasingUntil = 0;
        let lastPoliceMove = 0;
        let playerMoved = false;
        function movePoliceIfChasing() {
            const now = Date.now();
            if (now < policeChasingUntil && police.length > 0 && snake.length > 0) {
                const policeMoveCooldown = Math.max(50, gameSpeed * 2);
                if (now - lastPoliceMove < policeMoveCooldown) return;
                lastPoliceMove = now;
 
                const head = snake[0];
                police.forEach(p => {
                    const dx = head.x - p.x;
                    const dy = head.y - p.y;
                    if (Math.abs(dx) > Math.abs(dy)) {
                        p.x += Math.sign(dx);
                    } else if (Math.abs(dy) > 0) {
                        p.y += Math.sign(dy);
                    }
                    p.x = Math.max(0, Math.min(tileCount - 1, p.x));
                    p.y = Math.max(0, Math.min(tileCount - 1, p.y));
                });
            }
        }
        setInterval(movePoliceIfChasing, 50);
        function placePolice() {
            let valid = false;
            let x, y;
            while (!valid) {
                x = Math.floor(Math.random() * tileCount);
                y = Math.floor(Math.random() * tileCount);
                valid = !snake.some(segment => segment.x === x && segment.y === y) &&
                        !(child.x === x && child.y === y) &&
                        !(powerup && powerup.x === x && powerup.y === y) &&
                        !(invincibilityPowerup && invincibilityPowerup.x === x && invincibilityPowerup.y === y) &&
                        !(speedPowerup && speedPowerup.x === x && speedPowerup.y === y) &&
                        !police.some(p => p.x === x && p.y === y);
            }
            police.push({x, y});
        }
        let policeSpawnCounter = 0;
        function placePowerup() {
            let valid = false;
            while (!valid) {
                const x = Math.floor(Math.random() * tileCount);
                const y = Math.floor(Math.random() * tileCount);
                valid = !snake.some(segment => segment.x === x && segment.y === y) &&
                        !(child.x === x && child.y === y);
                if (valid) powerup = {x, y};
            }
        }
        function placeInvincibilityPowerup() {
            let valid = false;
            while (!valid) {
                const x = Math.floor(Math.random() * tileCount);
                const y = Math.floor(Math.random() * tileCount);
                valid = !snake.some(segment => segment.x === x && segment.y === y) &&
                        !(child.x === x && child.y === y) &&
                        !(powerup && powerup.x === x && powerup.y === y);
                if (valid) invincibilityPowerup = {x, y};
            }
        }
        function placeSpeedPowerup() {
            let valid = false;
            while (!valid) {
                const x = Math.floor(Math.random() * tileCount);
                const y = Math.floor(Math.random() * tileCount);
                valid = !snake.some(segment => segment.x === x && segment.y === y) &&
                        !(child.x === x && child.y === y) &&
                        !(powerup && powerup.x === x && powerup.y === y) &&
                        !(invincibilityPowerup && invincibilityPowerup.x === x && invincibilityPowerup.y === y);
                if (valid) speedPowerup = {x, y};
            }
        }

        let lawyerPowerup = null;
        let lawyerActive = false;
        function placeLawyerPowerup() {
            let valid = false;
            while (!valid) {
                const x = Math.floor(Math.random() * tileCount);
                const y = Math.floor(Math.random() * tileCount);
                valid = !snake.some(segment => segment.x === x && segment.y === y) &&
                        !(child.x === x && child.y === y) &&
                        !(powerup && powerup.x === x && powerup.y === y) &&
                        !(invincibilityPowerup && invincibilityPowerup.x === x && invincibilityPowerup.y === y) &&
                        !(speedPowerup && speedPowerup.x === x && speedPowerup.y === y) &&
                        !(lawyerPowerup && lawyerPowerup.x === x && lawyerPowerup.y === y) &&
                        !police.some(p => p.x === x && p.y === y);
                if (valid) lawyerPowerup = {x, y};
            }
        }

        let heartPowerup = null;
        let extraLives = 0;
        function placeHeartPowerup() {
            let valid = false;
            while (!valid) {
                const x = Math.floor(Math.random() * tileCount);
                const y = Math.floor(Math.random() * tileCount);
                valid = !snake.some(segment => segment.x === x && segment.y === y) &&
                        !(child.x === x && child.y === y) &&
                        !(powerup && powerup.x === x && powerup.y === y) &&
                        !(invincibilityPowerup && invincibilityPowerup.x === x && invincibilityPowerup.y === y) &&
                        !(speedPowerup && speedPowerup.x === x && speedPowerup.y === y) &&
                        !(lawyerPowerup && lawyerPowerup.x === x && lawyerPowerup.y === y) &&
                        !(heartPowerup && heartPowerup.x === x && heartPowerup.y === y) &&
                        !police.some(p => p.x === x && p.y === y);
                if (valid) heartPowerup = {x, y};
            }
        }
        function maybeSpawnPowerup() {
            if (!powerup && Math.random() < 0.2) { 
                placePowerup();
            }
        }

        function gameLoop() {
            if (paused) return;
            let died = false;
            const prevPolicePos = new Set(police.map(p => `${p.x},${p.y}`));
            if (direction.x !== 0 || direction.y !== 0) {
                const head = {x: snake[0].x + direction.x, y: snake[0].y + direction.y};
                snake.unshift(head);
                 playerMoved = true;

                for (let p of police) {
                    const dx = Math.abs(p.x - head.x);
                    const dy = Math.abs(p.y - head.y);
                    if (Math.max(dx, dy) === 1 && !(p.x === head.x && p.y === head.y)) {
                        setTimeout(() => {
                            policeChasingUntil = Date.now() + 5000;
                        }, 250);
                        break;
                    }
                }
                if (head.x === child.x && head.y === child.y) {
                    let points = 1;
                    if (powerupActive) {
                        points = 5;
                        powerupActive = false;
                    }
                    score += points;
                    document.getElementById('score').textContent = "Score: " + score;
                    if (score > highscore) {
                        highscore = score;
                        localStorage.setItem('diddyHighScore', highscore);
                        document.getElementById('highscore').textContent = "High Score: " + highscore;
                    }
                    placeChild();
                    maybeSpawnPowerup();
                    if (score === 25 && !speedPowerup) {
                        placeSpeedPowerup();
                    }
                    if (score === 50 && !invincibilityPowerup) {
                        placeInvincibilityPowerup();
                    }
                    if (score !== 50 && !invincibilityPowerup && Math.random() < 0.005) {
                     placeInvincibilityPowerup();
                    }
                    if (score === 30 && !lawyerPowerup) {
                        placeLawyerPowerup();
                    }
                    if (score !== 30 && !lawyerPowerup && Math.random() < 0.01) {
                        placeLawyerPowerup();
                    }
                    if (!heartPowerup && Math.random() < 0.0025) {
                        placeHeartPowerup();
                    }
                } else if (powerup && head.x === powerup.x && head.y === powerup.y) {
                    powerupActive = true;
                    powerup = null;
                } else if (speedPowerup && head.x === speedPowerup.x && head.y === speedPowerup.y) {
                    speedBoostActive = true;
                    speedBoostTimer = 100;
                    speedPowerup = null;
                    setGameSpeed(gameSpeed / 2);
                } else if (invincibilityPowerup && head.x === invincibilityPowerup.x && head.y === invincibilityPowerup.y) {
                    invincible = true;
                    invincibilityTimer = 100;
                    invincibilityPowerup = null;
                } else if (lawyerPowerup && head.x === lawyerPowerup.x && head.y === lawyerPowerup.y) {
                    lawyerActive = true;
                    lawyerPowerup = null;
                    police = [];
                } else if (heartPowerup && head.x === heartPowerup.x && head.y === heartPowerup.y) {
                    extraLives += 1;
                    heartPowerup = null;
                } else {
                    snake.pop();
                }
                let center = {x: Math.floor(tileCount/2), y: Math.floor(tileCount/2)};
                let hitWall = head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount;
                let hitSelf = snake.slice(1).some(s => s.x === head.x && s.y === head.y);
                let hitPolice = police.some(p => p.x === snake[0].x && p.y === snake[0].y);

                if (invincible) {
                    if (hitWall || hitSelf || hitPolice) {
                        snake = Array(snake.length).fill().map(() => ({...center}));
                        direction = {x: 0, y: 0};
                        placeChild();
                        police = [];
                        return;
                    }
                } else if (lawyerActive && hitPolice) {
                    police = [];
                    lawyerActive = false;
                    return;
                } else if (extraLives > 0 && (hitWall || hitSelf || hitPolice)) {
                    extraLives -= 1;
                    snake = [{...center}];
                    direction = {x: 0, y: 0};
                    placeChild();
                    showCustomAlert("You used an extra life! Respawning in the middle.");
                    return;
                } else if (hitWall || hitSelf || hitPolice) {
                    showCustomAlert("Game Over! Final Score: " + score);
                    if (score > 0) {
                        db.ref('leaderboard').push({
                            name: playerName,
                            score: score,
                            timestamp: Date.now()
                        });
                        setTimeout(updateLeaderboard, 500);
                    }
                    snake = [{x: 10, y: 10}];
                    direction = {x: 0, y: 0};
                    score = 0;
                    document.getElementById('score').textContent = "Score: 0";
                    placeChild();
                    powerup = null;
                    powerupActive = false;
                    invincibilityPowerup = null;
                    invincible = false;
                    invincibilityTimer = 0;
                    speedPowerup = null;
                    speedBoostActive = false;
                    speedBoostTimer = 0;
                    police = [];
                    lawyerPowerup = null;
                    lawyerActive = false;
                    heartPowerup = null;
                    extraLives = 0;
                    setGameSpeed(100);
                    return;
                }
            }
            policeSpawnCounter++;
            if (policeSpawnCounter > 30 && Math.random() < 0.05 && police.length < 6) {
                placePolice();
                policeSpawnCounter = 0;
            }
            if (invincible) {
                invincibilityTimer--;
                if (invincibilityTimer <= 0) {
                    invincible = false;
                }
            }
            if (speedBoostActive) {
                speedBoostTimer--;
                if (speedBoostTimer <= 0) {
                    speedBoostActive = false;
                    setGameSpeed(100);
                }
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawTile(child.x, child.y, childEmoji);
            if (powerup) drawTile(powerup.x, powerup.y, "🧴");
            if (speedPowerup) drawTile(speedPowerup.x, speedPowerup.y, "⚡");
            if (invincibilityPowerup) drawTile(invincibilityPowerup.x, invincibilityPowerup.y, "🛡️");
            if (lawyerPowerup) drawTile(lawyerPowerup.x, lawyerPowerup.y, "🧑🏻‍⚖️");
            if (heartPowerup) drawTile(heartPowerup.x, heartPowerup.y, "❤️");
            snake.forEach((segment, i) => {
                drawTile(segment.x, segment.y, diddy);
            });
            if (invincible) {
                ctx.save();
                ctx.globalAlpha = 0.2;
                ctx.fillStyle = "#00ff00";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.restore();
            }
            if (speedBoostActive) {
                ctx.save();
                ctx.globalAlpha = 0.2;
                ctx.fillStyle = "#ffff00";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.restore();
            }
            police.forEach(p => drawTile(p.x, p.y, "👮‍♂️"));
            const policeOnHeadNow = police.some(p => p.x === snake[0].x && p.y === snake[0].y);
            const policeWasThereBeforeMove = prevPolicePos.has(`${snake[0].x},${snake[0].y}`);
            if (playerMoved && policeOnHeadNow) {
                if (lawyerActive) {
                    police = [];
                    lawyerActive = false;
                    showCustomAlert("Protected by lawyer! All police removed.");
                } else if (invincible) {
                    police = [];
                } else if (extraLives > 0) {
                    extraLives -= 1;
                    snake = [{x: Math.floor(tileCount/2), y: Math.floor(tileCount/2)}];
                    direction = {x: 0, y: 0};
                    placeChild();
                    showCustomAlert("You used an extra life! Respawning in the middle.");
                } else {
                     died = true;
                }
            } else if (policeOnHeadNow && !policeWasThereBeforeMove) {
                if (lawyerActive) {
                    police = [];
                    lawyerActive = false;
                    } else if (invincible) {
                    police = [];
                }
             }
             playerMoved = false;
             if (died) {
                 snake = [{x: Math.floor(tileCount/2), y: Math.floor(tileCount/2)}];
                 direction = {x: 0, y: 0};
                 placeChild();
                 return;
             }
         }
        function setGameSpeed(ms) {
            gameSpeed = ms;
            clearInterval(gameInterval);
            gameInterval = setInterval(gameLoop, gameSpeed);
        }
        let lastInputTime = 0;
        const inputDelay = 60;
        document.addEventListener('keydown', e => {
                    const now = Date.now();
                    if (window.modalActive) return;
                    if (now - lastInputTime < inputDelay) return;
                    lastInputTime = now;
            if (e.key === "Escape") {
                paused = !paused;
                showPauseMenu(paused);
            }
            if (!paused) {
                if ((e.key === "ArrowUp" || e.key === "w" || e.key === "W") && direction.y !== 1) direction = {x: 0, y: -1};
                else if ((e.key === "ArrowDown" || e.key === "s" || e.key === "S") && direction.y !== -1) direction = {x: 0, y: 1};
                else if ((e.key === "ArrowLeft" || e.key === "a" || e.key === "A") && direction.x !== 1) direction = {x: -1, y: 0};
                else if ((e.key === "ArrowRight" || e.key === "d" || e.key === "D") && direction.x !== -1) direction = {x: 1, y: 0};
            }
        });
        const volumeBtn = document.getElementById('volumeBtn');
        const bgMusic = document.getElementById('bgMusic');
        const soundSelect = document.getElementById('soundSelect');
        window.addEventListener('DOMContentLoaded', () => {
            bgMusic.play().then(() => {
                volumeBtn.textContent = "🔊";
                musicPlaying = true;
            }).catch(() => {
                const startMusic = () => {
                    bgMusic.play();
                    volumeBtn.textContent = "🔊";
                    musicPlaying = true;
                    window.removeEventListener('keydown', startMusic);
                    window.removeEventListener('mousedown', startMusic);
                };
                window.addEventListener('keydown', startMusic);
                window.addEventListener('mousedown', startMusic);
            });
        });
        volumeBtn.onclick = function() {
            if (!musicPlaying) {
                bgMusic.play();
                volumeBtn.textContent = "🔊";
                musicPlaying = true;
            } else {
                bgMusic.pause();
                volumeBtn.textContent = "🔇";
                musicPlaying = false;
            }
        };
        bgMusic.onpause = function() {
            volumeBtn.textContent = "🔇";
            musicPlaying = false;
        };
        bgMusic.onplay = function() {
            volumeBtn.textContent = "🔊";
            musicPlaying = true;
        };
        const modeBtn = document.getElementById('modeBtn');
        const modeEmoji = document.getElementById('modeEmoji');
        let darkMode = true;
        modeBtn.onclick = function() {
            darkMode = !darkMode;
            if (darkMode) {
                document.body.style.background = "#222";
                document.querySelector('h1').style.color = "#fff";
                document.getElementById('score').style.color = "#fff";
                document.getElementById('highscore').style.color = "#fff";
                document.getElementById('leaderboard').style.background = "rgba(70,70,70,0.9)";
                document.getElementById('leaderboard').style.color = "#fff";
                document.querySelectorAll('#leaderboardList li').forEach(li => li.style.color = "#fff");
                canvas.style.background = "#464646";
                modeEmoji.textContent = "🌑";
            } else {
                document.body.style.background = "#f7f7f7";
                document.querySelector('h1').style.color = "#222";
                document.getElementById('score').style.color = "#222";
                document.getElementById('highscore').style.color = "#222";
                document.getElementById('leaderboard').style.background = "rgba(255,255,255,0.9)";
                document.getElementById('leaderboard').style.color = "#222";
                document.querySelectorAll('#leaderboardList li').forEach(li => li.style.color = "#222");
                canvas.style.background = "#fff";
                modeEmoji.textContent = "☀️";
            }
        };
        placeChild();
        gameInterval = setInterval(gameLoop, gameSpeed);
        const skinBtn = document.createElement('button');
        skinBtn.id = "skinBtn";
        skinBtn.style.position = "absolute";
        skinBtn.style.top = "104px";
        skinBtn.style.right = "30px";
        skinBtn.style.background = "none";
        skinBtn.style.border = "none";
        skinBtn.style.fontSize = "32px";
        skinBtn.style.cursor = "pointer";
        skinBtn.style.zIndex = "20";
        skinBtn.style.outline = "none";
        skinBtn.textContent = childEmoji;
        document.body.appendChild(skinBtn);
        skinBtn.onclick = function() {
            childSkinIndex = (childSkinIndex + 1) % childSkins.length;
            childEmoji = childSkins[childSkinIndex];
            skinBtn.textContent = childEmoji;
        };
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        fullscreenBtn.onclick = function() {
            if (!document.fullscreenElement) {
                canvas.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        };
    const musicNoteBtn = document.getElementById('musicNoteBtn');
    const musicPopup = document.getElementById('musicPopup');
    musicNoteBtn.onclick = function() {
        musicPopup.style.display = (musicPopup.style.display === "none" || musicPopup.style.display === "") ? "block" : "none";
    };
    document.addEventListener('mousedown', function(e) {
        if (!musicPopup.contains(e.target) && e.target !== musicNoteBtn) {
            musicPopup.style.display = "none";
        }
    });
    const mobileControls = document.getElementById('mobileControls');
    const mcUp = document.getElementById('mc-up');
    const mcDown = document.getElementById('mc-down');
    const mcLeft = document.getElementById('mc-left');
    const mcRight = document.getElementById('mc-right');
    function toggleMobileControls(show) {
      mobileControls.style.display = show ? 'block' : 'none';
    }
    if ('ontouchstart' in window) {
      toggleMobileControls(true);
      canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
      }, { passive: false });
      mcUp.addEventListener('touchstart', () => { direction = {x: 0, y: -1}; });
      mcDown.addEventListener('touchstart', () => { direction = {x: 0, y: 1}; });
      mcLeft.addEventListener('touchstart', () => { direction = {x: -1, y: 0}; });
      mcRight.addEventListener('touchstart', () => { direction = {x: 1, y: 0}; });
      if (window.navigator.userAgent.indexOf("Safari") !== -1) {
        setTimeout(() => {
          window.scrollTo(0, 1);
        }, 0);
      }
    }


try {
  const soundSelect = document.getElementById("soundSelect");
  if (soundSelect && bgMusic) {
    soundSelect.addEventListener("change", () => {
      const choice = soundSelect.value;
      bgMusic.src = choice;
      bgMusic.play().catch(()=>{});
    });
  }
} catch(e){}
