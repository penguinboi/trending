// ABOUTME: Main game entry point for Trending
// ABOUTME: Sets up Phaser 3 game with conveyor belt queue system

// Detect device pixel ratio for crisp rendering on retina displays
const dpr = window.devicePixelRatio || 1;

const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#d4e9ff',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        zoom: 1 / dpr
    },
    resolution: dpr,
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

// Game timing (10 minute game split into 10 phases)
const GAME_DURATION = 10 * 60 * 1000; // 10 minutes in ms
const PHASE_DURATION = GAME_DURATION / 10; // 1 minute per phase
let gameTimer = 0;
let currentPhase = 0;

// Difficulty scaling - belt speeds per phase (index 0-9)
const PHASE_SPEEDS = [30, 45, 65, 90, 120, 155, 195, 240, 290, 350];

// Card spacing: 180px card + 40px gap = 220px clearance
const CARD_CLEARANCE = 220;

// Calculate spawn interval from current belt speed (no overlap ever)
function getSpawnInterval() {
    return (CARD_CLEARANCE / beltSpeed) * 1000;
}

// Helper to create rounded rectangle with fill and optional stroke
function createRoundedRect(scene, x, y, width, height, radius, fillColor, fillAlpha, strokeColor, strokeWidth) {
    const graphics = scene.add.graphics();
    if (fillColor !== undefined) {
        graphics.fillStyle(fillColor, fillAlpha !== undefined ? fillAlpha : 1);
        graphics.fillRoundedRect(x - width/2, y - height/2, width, height, radius);
    }
    if (strokeColor !== undefined && strokeWidth) {
        graphics.lineStyle(strokeWidth, strokeColor, 1);
        graphics.strokeRoundedRect(x - width/2, y - height/2, width, height, radius);
    }
    return graphics;
}

