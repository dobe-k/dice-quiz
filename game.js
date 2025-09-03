class DiceQuizGame {
    constructor() {
        this.currentPosition = 10;
        this.coins = 100;
        this.hearts = 50;
        this.isRolling = false;
        this.currentMultiplier = 5;
        this.lapCount = 0;
        this.betCosts = {
            1: 1,
            2: 3,
            3: 5,
            5: 10,
            10: 25
        };
        
        this.tileTypes = [
            '퀴즈', '퀴즈', '코인', '이벤트', '하트',      // 0-4: top
            '스페셜', '코인', '공격', '퀴즈', '강탈',      // 5-9: right  
            '시작', '하트', '퀴즈', '코인', '퀴즈',       // 10-14: bottom
            '스페셜', '하트', '코인', '공격', '랜덤',      // 15-19: left
            '센터',                                     // 20: center
            '보너스', '타겟', '교환', '매직',           // 21-24: diagonal inner
            '선물', '럭키', '슬롯', '챔피언'             // 25-28: diagonal outer
        ];
        
        this.currentPath = 'outer'; // 'outer' or 'diagonal'
        this.diagonalPaths = {
            5:  [5, 23, 24, 20, 25, 26, 10],  // 우상단 → 센터 → 시작점(10)
            0:  [0, 21, 22, 20, 27, 28, 10]   // 좌상단 → 센터 → 시작점(10)
        };
        
        this.quizQuestions = [
            {
                question: "대한민국의 수도는?",
                options: ["서울", "부산", "대구", "인천"],
                correct: 0
            },
            {
                question: "1 + 1 = ?",
                options: ["1", "2", "3", "4"],
                correct: 1
            },
            {
                question: "무지개의 색은 몇 가지?",
                options: ["5", "6", "7", "8"],
                correct: 2
            },
            {
                question: "태양계에서 가장 큰 행성은?",
                options: ["지구", "화성", "목성", "토성"],
                correct: 2
            },
            {
                question: "한글을 창제한 왕은?",
                options: ["태조", "세종", "성종", "정조"],
                correct: 1
            }
        ];

        this.init();
    }

    init() {
        this.rollBtn = document.getElementById('rollBtn');
        this.dice1 = document.getElementById('dice1');
        this.dice2 = document.getElementById('dice2');
        this.statusMessage = document.getElementById('statusMessage');
        this.quizModal = document.getElementById('quizModal');
        this.gameOverModal = document.getElementById('gameOverModal');
        this.toastContainer = document.getElementById('toastContainer');
        this.confettiContainer = document.getElementById('confettiContainer');
        this.restartBtn = document.getElementById('restartBtn');
        
        // Initialize dice with random images
        this.updateDiceFace(this.dice1, Math.floor(Math.random() * 6) + 1);
        this.updateDiceFace(this.dice2, Math.floor(Math.random() * 6) + 1);
        
        this.rollBtn.addEventListener('click', () => this.rollDice());
        this.restartBtn.addEventListener('click', () => this.resetGame());
        
        this.initBettingSystem();
        this.updatePlayerPosition();
        this.updateStats();
    }

    initBettingSystem() {
        const betOptions = document.querySelectorAll('.bet-option');
        betOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const multiplier = parseInt(e.currentTarget.dataset.multiplier);
                this.selectBet(multiplier);
            });
        });
    }

    selectBet(multiplier) {
        if (this.isRolling) return;
        
        const heartCost = this.betCosts[multiplier];
        if (this.hearts < heartCost) {
            this.showMessage(`하트가 부족합니다! 필요: ${heartCost}, 보유: ${this.hearts}`);
            return;
        }
        
        this.currentMultiplier = multiplier;
        
        document.querySelectorAll('.bet-option').forEach(option => {
            option.classList.remove('active');
        });
        
        document.querySelector(`.bet-option[data-multiplier="${multiplier}"]`).classList.add('active');
        
        this.rollBtn.textContent = `주사위 굴리기 (하트 -${heartCost})`;
    }

    rollDice() {
        if (this.isRolling) return;
        
        const heartCost = this.betCosts[this.currentMultiplier];
        if (this.hearts < heartCost) {
            this.showMessage(`하트가 부족합니다! 필요: ${heartCost}, 보유: ${this.hearts}`);
            return;
        }
        
        // Deduct hearts first (will be refunded if doubles)
        this.hearts -= heartCost;
        this.updateStats();
        
        this.isRolling = true;
        this.rollBtn.disabled = true;
        this.showMessage('주사위를 던지는 중...');
        
        // Calculate board center position
        const gameBoard = document.querySelector('.game-board');
        const boardRect = gameBoard.getBoundingClientRect();
        const dice1Rect = this.dice1.getBoundingClientRect();
        const dice2Rect = this.dice2.getBoundingClientRect();
        
        // Calculate throw distances to board center
        const centerX = boardRect.left + boardRect.width / 2;
        const centerY = boardRect.top + boardRect.height / 2;
        
        const dice1ThrowX = centerX - dice1Rect.left - dice1Rect.width / 2 - 30;
        const dice1ThrowY = centerY - dice1Rect.top - dice1Rect.height / 2;
        
        const dice2ThrowX = centerX - dice2Rect.left - dice2Rect.width / 2 + 30;
        const dice2ThrowY = centerY - dice2Rect.top - dice2Rect.height / 2;
        
        // Set CSS variables for animation
        this.dice1.style.setProperty('--throw-x', `${dice1ThrowX}px`);
        this.dice1.style.setProperty('--throw-y', `${dice1ThrowY}px`);
        this.dice2.style.setProperty('--throw-x', `${dice2ThrowX}px`);
        this.dice2.style.setProperty('--throw-y', `${dice2ThrowY}px`);
        
        // Throw dice to board center
        this.dice1.classList.add('throw-to-board');
        this.dice2.classList.add('throw-to-board');
        
        let dice1Value, dice2Value;
        
        // After throw animation, start rolling on board
        setTimeout(() => {
            this.dice1.classList.remove('throw-to-board');
            this.dice2.classList.remove('throw-to-board');
            this.dice1.classList.add('rolling-on-board');
            this.dice2.classList.add('rolling-on-board');
            
            // Generate random values
            dice1Value = Math.floor(Math.random() * 6) + 1;
            dice2Value = Math.floor(Math.random() * 6) + 1;
            
            // Show random dice faces during rolling
            let rollCount = 0;
            const rollInterval = setInterval(() => {
                this.updateDiceFace(this.dice1, Math.floor(Math.random() * 6) + 1);
                this.updateDiceFace(this.dice2, Math.floor(Math.random() * 6) + 1);
                rollCount++;
                if (rollCount >= 5) {
                    clearInterval(rollInterval);
                }
            }, 80);
            
            // After rolling animation, show results and return dice
            setTimeout(() => {
                this.dice1.classList.remove('rolling-on-board');
                this.dice2.classList.remove('rolling-on-board');
                
                // Update dice faces with images
                this.updateDiceFace(this.dice1, dice1Value);
                this.updateDiceFace(this.dice2, dice2Value);
                
                // Return dice to original position
                this.dice1.classList.add('return-from-board');
                this.dice2.classList.add('return-from-board');
                
                const isDouble = dice1Value === dice2Value;
                const totalValue = dice1Value + dice2Value;
                
                if (isDouble) {
                    this.showMessage(`🎉 더블! [${dice1Value}] + [${dice2Value}] = ${totalValue} (하트 환불 +${heartCost})`);
                    this.hearts += heartCost; // Refund hearts on doubles
                    this.updateStats();
                }  else {
                    this.showMessage(`주사위 결과: [${dice1Value}] + [${dice2Value}] = ${totalValue}`);
                }
                
                // Clean up and move player
                setTimeout(() => {
                    this.dice1.classList.remove('return-from-board');
                    this.dice2.classList.remove('return-from-board');
                    
                    if (isDouble) {
                        // Add special effect for doubles
                        this.dice1.classList.add('double');
                        this.dice2.classList.add('double');
                        setTimeout(() => {
                            this.dice1.classList.remove('double');
                            this.dice2.classList.remove('double');
                        }, 1000);
                    }
                    
                    this.movePlayer(totalValue);
                }, 200);
            }, 400);
        }, 300);
    }

    getDiceFace(value) {
        // Return image path instead of emoji
        return `${value}.jpg`;
    }
    
    updateDiceFace(diceElement, value) {
        const diceFace = diceElement.querySelector('.dice-face');
        diceFace.innerHTML = `<img src="${value}.jpg" alt="Dice ${value}" style="width: 100%; height: 100%; object-fit: contain;">`;
    }

    movePlayer(steps) {
        // Check if we're at a corner tile (except tile 0) and can choose a path
        if (this.currentPath === 'outer' && this.diagonalPaths[this.currentPosition] && steps > 0) {
            this.showPathSelection(steps);
        } else {
            this.executeMove(steps);
        }
    }
    
    showPathSelection(steps) {
        const modal = document.createElement('div');
        modal.className = 'modal path-selection-modal';
        modal.style.display = 'block';
        
        const content = document.createElement('div');
        content.className = 'modal-content path-selection-content';
        
        const title = document.createElement('h2');
        title.textContent = '경로를 선택하세요!';
        content.appendChild(title);
        
        const message = document.createElement('p');
        message.textContent = '어느 길로 가시겠습니까?';
        content.appendChild(message);
        
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'path-buttons';
        
        const outerBtn = document.createElement('button');
        outerBtn.className = 'path-button outer-path';
        outerBtn.innerHTML = '<span class="path-icon">⭕</span><span>바깥 경로</span>';
        outerBtn.onclick = () => {
            modal.remove();
            this.currentPath = 'outer';
            this.executeMove(steps);
        };
        
        const diagonalBtn = document.createElement('button');
        diagonalBtn.className = 'path-button diagonal-path';
        diagonalBtn.innerHTML = '<span class="path-icon">❌</span><span>대각선 경로</span>';
        diagonalBtn.onclick = () => {
            modal.remove();
            this.currentPath = 'diagonal';
            this.diagonalIndex = 0; // Start at beginning of diagonal path
            this.executeMove(steps);
        };
        
        buttonsDiv.appendChild(outerBtn);
        buttonsDiv.appendChild(diagonalBtn);
        content.appendChild(buttonsDiv);
        modal.appendChild(content);
        document.body.appendChild(modal);
    }
    
    executeMove(steps) {
        let moveCount = 0;
        const startPosition = this.currentPosition;
        const moveInterval = setInterval(() => {
            if (moveCount < steps) {
                const previousPosition = this.currentPosition;
                
                if (this.currentPath === 'diagonal') {
                    // Move along diagonal path
                    const currentDiagonalPath = this.diagonalPaths[startPosition];
                    this.diagonalIndex++;
                    
                    if (this.diagonalIndex >= currentDiagonalPath.length) {
                        // Reached end of diagonal path, switch back to outer
                        this.currentPath = 'outer';
                        this.currentPosition = currentDiagonalPath[currentDiagonalPath.length - 1];
                    } else {
                        this.currentPosition = currentDiagonalPath[this.diagonalIndex];
                    }
                } else {
                    // Move along outer path (20 tiles) - counter-clockwise
                    this.currentPosition = (this.currentPosition - 1 + 20) % 20;
                }
                
                // Check if completed a lap on outer path (counter-clockwise, back to start position 10)
                if (this.currentPath === 'outer' && previousPosition < this.currentPosition && this.currentPosition === 10) {
                    this.lapCount++;
                    this.showLapCompleteToast();
                }
                
                this.updatePlayerPosition();
                moveCount++;
            } else {
                clearInterval(moveInterval);
                
                // If we're back on outer path after diagonal, reset
                if (this.currentPath === 'diagonal') {
                    const currentDiagonalPath = this.diagonalPaths[startPosition];
                    if (this.diagonalIndex >= currentDiagonalPath.length - 1) {
                        this.currentPath = 'outer';
                    }
                }
                
                this.handleTileAction();
                this.isRolling = false;
                this.rollBtn.disabled = false;
                
                if (this.hearts <= 0) {
                    this.gameOver();
                }
            }
        }, 300);
    }

    updatePlayerPosition() {
        // Remove previous player piece and active tile highlight
        document.querySelectorAll('.player-piece').forEach(piece => piece.remove());
        document.querySelectorAll('.tile.active').forEach(tile => tile.classList.remove('active'));
        
        // Get current tile and add active class
        const currentTile = document.querySelector(`.tile[data-index="${this.currentPosition}"]`);
        currentTile.classList.add('active');
        
        const playerContainer = currentTile.querySelector('.player-container');
        
        const playerPiece = document.createElement('div');
        
        // Random movement animations
        const moveAnimations = ['hop-move', 'spin-move', 'wiggle-move', 'jump-flip'];
        const randomMove = moveAnimations[Math.floor(Math.random() * moveAnimations.length)];
        playerPiece.className = `player-piece ${randomMove}`;
        
        const characterImg = document.createElement('img');
        characterImg.src = 'cha_02.png';
        characterImg.alt = 'Player Character';
        characterImg.style.width = '100%';
        characterImg.style.height = '100%';
        characterImg.style.objectFit = 'contain';
        
        playerPiece.appendChild(characterImg);
        playerContainer.appendChild(playerPiece);
        
        // Add idle animation after movement
        setTimeout(() => {
            if (playerPiece) {
                playerPiece.classList.remove(randomMove);
                const idleAnimations = ['idle-breathing', 'idle-floating'];
                const randomIdle = idleAnimations[Math.floor(Math.random() * idleAnimations.length)];
                playerPiece.classList.add(randomIdle);
            }
        }, 300);
        
        // Position display removed
    }

    playReactionAnimation(animationClass) {
        const playerPiece = document.querySelector('.player-piece');
        if (playerPiece) {
            // Remove all current animations
            playerPiece.className = 'player-piece';
            
            // Force reflow to restart animation
            void playerPiece.offsetWidth;
            
            // Add reaction animation
            playerPiece.classList.add(animationClass);
            
            // Return to idle after reaction
            setTimeout(() => {
                if (playerPiece) {
                    playerPiece.classList.remove(animationClass);
                    const idleAnimations = ['idle-breathing', 'idle-floating'];
                    const randomIdle = idleAnimations[Math.floor(Math.random() * idleAnimations.length)];
                    playerPiece.classList.add(randomIdle);
                }
            }, 700);
        }
    }

    handleTileAction() {
        const tileType = this.tileTypes[this.currentPosition];
        const multiplier = this.currentMultiplier;
        
        switch(tileType) {
            case '시작':
                const startBonus = 50 * multiplier;
                this.showMessage(`시작 지점! 보너스 코인 +${startBonus} 🪙 (${multiplier}x 배율)`);
                this.coins += startBonus;
                this.playReactionAnimation('happy-dance');
                break;
                
            case '퀴즈':
                this.showQuiz();
                break;
                
            case '코인':
                const baseCoins = Math.floor(Math.random() * 30) + 10;
                const coinAmount = baseCoins * multiplier;
                this.showMessage(`코인 획득! +${coinAmount} 🪙 (기본 ${baseCoins} × ${multiplier}x)`);
                this.coins += coinAmount;
                this.playReactionAnimation('happy-dance');
                this.createFlyingCoins();
                break;
                
            case '하트':
                const heartAmount = 1 * multiplier;
                this.showMessage(`하트 획득! +${heartAmount} ❤️ (${multiplier}x 배율)`);
                this.hearts += heartAmount;
                this.playReactionAnimation('happy-dance');
                this.createFlyingHearts();
                break;
                
            case '랜덤':
                this.playReactionAnimation('dizzy-wobble');
                this.handleRandomEvent();
                break;
                
            case '스페셜':
                const specialCoins = 300 * multiplier;
                const specialHearts = 10 * multiplier;
                this.showMessage(`💎 초특급 스페셜!! 코인 +${specialCoins}, 하트 +${specialHearts} 💎`);
                this.coins += specialCoins;
                this.hearts += specialHearts;
                this.playReactionAnimation('crazy-celebration');
                this.createMegaFireworks();
                this.createFlyingHearts();
                this.flashScreen();
                break;
                
            case '공격':
                const powerUpCoins = 150 * multiplier;
                const powerUpHearts = 7 * multiplier;
                this.showMessage(`⚡ 파워 업!! 코인 +${powerUpCoins}, 하트 +${powerUpHearts} ⚡`);
                this.coins += powerUpCoins;
                this.hearts += powerUpHearts;
                this.playReactionAnimation('extreme-joy');
                this.createMegaFireworks();
                this.createFlyingHearts();
                this.flashScreen();
                break;
                
            case '강탈':
                const treasureCoins = 250 * multiplier;
                const treasureHearts = 6 * multiplier;
                this.showMessage(`💰 보물 발견!! 코인 +${treasureCoins}, 하트 +${treasureHearts} 💰`);
                this.coins += treasureCoins;
                this.hearts += treasureHearts;
                this.playReactionAnimation('crazy-celebration');
                this.createMegaFireworks();
                this.createFlyingHearts();
                this.flashScreen();
                break;
                
            case '이벤트':
                const eventCoins = 200 * multiplier;
                const eventHearts = 8 * multiplier;
                this.showMessage(`🎊 초대형 이벤트!! 코인 +${eventCoins}, 하트 +${eventHearts} 🎊`);
                this.coins += eventCoins;
                this.hearts += eventHearts;
                this.playReactionAnimation('extreme-joy');
                this.createMegaFireworks();
                this.createFlyingHearts();
                this.flashScreen();
                break;
                
            // Diagonal path tiles
            case '보너스':
                const bonusCoins = 100 * multiplier;
                this.showMessage(`💎 보너스 획득! 코인 +${bonusCoins} 💎 (${multiplier}x 배율)`);
                this.coins += bonusCoins;
                this.playReactionAnimation('happy-dance');
                this.createFlyingCoins();
                break;
                
            case '타겟':
                const targetCoins = 80 * multiplier;
                const targetHearts = 3 * multiplier;
                this.showMessage(`🎯 타겟 히트! 코인 +${targetCoins}, 하트 +${targetHearts} 🎯`);
                this.coins += targetCoins;
                this.hearts += targetHearts;
                this.playReactionAnimation('happy-dance');
                this.createFlyingCoins();
                this.createFlyingHearts();
                break;
                
            case '교환':
                const exchangeAmount = 50;
                if (this.hearts >= 5) {
                    this.hearts -= 5;
                    this.coins += exchangeAmount * multiplier;
                    this.showMessage(`🔄 교환 성공! 하트 -5, 코인 +${exchangeAmount * multiplier} 🔄`);
                } else {
                    this.showMessage(`🔄 교환 실패! 하트가 부족합니다 🔄`);
                }
                break;
                
            case '매직':
                const magicCoins = 120 * multiplier;
                const magicHearts = 5 * multiplier;
                this.showMessage(`✨ 매직 발동! 코인 +${magicCoins}, 하트 +${magicHearts} ✨`);
                this.coins += magicCoins;
                this.hearts += magicHearts;
                this.playReactionAnimation('extreme-joy');
                this.createMegaFireworks();
                break;
                
            case '선물':
                const giftCoins = 90 * multiplier;
                this.showMessage(`🎁 선물 상자! 코인 +${giftCoins} 🎁 (${multiplier}x 배율)`);
                this.coins += giftCoins;
                this.playReactionAnimation('happy-dance');
                this.createFlyingCoins();
                break;
                
            case '럭키':
                const luckyMultiplier = 2;
                const luckyCoins = 100 * multiplier * luckyMultiplier;
                this.showMessage(`🌟 럭키 더블! 코인 +${luckyCoins} (${multiplier}x × 2배) 🌟`);
                this.coins += luckyCoins;
                this.playReactionAnimation('crazy-celebration');
                this.createMegaFireworks();
                break;
                
            case '슬롯':
                const slotResult = Math.floor(Math.random() * 3);
                if (slotResult === 0) {
                    const slotWin = 200 * multiplier;
                    this.showMessage(`🎰 잭팟!! 코인 +${slotWin} 🎰`);
                    this.coins += slotWin;
                    this.playReactionAnimation('crazy-celebration');
                    this.createMegaFireworks();
                } else {
                    this.showMessage(`🎰 꽝! 다음 기회에... 🎰`);
                    this.playReactionAnimation('dizzy-wobble');
                }
                break;
                
            case '센터':
                const centerCoins = 500 * multiplier;
                const centerHearts = 15 * multiplier;
                this.showMessage(`🏆 센터 도착!! 코인 +${centerCoins}, 하트 +${centerHearts} 🏆`);
                this.coins += centerCoins;
                this.hearts += centerHearts;
                this.playReactionAnimation('crazy-celebration');
                this.createMegaFireworks();
                this.createFlyingHearts();
                this.flashScreen();
                
                // Special rule: Always return to start position (10) after center
                setTimeout(() => {
                    this.currentPosition = 10;
                    this.updatePlayerPosition();
                    this.showMessage('🏠 시작점으로 돌아갑니다!');
                }, 2000);
                break;
                
            case '챔피언':
                const championCoins = 300 * multiplier;
                const championHearts = 10 * multiplier;
                this.showMessage(`🏆 챔피언 보상!! 코인 +${championCoins}, 하트 +${championHearts} 🏆`);
                this.coins += championCoins;
                this.hearts += championHearts;
                this.playReactionAnimation('crazy-celebration');
                this.createMegaFireworks();
                this.createFlyingHearts();
                this.flashScreen();
                break;
        }
        
        this.updateStats();
    }

    handleRandomEvent() {
        const multiplier = this.currentMultiplier;
        const events = [
            { 
                message: () => `행운! 코인 +${50 * multiplier} 🎲 (${multiplier}x 배율)`, 
                action: () => this.coins += 50 * multiplier 
            },
            { 
                message: () => `불운! 코인 -${20}  🎲`, 
                action: () => this.coins = Math.max(0, this.coins - 20) 
            },
            { 
                message: () => `체력 회복! 하트 +${1 * multiplier} 🎲 (${multiplier}x 배율)`, 
                action: () => this.hearts += 1 * multiplier 
            },
            { 
                message: () => '아무 일도 일어나지 않았습니다 🎲', 
                action: () => {} 
            }
        ];
        
        const event = events[Math.floor(Math.random() * events.length)];
        this.showMessage(event.message());
        event.action();
    }

    handleEventTile() {
        const multiplier = this.currentMultiplier;
        const events = [
            { 
                message: () => `축제 개최! 코인 +${40 * multiplier} 🎉 (${multiplier}x 배율)`, 
                action: () => this.coins += 40 * multiplier 
            },
            { 
                message: () => `복권 당첨! 코인 +${70 * multiplier} 🎉 (${multiplier}x 배율)`, 
                action: () => this.coins += 70 * multiplier 
            },
            { 
                message: () => `친구의 도움! 하트 +${2 * multiplier} 🎉 (${multiplier}x 배율)`, 
                action: () => this.hearts += 2 * multiplier 
            },
            { 
                message: () => `보물 발견! 코인 +${60 * multiplier} 🎉 (${multiplier}x 배율)`, 
                action: () => this.coins += 60 * multiplier 
            }
        ];
        
        const event = events[Math.floor(Math.random() * events.length)];
        this.showMessage(event.message());
        event.action();
    }

    showQuiz() {
        const quiz = this.quizQuestions[Math.floor(Math.random() * this.quizQuestions.length)];
        
        this.quizModal.classList.add('active');
        document.getElementById('quizQuestion').textContent = quiz.question;
        
        const optionsContainer = document.getElementById('quizOptions');
        optionsContainer.innerHTML = '';
        
        quiz.options.forEach((option, index) => {
            const optionBtn = document.createElement('button');
            optionBtn.className = 'quiz-option';
            optionBtn.textContent = option;
            optionBtn.addEventListener('click', () => {
                this.checkQuizAnswer(index === quiz.correct);
                this.quizModal.classList.remove('active');
            });
            optionsContainer.appendChild(optionBtn);
        });
    }

    checkQuizAnswer(isCorrect) {
        const multiplier = this.currentMultiplier;
        if (isCorrect) {
            const reward = 30 * multiplier;
            this.showMessage(`정답! 코인 +${reward} ✅ (${multiplier}x 배율)`);
            this.coins += reward;
        } else {
            this.showMessage('틀렸습니다! 하트 -2 ❌');
            this.hearts = Math.max(0, this.hearts - 2);
        }
        this.updateStats();
    }

    showMessage(message) {
        this.statusMessage.textContent = message;
        this.statusMessage.style.animation = 'none';
        setTimeout(() => {
            this.statusMessage.style.animation = 'fadeIn 0.3s ease';
        }, 10);
    }

    updateStats() {
        document.getElementById('coins').textContent = this.coins;
        document.getElementById('hearts').textContent = this.hearts;
    }

    gameOver() {
        document.getElementById('finalCoins').textContent = this.coins;
        document.getElementById('finalPosition').textContent = this.tileTypes[this.currentPosition];
        this.gameOverModal.classList.add('active');
        this.rollBtn.disabled = true;
    }

    showLapCompleteToast() {
        this.hearts += 5;
        this.updateStats();
        
        // Create and show toast
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <span class="toast-icon">🎉</span>
            <div class="toast-text">
                <div class="toast-title">한 바퀴 완주!</div>
                <div class="toast-subtitle">하트 +5 획득 ❤️</div>
            </div>
        `;
        
        this.toastContainer.appendChild(toast);
        
        // Create confetti effect
        this.createConfetti();
        
        // Remove toast after animation completes
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    createMegaFireworks() {
        const colors = ['#ff0000', '#00ff00', '#0099ff', '#ffff00', '#ff00ff', '#00ffff', '#ff9900', '#ff69b4', '#ffd700', '#32cd32'];
        const fireworkCount = 200;
        
        // Get viewport center
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        for (let i = 0; i < fireworkCount; i++) {
            setTimeout(() => {
                const firework = document.createElement('div');
                firework.className = 'mega-firework';
                
                // Random color
                const color = colors[Math.floor(Math.random() * colors.length)];
                firework.style.backgroundColor = color;
                firework.style.color = color;
                
                // Start from center of screen
                firework.style.left = centerX + 'px';
                firework.style.top = centerY + 'px';
                
                // Random burst pattern
                const angle = (Math.PI * 2 * i) / 40 + Math.random() * 0.5;
                const velocity = 300 + Math.random() * 500;
                
                // Calculate burst trajectory
                const fx1 = Math.cos(angle) * velocity * 0.3 + (Math.random() - 0.5) * 100;
                const fy1 = Math.sin(angle) * velocity * 0.3 + (Math.random() - 0.5) * 100;
                const fx2 = Math.cos(angle) * velocity * 0.6 + (Math.random() - 0.5) * 150;
                const fy2 = Math.sin(angle) * velocity * 0.6 + (Math.random() - 0.5) * 150;
                const fx3 = Math.cos(angle) * velocity * 0.8 + (Math.random() - 0.5) * 200;
                const fy3 = Math.sin(angle) * velocity * 0.8 + Math.random() * 100;
                const fx4 = Math.cos(angle) * velocity * 0.9 + (Math.random() - 0.5) * 250;
                const fy4 = Math.sin(angle) * velocity * 0.9 + Math.random() * 150;
                const fx5 = Math.cos(angle) * velocity + (Math.random() - 0.5) * 300;
                const fy5 = Math.sin(angle) * velocity + Math.random() * 200;
                
                // Set CSS variables
                firework.style.setProperty('--fx1', fx1 + 'px');
                firework.style.setProperty('--fy1', fy1 + 'px');
                firework.style.setProperty('--fx2', fx2 + 'px');
                firework.style.setProperty('--fy2', fy2 + 'px');
                firework.style.setProperty('--fx3', fx3 + 'px');
                firework.style.setProperty('--fy3', fy3 + 'px');
                firework.style.setProperty('--fx4', fx4 + 'px');
                firework.style.setProperty('--fy4', fy4 + 'px');
                firework.style.setProperty('--fx5', fx5 + 'px');
                firework.style.setProperty('--fy5', fy5 + 'px');
                
                document.body.appendChild(firework);
                
                // Remove after animation
                setTimeout(() => {
                    firework.remove();
                }, 2000);
            }, i * 5); // Stagger the fireworks
        }
    }

    createFlyingHearts() {
        const heartCount = 20;
        const currentTile = document.querySelector(`.tile[data-index="${this.currentPosition}"]`);
        const tileRect = currentTile.getBoundingClientRect();
        const centerX = tileRect.left + tileRect.width / 2;
        const centerY = tileRect.top + tileRect.height / 2;
        
        for (let i = 0; i < heartCount; i++) {
            setTimeout(() => {
                const heart = document.createElement('div');
                heart.className = 'flying-heart';
                heart.textContent = '❤️';
                
                // Random position around the tile
                const offsetX = (Math.random() - 0.5) * 100;
                const offsetY = (Math.random() - 0.5) * 100;
                
                heart.style.left = (centerX + offsetX) + 'px';
                heart.style.top = (centerY + offsetY) + 'px';
                
                document.body.appendChild(heart);
                
                // Remove after animation
                setTimeout(() => {
                    heart.remove();
                }, 2000);
            }, i * 50);
        }
    }
    
    createFlyingCoins() {
        const coinCount = 25;
        const currentTile = document.querySelector(`.tile[data-index="${this.currentPosition}"]`);
        const tileRect = currentTile.getBoundingClientRect();
        const centerX = tileRect.left + tileRect.width / 2;
        const centerY = tileRect.top + tileRect.height / 2;
        
        for (let i = 0; i < coinCount; i++) {
            setTimeout(() => {
                const coin = document.createElement('div');
                coin.className = 'flying-coin';
                coin.textContent = '🪙';
                
                // Random position around the tile
                const offsetX = (Math.random() - 0.5) * 150;
                const offsetY = (Math.random() - 0.5) * 150;
                
                coin.style.left = (centerX + offsetX) + 'px';
                coin.style.top = (centerY + offsetY) + 'px';
                
                document.body.appendChild(coin);
                
                // Remove after animation
                setTimeout(() => {
                    coin.remove();
                }, 2500);
            }, i * 40);
        }
    }

    flashScreen() {
        const flash = document.createElement('div');
        flash.className = 'screen-flash';
        document.body.appendChild(flash);
        
        setTimeout(() => {
            flash.remove();
        }, 500);
    }

    createConfetti() {
        const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'gold', 'cyan', 'lime'];
        const shapes = ['square', 'circle', 'triangle', 'ribbon', 'star'];
        const confettiCount = 80;
        
        // Get start tile position (index 0)
        const startTile = document.querySelector('.tile[data-index="0"]');
        const tileRect = startTile.getBoundingClientRect();
        const centerX = tileRect.left + tileRect.width / 2;
        const centerY = tileRect.top + tileRect.height / 2;
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            const color = colors[Math.floor(Math.random() * colors.length)];
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            
            confetti.className = `confetti ${shape} ${color}`;
            
            // Start from center of screen
            confetti.style.left = centerX + 'px';
            confetti.style.top = centerY + 'px';
            
            // Random burst direction
            const angle = (Math.PI * 2 * i) / confettiCount + (Math.random() - 0.5) * 0.5;
            const velocity = 200 + Math.random() * 300; // Random velocity
            const spread = Math.random() * 100 + 50;
            
            // Calculate random end positions for burst effect
            const x1 = Math.cos(angle) * velocity * 0.3;
            const y1 = Math.sin(angle) * velocity * 0.3 - 50;
            
            const x2 = Math.cos(angle) * velocity * 0.5 + (Math.random() - 0.5) * spread;
            const y2 = Math.sin(angle) * velocity * 0.5 + (Math.random() - 0.5) * spread;
            
            const x3 = Math.cos(angle) * velocity * 0.7 + (Math.random() - 0.5) * spread * 1.5;
            const y3 = Math.sin(angle) * velocity * 0.7 + Math.random() * 100;
            
            const x4 = Math.cos(angle) * velocity * 0.9 + (Math.random() - 0.5) * spread * 2;
            const y4 = Math.sin(angle) * velocity * 0.9 + Math.random() * 150;
            
            const x5 = Math.cos(angle) * velocity + (Math.random() - 0.5) * spread * 2.5;
            const y5 = Math.sin(angle) * velocity + Math.random() * 200;
            
            // Set CSS variables for animation path
            confetti.style.setProperty('--x1', x1 + 'px');
            confetti.style.setProperty('--y1', y1 + 'px');
            confetti.style.setProperty('--x2', x2 + 'px');
            confetti.style.setProperty('--y2', y2 + 'px');
            confetti.style.setProperty('--x3', x3 + 'px');
            confetti.style.setProperty('--y3', y3 + 'px');
            confetti.style.setProperty('--x4', x4 + 'px');
            confetti.style.setProperty('--y4', y4 + 'px');
            confetti.style.setProperty('--x5', x5 + 'px');
            confetti.style.setProperty('--y5', y5 + 'px');
            
            // Random animation duration
            confetti.style.animationDuration = (Math.random() * 1.5 + 2) + 's';
            
            this.confettiContainer.appendChild(confetti);
            
            // Remove confetti after animation
            setTimeout(() => {
                confetti.remove();
            }, 3500);
        }
    }

    resetGame() {
        this.currentPosition = 0;
        this.coins = 100;
        this.hearts = 50;
        this.isRolling = false;
        this.currentMultiplier = 5;
        this.lapCount = 0;
        this.rollBtn.disabled = false;
        this.gameOverModal.classList.remove('active');
        
        this.selectBet(5);
        this.updatePlayerPosition();
        this.updateStats();
        this.showMessage('게임이 리셋되었습니다! 다시 시작하세요!');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new DiceQuizGame();
});