// Helper to create fire gradient title text
function createFireTitle(scene, x, y, fontSize) {
    const container = scene.add.container(x, y);
    const letters = 'TRENDING'.split('');
    const colors = ['#FFD700', '#FFCC00', '#FFB300', '#FF9900', '#FF7700', '#FF5500', '#FF3300', '#FF0000'];

    // Calculate total width for centering
    const letterSpacing = fontSize * 0.65;
    const totalWidth = letters.length * letterSpacing;
    const startX = -totalWidth / 2 + letterSpacing / 2;

    // Add left fire emoji
    const leftFire = scene.add.text(startX - letterSpacing * 1.2, 0, '🔥', {
        fontSize: fontSize + 'px',
        padding: { x: 10, y: 10 }
    }).setOrigin(0.5);
    container.add(leftFire);

    // Add each letter with gradient color
    letters.forEach((letter, i) => {
        const letterText = scene.add.text(startX + i * letterSpacing, 0, letter, {
            fontSize: fontSize + 'px',
            fill: colors[i],
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(letterText);
    });

    // Add right fire emoji
    const rightFire = scene.add.text(startX + letters.length * letterSpacing + letterSpacing * 0.2, 0, '🔥', {
        fontSize: fontSize + 'px',
        padding: { x: 10, y: 10 }
    }).setOrigin(0.5);
    container.add(rightFire);

    return container;
}

// Vibrant color palette
const COLORS = {
    background: 0x1a1a2e,
    cardNeutral: 0x5a6578,
    cardPositive: 0x2ecc71,
    cardViral: 0x9b59b6,
    cardControversial: 0xe67e22,
    cardFakeNews: 0xe74c3c,
    buttonGreen: 0x27ae60,
    buttonGreenHover: 0x2ecc71,
    buttonGray: 0x5d6d7e,
    buttonGrayHover: 0x7f8c8d,
    accent: 0x3498db,
    warning: 0xf39c12,
    danger: 0xe74c3c,
    success: 0x2ecc71,
    textLight: 0xffffff,
    textMuted: 0x95a5a6
};

// Game state
let postPairs = [];
let beltSpeed = PHASE_SPEEDS[0];
let spawnTimer = 0;
let engagement = 0;
let stability = 100;
let selectedPost = null;
let gameOver = false;
let gameOverReason = '';
let gameStarted = false;
let currentScene = null;

// Verification state
const VERIFY_DURATION = 2000; // 2 seconds to verify
let verifyingPost = null;     // Currently verifying post
let verifyTimer = 0;          // Time spent verifying
let suppressionBacklash = 0;  // Tracks repeated suppression of real content

// Start screen UI
let startOverlay;

// Game over UI
let gameOverOverlay;
let gameOverText;
let gameOverSubtext;
let finalStatsText;
let playAgainButton;

// UI elements
let engagementText;
let stabilityText;
let decisionZone;

function preload() {
    // No external assets yet - using graphics primitives
}

// UI references for phase/timer
let phaseText;
let timerText;

// Feed display (shows last promoted post and effects)
let feedContainer;
let feedTypeText;
let feedEngText;
let feedStabText;
let feedSourceText;
let feedFakeText;

// Suppressed post display
let suppressedContainer;
let suppressedTitleText;
let suppressedStatusText;
let suppressedImpactText;
let suppressedBacklashText;

function create() {
    // Store scene reference for reset functionality
    currentScene = this;

    // Game title with fire gradient
    createFireTitle(this, 640, 40, 53).setDepth(100);

    // Tagline (emojis as separate elements with left-anchor to prevent cutoff)
    this.add.text(455, 95, '🌍', {
        fontSize: '18px',
        padding: { left: 20, right: 10, top: 10, bottom: 10 }
    }).setOrigin(0, 0.5).setDepth(100);
    this.add.text(640, 95, 'Choose what the world sees', {
        fontSize: '18px',
        fill: '#7a6a9a',
        fontStyle: 'italic'
    }).setOrigin(0.5).setDepth(100);
    this.add.text(780, 95, '👀', {
        fontSize: '18px',
        padding: { x: 10, y: 10 }
    }).setOrigin(0, 0.5).setDepth(100);

    // Decision zone (right side of screen)
    decisionZone = this.add.rectangle(1100, 360, 200, 600, 0x2d2d4a, 0.3);
    decisionZone.setStrokeStyle(2, 0x4a4a6a);

    // Decision zone label
    this.add.text(1100, 80, '⚠️ DECISION ZONE ⚠️', {
        fontSize: '14px',
        fill: '#7a6a9a',
        align: 'center',
        padding: { x: 4, y: 4 }
    }).setOrigin(0.5).setDepth(100);

    // Belt track
    this.add.rectangle(640, 360, 1200, 300, 0x0f0f1a, 0.5);

    // Belt lines (visual guides)
    for (let i = 0; i < 12; i++) {
        this.add.line(0, 0, i * 100, 220, i * 100, 500, 0x2a2a3a).setOrigin(0);
    }

    // UI: Engagement meter (depth 100 keeps UI above posts)
    engagementText = this.add.text(20, 20, '📈 User Engagement - 0', { fontSize: '22px', fill: '#00aa66', padding: { x: 4, y: 4 } }).setDepth(100);

    // UI: Stability meter
    stabilityText = this.add.text(20, 50, '⚖️ Global Stability - 100%', { fontSize: '22px', fill: '#228833', padding: { x: 4, y: 4 } }).setDepth(100);

    // UI: Phase indicator
    phaseText = this.add.text(20, 80, '🎯 Phase - 1 / 10', { fontSize: '22px', fill: '#8866cc', padding: { x: 4, y: 4 } }).setDepth(100);

    // UI: Timer
    timerText = this.add.text(20, 110, '⏱️ Time Left - 10:00', { fontSize: '22px', fill: '#5a3d7a', padding: { x: 4, y: 4 } }).setDepth(100);

    // UI: Feed display (shows last promoted content and effects)
    this.add.text(640, 530, '📣 Last Post Promoted to 🔥Wildfire Social Feed 📣', { fontSize: '13px', fill: '#7a6a9a', padding: { x: 4, y: 4 } }).setOrigin(0.5).setDepth(100);

    feedContainer = this.add.container(640, 570);
    feedContainer.setDepth(100);

    feedTypeText = this.add.text(0, 0, '—', {
        fontSize: '22px',
        fill: '#6a5a8a',
        fontStyle: 'bold',
        padding: { x: 4, y: 4 }
    }).setOrigin(0.5);
    feedContainer.add(feedTypeText);

    feedEngText = this.add.text(-250, 30, '', { fontSize: '16px', fill: '#228833' }).setOrigin(0.5);
    feedContainer.add(feedEngText);

    feedStabText = this.add.text(30, 30, '', { fontSize: '16px', fill: '#228833' }).setOrigin(0.5);
    feedContainer.add(feedStabText);

    feedSourceText = this.add.text(230, 30, '', { fontSize: '15px', fill: '#666' }).setOrigin(0.5);
    feedContainer.add(feedSourceText);

    feedFakeText = this.add.text(0, 55, '', { fontSize: '14px', fill: '#cc4444', fontStyle: 'bold', padding: { x: 4, y: 4 } }).setOrigin(0.5);
    feedContainer.add(feedFakeText);

    // UI: Suppressed post display (shows last suppressed post and impact)
    this.add.text(150, 530, '🚫 LAST SUPPRESSED 🚫', { fontSize: '13px', fill: '#7a6a9a', padding: { x: 4, y: 4 } }).setOrigin(0.5).setDepth(100);

    suppressedContainer = this.add.container(150, 570);
    suppressedContainer.setDepth(100);

    suppressedStatusText = this.add.text(0, 0, '—', {
        fontSize: '18px',
        fill: '#6a5a8a',
        fontStyle: 'bold',
        padding: { x: 4, y: 4 }
    }).setOrigin(0.5);
    suppressedContainer.add(suppressedStatusText);

    suppressedImpactText = this.add.text(0, 25, '', {
        fontSize: '14px',
        fill: '#228833'
    }).setOrigin(0.5);
    suppressedContainer.add(suppressedImpactText);

    suppressedBacklashText = this.add.text(0, 45, '', {
        fontSize: '12px',
        fill: '#cc4444'
    }).setOrigin(0.5);
    suppressedContainer.add(suppressedBacklashText);

    // UI: Stability guide
    this.add.text(640, 680, 'Stability: ❤️+++ > 😂++ > 👍+ > 😮- > 😢-- > 😡---', {
        fontSize: '13px',
        fill: '#6a5a8a',
        align: 'center',
        padding: { x: 4, y: 4 }
    }).setOrigin(0.5).setDepth(100);

    // UI: Instructions
    this.add.text(640, 700, '👆 Click to select post | [P] ✅ Promote (1.25x Engagement!) | [S] 🚫 Suppress | [V] 🔍 Verify | 🤖 = Algorithm\'s pick', {
        fontSize: '13px',
        fill: '#7a6a9a',
        align: 'center',
        padding: { x: 4, y: 4 }
    }).setOrigin(0.5).setDepth(100);

    // Input handlers
    this.input.keyboard.on('keydown-P', () => handleAction('promote'));
    this.input.keyboard.on('keydown-S', () => handleAction('suppress'));
    this.input.keyboard.on('keydown-V', () => handleAction('verify'));

    // Game over overlay (hidden initially, high depth to render above posts)
    gameOverOverlay = this.add.container(640, 360);
    gameOverOverlay.setDepth(1000);
    gameOverOverlay.setVisible(false);

    const overlay = this.add.rectangle(0, 0, 1280, 720, 0x000000, 0.85);
    gameOverOverlay.add(overlay);

    gameOverText = this.add.text(0, -80, '🎬 GAME OVER 🎬', {
        fontSize: '70px',
        fill: '#ff4444',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    gameOverOverlay.add(gameOverText);

    gameOverSubtext = this.add.text(0, 0, '', {
        fontSize: '26px',
        fill: '#ffffff'
    }).setOrigin(0.5);
    gameOverOverlay.add(gameOverSubtext);

    finalStatsText = this.add.text(0, 80, '', {
        fontSize: '22px',
        fill: '#888888',
        align: 'center'
    }).setOrigin(0.5);
    gameOverOverlay.add(finalStatsText);

    // Play again button with rounded corners
    const playAgainGraphics = this.add.graphics();
    const drawPlayAgainButton = (hover) => {
        playAgainGraphics.clear();
        playAgainGraphics.fillStyle(0x000000, 0.3);
        playAgainGraphics.fillRoundedRect(-130 + 3, 160 - 30 + 3, 260, 60, 30);
        playAgainGraphics.fillStyle(hover ? 0x6c5ce7 : 0x5f27cd, 1);
        playAgainGraphics.fillRoundedRect(-130, 160 - 30, 260, 60, 30);
        playAgainGraphics.lineStyle(3, 0xffffff, 0.6);
        playAgainGraphics.strokeRoundedRect(-130, 160 - 30, 260, 60, 30);
    };
    drawPlayAgainButton(false);
    gameOverOverlay.add(playAgainGraphics);

    const playAgainHitbox = this.add.rectangle(0, 160, 260, 60, 0xffffff, 0);
    playAgainHitbox.setInteractive({ useHandCursor: true });
    playAgainHitbox.on('pointerover', () => drawPlayAgainButton(true));
    playAgainHitbox.on('pointerout', () => drawPlayAgainButton(false));
    playAgainHitbox.on('pointerdown', () => resetGame());
    gameOverOverlay.add(playAgainHitbox);

    playAgainButton = this.add.text(0, 160, '🔄 PLAY AGAIN 🎮', {
        fontSize: '22px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    gameOverOverlay.add(playAgainButton);

    // Start screen overlay (high depth, shown initially)
    startOverlay = this.add.container(640, 360);
    startOverlay.setDepth(1001);

    const startBg = this.add.rectangle(0, 0, 1280, 720, 0xd4e9ff, 1);
    startOverlay.add(startBg);

    const startTitle = createFireTitle(this, 0, -290, 79);
    startOverlay.add(startTitle);

    const startSubtitle = this.add.text(0, -210, 'The Content Moderator Game', {
        fontSize: '22px',
        fill: '#7a6a9a',
        fontStyle: 'italic'
    }).setOrigin(0.5);
    startOverlay.add(startSubtitle);

    const welcomeText = this.add.text(0, -150, 'Welcome to your first day as Content Moderator at', {
        fontSize: '18px',
        fill: '#4a4a6a',
        align: 'center'
    }).setOrigin(0.5);
    startOverlay.add(welcomeText);

    const wildfireText = this.add.text(0, -120, 'Wildfire Social', {
        fontSize: '24px',
        fill: '#ff6b35',
        fontStyle: 'italic bold'
    }).setOrigin(0.5);
    startOverlay.add(wildfireText);

    const introText = this.add.text(0, 45,
        '🤖 Our algorithm is designed to maximize engagement.\n' +
        'It promotes whatever gets clicks — viral content, controversy, even misinformation.\n\n' +
        'Your job is to be the human in the loop.\n' +
        'Review content before it trends. Promote truth. Suppress fake news.\n' +
        'But be careful — suppress too much valid content and users will revolt!\n\n' +
        'Our investors want more growth which means more engagement. Society needs stability.\n' +
        'You have 10 minutes to prove you can balance both.\n\n' +
        '🌍 The world is watching. 👀', {
        fontSize: '18px',
        fill: '#4a4a6a',
        align: 'center',
        lineSpacing: 7
    }).setOrigin(0.5);
    startOverlay.add(introText);

    // Start button with rounded corners
    const startButtonGraphics = this.add.graphics();
    const drawStartButton = (hover) => {
        startButtonGraphics.clear();
        // Shadow
        startButtonGraphics.fillStyle(0x000000, 0.3);
        startButtonGraphics.fillRoundedRect(-130 + 4, 290 - 35 + 4, 260, 70, 35);
        // Main button
        startButtonGraphics.fillStyle(hover ? 0x00d2d3 : 0x00b894, 1);
        startButtonGraphics.fillRoundedRect(-130, 290 - 35, 260, 70, 35);
        // Highlight
        startButtonGraphics.fillStyle(0xffffff, 0.2);
        startButtonGraphics.fillRoundedRect(-130, 290 - 35, 260, 30, { tl: 35, tr: 35, bl: 0, br: 0 });
        // Border
        startButtonGraphics.lineStyle(3, 0xffffff, 0.7);
        startButtonGraphics.strokeRoundedRect(-130, 290 - 35, 260, 70, 35);
    };
    drawStartButton(false);
    startOverlay.add(startButtonGraphics);

    const startHitbox = this.add.rectangle(0, 290, 260, 70, 0xffffff, 0);
    startHitbox.setInteractive({ useHandCursor: true });
    startHitbox.on('pointerover', () => drawStartButton(true));
    startHitbox.on('pointerout', () => drawStartButton(false));
    startHitbox.on('pointerdown', () => startGame());
    startOverlay.add(startHitbox);

    const startButtonText = this.add.text(-8, 290, '🚀 BEGIN SHIFT', {
        fontSize: '24px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    startOverlay.add(startButtonText);

    const copyrightText = this.add.text(0, 350, '© 2026 🐧 PenguinboiSoftware', {
        fontSize: '14px',
        fill: '#8a7aaa'
    }).setOrigin(0.5);
    startOverlay.add(copyrightText);
}

function update(time, delta) {
    // Don't run game logic until started
    if (!gameStarted) return;

    // Check for game over
    if (gameOver) return;

    // Check loss conditions
    if (stability <= 0) {
        triggerGameOver('💔 SOCIETAL COLLAPSE 💔', '😰 The world has become divided and unstable.\nYour platform accelerated the fracturing of society.');
        return;
    }

    if (gameTimer >= GAME_DURATION) {
        triggerGameOver('🎉 TERM COMPLETED! 🎉', '✨ You survived your term as content moderator!\n🌍 The world kept watching... for now. 👀');
        return;
    }

    // Update game timer and phase progression
    gameTimer += delta;
    const newPhase = Math.min(9, Math.floor(gameTimer / PHASE_DURATION));

    if (newPhase !== currentPhase) {
        currentPhase = newPhase;
        beltSpeed = PHASE_SPEEDS[currentPhase];
        // Reset spawn timer to prevent overlap when interval shortens
        spawnTimer = 0;
    }

    // Move posts along the belt
    for (let i = postPairs.length - 1; i >= 0; i--) {
        const pair = postPairs[i];
        pair.x += (beltSpeed * delta) / 1000;
        pair.container.x = pair.x;

        // Warning glow when in decision zone (x > 950) and unresolved
        if (pair.x > 950 && !pair.resolved) {
            if (!pair.inWarningZone) {
                pair.inWarningZone = true;
                // Redraw cards with warning border
                redrawCardWarning(pair.cardA.bg, pair.cardA.cardWidth, pair.cardA.cardHeight, pair.cardA.cornerRadius, pair.cardA.cardColor);
                redrawCardWarning(pair.cardB.bg, pair.cardB.cardWidth, pair.cardB.cardHeight, pair.cardB.cornerRadius, pair.cardB.cardColor);
            }
        }

        // Cancel verification if post is about to exit (not enough time)
        if (pair.x > 1150 && verifyingPost && verifyingPost.pair === pair) {
            // Show cancelled state on the card
            if (verifyingPost.container.verifyText) {
                verifyingPost.container.verifyText.setText('❓ NO TIME');
                verifyingPost.container.verifyText.setBackgroundColor('#666666');
            }
            verifyingPost = null;
            verifyTimer = 0;
        }

        // Check if pair has exited decision zone (algorithm decides)
        if (pair.x > 1280) {
            algorithmDecides(pair);
            pair.container.destroy();
            postPairs.splice(i, 1);
        }
    }

    // Spawn new pairs (interval based on current speed to prevent overlap)
    spawnTimer += delta;
    if (spawnTimer >= getSpawnInterval()) {
        spawnTimer = 0;
        spawnPostPair(this);
    }

    // Update UI
    engagementText.setText('📈 User Engagement - ' + Math.floor(engagement).toLocaleString());
    stabilityText.setText('⚖️ Global Stability - ' + Math.floor(stability) + '%');
    phaseText.setText('🎯 Phase - ' + (currentPhase + 1) + ' / 10');

    // Update timer (countdown from 10:00)
    const remainingMs = Math.max(0, GAME_DURATION - gameTimer);
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    timerText.setText('⏱️ Time Left - ' + minutes + ':' + seconds.toString().padStart(2, '0'));

    // Color stability based on value
    if (stability > 66) {
        stabilityText.setFill('#228833');
    } else if (stability > 33) {
        stabilityText.setFill('#cc8800');
    } else {
        stabilityText.setFill('#cc4444');
    }

    // Update verification timer
    if (verifyingPost) {
        verifyTimer += delta;

        // Update progress text
        const progress = Math.min(100, Math.floor((verifyTimer / VERIFY_DURATION) * 100));
        if (verifyingPost.container.verifyText) {
            verifyingPost.container.verifyText.setText(`⏳ ${progress}%`);
        }

        // Check if verification complete
        if (verifyTimer >= VERIFY_DURATION) {
            const { post, container } = verifyingPost;
            post.verified = true;

            // Show result
            if (container.verifyText) {
                if (post.isFakeNews) {
                    container.verifyText.setText('🚨 FAKE NEWS');
                    container.verifyText.setBackgroundColor('#cc0000');
                } else {
                    container.verifyText.setText('✅ VERIFIED REAL');
                    container.verifyText.setBackgroundColor('#228833');
                }
            }

            verifyingPost = null;
            verifyTimer = 0;
            selectedPost = null;
        }
    }
}

function spawnPostPair(scene) {
    const postA = generatePost();
    const postB = generatePost();

    // Create container for the pair (depth 10 keeps posts below UI)
    const container = scene.add.container(-200, 360);
    container.setDepth(10);

    // Post A (top)
    const cardA = createPostCard(scene, 0, -80, postA, 'A');
    container.add(cardA);

    // Post B (bottom)
    const cardB = createPostCard(scene, 0, 80, postB, 'B');
    container.add(cardB);

    // VS divider
    const vs = scene.add.text(0, 0, 'VS', { fontSize: '22px', fill: '#4a4a6a', fontStyle: 'bold' });
    vs.setOrigin(0.5);
    container.add(vs);

    // Algorithm choice indicator (shows which post the algorithm will pick)
    const algoChoiceIsA = postA.engagement >= postB.engagement;
    const algoChoice = algoChoiceIsA ? cardA : cardB;
    const algoIndicator = scene.add.text(70, -40, '🤖', {
        fontSize: '18px',
        padding: { x: 4, y: 4 }
    });
    algoIndicator.setOrigin(0.5);
    algoChoice.add(algoIndicator);

    const pair = {
        x: -200,
        container: container,
        postA: postA,
        postB: postB,
        cardA: cardA,
        cardB: cardB,
        algoIndicator: algoIndicator,
        algoOnA: algoChoiceIsA,
        resolved: false
    };

    postPairs.push(pair);
}

function createPostCard(scene, x, y, post, label) {
    const container = scene.add.container(x, y);
    const cardWidth = 180;
    const cardHeight = 120;
    const cornerRadius = 16;

    // Card background with rounded corners
    const bgGraphics = scene.add.graphics();
    const cardColor = getReactionColor(post.reaction);

    // Draw card with shadow effect
    bgGraphics.fillStyle(0x000000, 0.3);
    bgGraphics.fillRoundedRect(-cardWidth/2 + 4, -cardHeight/2 + 4, cardWidth, cardHeight, cornerRadius);

    // Main card fill
    bgGraphics.fillStyle(cardColor, 1);
    bgGraphics.fillRoundedRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, cornerRadius);

    // Lighter top highlight for 3D effect
    bgGraphics.fillStyle(0xffffff, 0.15);
    bgGraphics.fillRoundedRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight/3, { tl: cornerRadius, tr: cornerRadius, bl: 0, br: 0 });

    // Border
    bgGraphics.lineStyle(3, 0xffffff, 0.4);
    bgGraphics.strokeRoundedRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, cornerRadius);
    container.add(bgGraphics);

    // Invisible hitbox for interaction
    const hitbox = scene.add.rectangle(0, 0, cardWidth, cardHeight, 0xffffff, 0);
    hitbox.setInteractive({ useHandCursor: true });
    container.add(hitbox);

    // Post label badge (A or B)
    const badgeGraphics = scene.add.graphics();
    badgeGraphics.fillStyle(0x000000, 0.4);
    badgeGraphics.fillRoundedRect(-cardWidth/2 + 8, -cardHeight/2 + 8, 60, 24, 8);
    container.add(badgeGraphics);

    const labelText = scene.add.text(-cardWidth/2 + 38, -cardHeight/2 + 20, 'Post ' + label, {
        fontSize: '13px',
        fill: '#fff',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(labelText);

    // Large reaction emoji (center)
    const reactionText = scene.add.text(0, -10, post.emoji, {
        fontSize: '40px',
        padding: { x: 4, y: 4 }
    });
    reactionText.setOrigin(0.5);
    container.add(reactionText);

    // Engagement value
    const engText = scene.add.text(0, 35, '📈 +' + post.engagement.toLocaleString(), {
        fontSize: '18px',
        fill: '#ffffff',
        fontStyle: 'bold'
    });
    engText.setOrigin(0.5);
    container.add(engText);

    // Verification status (hidden until verified)
    const verifyText = scene.add.text(0, -45, '', {
        fontSize: '12px',
        fill: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#000000aa',
        padding: { x: 6, y: 4 }
    });
    verifyText.setOrigin(0.5);
    verifyText.setVisible(false);
    container.add(verifyText);
    container.verifyText = verifyText;

    // Interaction handlers
    hitbox.on('pointerdown', () => selectPost(post, container, bgGraphics, hitbox));
    hitbox.on('pointerover', () => {
        if (container.resolved) return; // Don't show hover on resolved cards
        bgGraphics.clear();
        // Shadow
        bgGraphics.fillStyle(0x000000, 0.3);
        bgGraphics.fillRoundedRect(-cardWidth/2 + 4, -cardHeight/2 + 4, cardWidth, cardHeight, cornerRadius);
        // Main fill (brighter on hover)
        bgGraphics.fillStyle(cardColor, 1);
        bgGraphics.fillRoundedRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, cornerRadius);
        bgGraphics.fillStyle(0xffffff, 0.25);
        bgGraphics.fillRoundedRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight/3, { tl: cornerRadius, tr: cornerRadius, bl: 0, br: 0 });
        // Bright border on hover
        bgGraphics.lineStyle(4, 0xffffff, 0.9);
        bgGraphics.strokeRoundedRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, cornerRadius);
    });
    hitbox.on('pointerout', () => {
        if (container.resolved) return; // Don't redraw resolved cards
        if (!selectedPost || selectedPost.post !== post) {
            redrawCard(bgGraphics, cardWidth, cardHeight, cornerRadius, cardColor, false);
        }
    });

    // Store references
    container.postData = post;
    container.bg = bgGraphics;
    container.hitbox = hitbox;
    container.cardColor = cardColor;
    container.cardWidth = cardWidth;
    container.cardHeight = cardHeight;
    container.cornerRadius = cornerRadius;
    container.scene = scene;

    return container;
}

function redrawCard(graphics, width, height, radius, color, selected) {
    graphics.clear();
    // Shadow
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillRoundedRect(-width/2 + 4, -height/2 + 4, width, height, radius);
    // Main fill
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(-width/2, -height/2, width, height, radius);
    // Highlight
    graphics.fillStyle(0xffffff, 0.15);
    graphics.fillRoundedRect(-width/2, -height/2, width, height/3, { tl: radius, tr: radius, bl: 0, br: 0 });
    // Border
    if (selected) {
        graphics.lineStyle(4, 0x00ffff, 1);
    } else {
        graphics.lineStyle(3, 0xffffff, 0.4);
    }
    graphics.strokeRoundedRect(-width/2, -height/2, width, height, radius);
}

function redrawCardWarning(graphics, width, height, radius, color) {
    graphics.clear();
    // Shadow
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillRoundedRect(-width/2 + 4, -height/2 + 4, width, height, radius);
    // Main fill
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(-width/2, -height/2, width, height, radius);
    // Highlight
    graphics.fillStyle(0xffffff, 0.15);
    graphics.fillRoundedRect(-width/2, -height/2, width, height/3, { tl: radius, tr: radius, bl: 0, br: 0 });
    // Warning border (orange)
    graphics.lineStyle(4, 0xff6600, 1);
    graphics.strokeRoundedRect(-width/2, -height/2, width, height, radius);
}

function generatePost() {
    // Reaction types with stability effects and fake news likelihood
    const reactions = [
        { reaction: 'love', emoji: '❤️', stability: 3, fakeChance: 0.05, weight: 10 },
        { reaction: 'haha', emoji: '😂', stability: 2, fakeChance: 0.15, weight: 15 },
        { reaction: 'like', emoji: '👍', stability: 1, fakeChance: 0.10, weight: 25 },
        { reaction: 'wow', emoji: '😮', stability: -1, fakeChance: 0.25, weight: 20 },
        { reaction: 'sad', emoji: '😢', stability: -2, fakeChance: 0.20, weight: 15 },
        { reaction: 'angry', emoji: '😡', stability: -3, fakeChance: 0.40, weight: 15 }
    ];

    // Weighted random selection for reaction type
    const totalWeight = reactions.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;

    let selected = reactions[0];
    for (const r of reactions) {
        random -= r.weight;
        if (random <= 0) {
            selected = r;
            break;
        }
    }

    // Generate engagement (higher for emotional reactions, scaled for large social network)
    const baseEngagement = selected.reaction === 'angry' ? 60000 :
                          selected.reaction === 'love' ? 50000 :
                          selected.reaction === 'wow' ? 40000 :
                          selected.reaction === 'sad' ? 30000 :
                          selected.reaction === 'haha' ? 20000 :
                          selected.reaction === 'like' ? 5000 : 10000;
    const engagement = baseEngagement + Math.floor(Math.random() * 20000) - 5000;

    // Add variance to stability (never zero - always positive or negative)
    const stabilityVariance = Math.floor(Math.random() * 3) - 1;
    let stability = selected.stability + stabilityVariance;
    if (stability === 0) {
        stability = Math.random() < 0.5 ? 1 : -1;
    }

    // Determine if this post is fake news
    const isFakeNews = Math.random() < selected.fakeChance;

    return {
        reaction: selected.reaction,
        emoji: selected.emoji,
        engagement: engagement,
        stability: stability,           // Hidden
        fakeNewsChance: selected.fakeChance, // Hidden
        isFakeNews: isFakeNews,         // Hidden until verified
        verified: false                  // Has player verified this post?
    };
}

function getReactionColor(reaction) {
    const colors = {
        'love': 0xe84393,    // Pink
        'haha': 0xfdcb6e,    // Yellow
        'like': 0x0984e3,    // Blue
        'wow': 0xe17055,     // Orange
        'sad': 0x6c5ce7,     // Purple
        'angry': 0xd63031    // Red
    };
    return colors[reaction] || 0x636e72;
}

function selectPost(post, container, bgGraphics, hitbox) {
    // Deselect previous
    if (selectedPost && selectedPost.container) {
        const prev = selectedPost.container;
        redrawCard(prev.bg, prev.cardWidth, prev.cardHeight, prev.cornerRadius, prev.cardColor, false);
    }

    selectedPost = { post, container, bg: bgGraphics, hitbox };
    redrawCard(bgGraphics, container.cardWidth, container.cardHeight, container.cornerRadius, container.cardColor, true);
}

function handleAction(action) {
    if (!selectedPost) return;

    const { post, container } = selectedPost;

    // Find the pair this post belongs to
    const pair = postPairs.find(p =>
        p.postA === post || p.postB === post
    );

    if (!pair || pair.resolved) return;

    // Determine which post label (A or B)
    const postLabel = pair.postA === post ? 'A' : 'B';

    switch (action) {
        case 'promote':
            // Log state before promotion
            console.log('=== PLAYER PROMOTE ===');
            console.log('BEFORE - Engagement:', engagement, 'Stability:', stability);
            console.log('Post metrics:', {
                reaction: post.reaction,
                emoji: post.emoji,
                engagement: post.engagement,
                stability: post.stability,
                isFakeNews: post.isFakeNews,
                verified: post.verified
            });

            // Player promotion gets 1.25x impact on both engagement and stability
            const engEffect = Math.floor(post.engagement * 1.25);
            engagement += engEffect;
            // Store original stability before fake news penalty
            const originalStab = Math.floor(post.stability * 1.25);
            // Fake news has worse stability impact
            let stabEffect = post.stability;
            if (post.isFakeNews) {
                console.log('Fake news penalty applied:', stabEffect, '→', stabEffect > 0 ? -stabEffect : stabEffect * 2);
                if (stabEffect > 0) {
                    stabEffect = -stabEffect; // Positive becomes negative
                } else {
                    stabEffect = stabEffect * 2; // Negative is doubled
                }
            }
            stabEffect = Math.floor(stabEffect * 1.25);
            stability += stabEffect;

            console.log('Effects - Engagement:', '+' + engEffect, 'Stability:', (stabEffect >= 0 ? '+' : '') + stabEffect);
            console.log('AFTER - Engagement:', engagement, 'Stability:', stability);
            pair.resolved = true;
            container.resolved = true;
            flashCard(container, 0x00ff88);
            // Add large checkmark over the post
            const checkSign = container.scene.add.text(0, 0, '✅', {
                fontSize: '80px',
                padding: { x: 4, y: 4 }
            }).setOrigin(0.5);
            container.add(checkSign);
            updateFeed(post, postLabel, 'YOU', stabEffect, engEffect, originalStab);
            break;

        case 'suppress':
            let suppressImpact;
            if (!post.isFakeNews) {
                // Suppressing real content causes escalating backlash
                suppressionBacklash++;
                suppressImpact = -suppressionBacklash; // -1, -2, -3, etc.
                stability += suppressImpact;
                flashCard(container, 0xff4444);
            } else {
                // Suppressing fake news is good
                suppressImpact = 1;
                stability += suppressImpact;
                flashCard(container, 0x00ff88);
            }
            // Update suppressed post display
            updateSuppressedDisplay(post, suppressImpact);
            // Mark post as suppressed (algorithm will choose the other post)
            post.suppressed = true;
            container.resolved = true;
            // Add large NO sign over the post
            const noSign = container.scene.add.text(0, 0, '🚫', {
                fontSize: '80px',
                padding: { x: 4, y: 4 }
            }).setOrigin(0.5);
            container.add(noSign);
            // Update robot indicator to show new algorithm choice
            if (pair.postA.suppressed && pair.postB.suppressed) {
                // Both suppressed - hide indicator
                pair.algoIndicator.setVisible(false);
                pair.resolved = true;
            } else if (pair.postA.suppressed && !pair.postB.suppressed) {
                // A suppressed - move indicator to B
                if (pair.algoOnA) {
                    pair.cardA.remove(pair.algoIndicator);
                    pair.cardB.add(pair.algoIndicator);
                    pair.algoOnA = false;
                }
            } else if (pair.postB.suppressed && !pair.postA.suppressed) {
                // B suppressed - move indicator to A
                if (!pair.algoOnA) {
                    pair.cardB.remove(pair.algoIndicator);
                    pair.cardA.add(pair.algoIndicator);
                    pair.algoOnA = true;
                }
            }
            break;

        case 'verify':
            // Start verification timer (takes real time)
            if (!verifyingPost && !post.verified) {
                verifyingPost = { post, container, pair };
                verifyTimer = 0;
                // Show "VERIFYING..." on the card
                if (container.verifyText) {
                    container.verifyText.setText('⏳ VERIFYING...');
                    container.verifyText.setVisible(true);
                }
            }
            break;
    }

    // Clamp stability
    stability = Math.max(0, Math.min(100, stability));

    // Clear selection (except during verify)
    if (action !== 'verify') {
        selectedPost = null;
    }
}

function flashCard(container, color) {
    if (container.bg && container.cardWidth) {
        // Redraw the card with the flash color
        redrawCard(container.bg, container.cardWidth, container.cardHeight, container.cornerRadius, color, false);
    }
}

function algorithmDecides(pair) {
    if (pair.resolved) return;

    // Check for suppressed posts
    const aSuppressed = pair.postA.suppressed;
    const bSuppressed = pair.postB.suppressed;

    // If both suppressed, nothing gets promoted
    if (aSuppressed && bSuppressed) {
        return;
    }

    // Determine which post to promote
    let chosenIsA;
    if (aSuppressed) {
        chosenIsA = false; // A suppressed, choose B
    } else if (bSuppressed) {
        chosenIsA = true; // B suppressed, choose A
    } else {
        // Neither suppressed, algorithm picks higher engagement
        chosenIsA = pair.postA.engagement >= pair.postB.engagement;
    }

    const chosen = chosenIsA ? pair.postA : pair.postB;
    const chosenLabel = chosenIsA ? 'A' : 'B';

    // Log state before promotion
    console.log('=== ALGORITHM PROMOTE ===');
    console.log('BEFORE - Engagement:', engagement, 'Stability:', stability);
    console.log('Post metrics:', {
        reaction: chosen.reaction,
        emoji: chosen.emoji,
        engagement: chosen.engagement,
        stability: chosen.stability,
        isFakeNews: chosen.isFakeNews,
        verified: chosen.verified
    });

    engagement += chosen.engagement;

    // Store original stability before fake news penalty
    const originalStab = chosen.stability;
    // Fake news has worse stability impact
    let stabEffect = chosen.stability;
    if (chosen.isFakeNews) {
        console.log('Fake news penalty applied:', stabEffect, '→', stabEffect > 0 ? -stabEffect : stabEffect * 2);
        if (stabEffect > 0) {
            stabEffect = -stabEffect; // Positive becomes negative
        } else {
            stabEffect = stabEffect * 2; // Negative is doubled
        }
    }
    stability += stabEffect;

    console.log('Effects - Engagement:', '+' + chosen.engagement, 'Stability:', (stabEffect >= 0 ? '+' : '') + stabEffect);
    console.log('AFTER - Engagement:', engagement, 'Stability:', stability);

    // Clamp stability
    stability = Math.max(0, Math.min(100, stability));

    // Update feed display
    updateFeed(chosen, chosenLabel, 'ALGORITHM', stabEffect, chosen.engagement, originalStab);
}

function updateFeed(post, label, source, actualStability, actualEngagement, originalStability) {
    // Use actual values if provided (accounts for player 1.25x bonus and fake news penalty)
    const stabEffect = actualStability !== undefined ? actualStability : post.stability;
    const engEffect = actualEngagement !== undefined ? actualEngagement : post.engagement;
    const origStab = originalStability !== undefined ? originalStability : post.stability;

    // Update feed with reaction emoji and label
    feedTypeText.setText(`Post ${label}: ${post.emoji}`);
    feedTypeText.setFill(getReactionColorHex(post.reaction));

    // Show engagement change
    const engSign = engEffect >= 0 ? '+' : '';
    feedEngText.setText(`Engagement: ${engSign}${engEffect.toLocaleString()}`);
    feedEngText.setFill('#228833');

    // Show stability change (revealed after promotion, includes fake news penalty)
    const stabSign = stabEffect >= 0 ? '+' : '';
    if (post.isFakeNews && origStab !== stabEffect) {
        // Show original and penalized values for fake news
        const origSign = origStab >= 0 ? '+' : '';
        feedStabText.setText(`Stability: ${origSign}${origStab} → ${stabSign}${stabEffect}`);
    } else {
        feedStabText.setText(`Stability: ${stabSign}${stabEffect}`);
    }
    feedStabText.setFill(stabEffect >= 0 ? '#228833' : '#cc4444');

    // Show who made the decision
    feedSourceText.setText(`by ${source}`);
    feedSourceText.setFill(source === 'ALGORITHM' ? '#cc4444' : '#228833');

    // Show fake news status
    if (post.isFakeNews) {
        feedFakeText.setText('🚨 FAKE NEWS');
        feedFakeText.setFill('#cc4444');
    } else {
        feedFakeText.setText('✅ VERIFIED REAL');
        feedFakeText.setFill('#228833');
    }
}

function updateSuppressedDisplay(post, impact) {
    // Show whether the suppressed post was fake or real
    if (post.isFakeNews) {
        suppressedStatusText.setText('🚨 Was FAKE NEWS');
        suppressedStatusText.setFill('#228833'); // Green - good decision
    } else {
        suppressedStatusText.setText('❌ Was REAL content');
        suppressedStatusText.setFill('#cc4444'); // Red - bad decision
    }

    // Show the stability impact
    const sign = impact >= 0 ? '+' : '';
    suppressedImpactText.setText(`Stability: ${sign}${impact}`);
    suppressedImpactText.setFill(impact >= 0 ? '#228833' : '#cc4444');

    // Show current backlash level
    if (suppressionBacklash > 0) {
        suppressedBacklashText.setText(`⚠️ Censorship Backlash: ${suppressionBacklash}`);
    } else {
        suppressedBacklashText.setText('');
    }
}

function triggerGameOver(title, reason) {
    gameOver = true;
    gameOverReason = reason;

    // Update game over overlay
    gameOverText.setText(title);
    gameOverText.setFill(title === 'TERM COMPLETED' ? '#00ff88' : '#ff4444');
    gameOverSubtext.setText(reason);
    finalStatsText.setText(`Final Engagement: ${Math.floor(engagement).toLocaleString()}\nFinal Stability: ${Math.floor(stability)}%\nPhase Reached: ${currentPhase + 1}/10`);

    gameOverOverlay.setVisible(true);
}

function getReactionColorHex(reaction) {
    const colors = {
        'love': '#e84393',
        'haha': '#fdcb6e',
        'like': '#0984e3',
        'wow': '#e17055',
        'sad': '#6c5ce7',
        'angry': '#d63031'
    };
    return colors[reaction] || '#4a5568';
}

function startGame() {
    gameStarted = true;
    startOverlay.setVisible(false);
    spawnPostPair(currentScene);
}

function resetGame() {
    // Clear existing post pairs
    for (const pair of postPairs) {
        pair.container.destroy();
    }
    postPairs = [];

    // Reset game state
    gameTimer = 0;
    currentPhase = 0;
    beltSpeed = PHASE_SPEEDS[0];
    spawnTimer = 0;
    engagement = 0;
    stability = 100;
    selectedPost = null;
    gameOver = false;
    gameOverReason = '';
    verifyingPost = null;
    verifyTimer = 0;
    suppressionBacklash = 0;

    // Reset UI
    engagementText.setText('📈 User Engagement - 0');
    stabilityText.setText('⚖️ Global Stability - 100%');
    stabilityText.setFill('#228833');
    phaseText.setText('🎯 Phase - 1 / 10');
    timerText.setText('⏱️ Time Left - 10:00');
    feedTypeText.setText('—');
    feedTypeText.setFill('#888');
    feedEngText.setText('');
    feedStabText.setText('');
    feedSourceText.setText('');
    feedFakeText.setText('');
    suppressedStatusText.setText('—');
    suppressedStatusText.setFill('#6a5a8a');
    suppressedImpactText.setText('');
    suppressedBacklashText.setText('');

    // Hide game over, show start screen
    gameOverOverlay.setVisible(false);
    startOverlay.setVisible(true);
    gameStarted = false;
}
