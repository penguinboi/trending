// ABOUTME: Main game entry point for Trending
// ABOUTME: Sets up Phaser 3 game with conveyor belt queue system

// Detect device pixel ratio for crisp rendering on retina displays
const dpr = window.devicePixelRatio || 1;

const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#e8dff5',
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

function create() {
    // Store scene reference for reset functionality
    currentScene = this;

    // Game title
    this.add.text(640, 25, '📱 TRENDING 📱', {
        fontSize: '53px',
        fill: '#5a3d7a',
        fontStyle: 'bold'
    }).setOrigin(0.5);

    // Tagline
    this.add.text(640, 60, '🌍 The world sees what you choose to show 👀', {
        fontSize: '18px',
        fill: '#7a6a9a',
        fontStyle: 'italic'
    }).setOrigin(0.5);

    // Decision zone (right side of screen)
    decisionZone = this.add.rectangle(1100, 360, 200, 600, 0x2d2d4a, 0.3);
    decisionZone.setStrokeStyle(2, 0x4a4a6a);

    // Decision zone label
    this.add.text(1100, 80, '⚠️ DECISION\nZONE ⚠️', {
        fontSize: '18px',
        fill: '#7a6a9a',
        align: 'center'
    }).setOrigin(0.5);

    // Belt track
    this.add.rectangle(640, 360, 1200, 300, 0x0f0f1a, 0.5);

    // Belt lines (visual guides)
    for (let i = 0; i < 12; i++) {
        this.add.line(0, 0, i * 100, 220, i * 100, 500, 0x2a2a3a).setOrigin(0);
    }

    // UI: Engagement meter
    this.add.text(20, 20, '📈 User Engagement', { fontSize: '15px', fill: '#6a5a8a' });
    engagementText = this.add.text(20, 40, '0', { fontSize: '31px', fill: '#00aa66' });

    // UI: Stability meter
    this.add.text(20, 75, '⚖️ Global Stability', { fontSize: '15px', fill: '#6a5a8a' });
    stabilityText = this.add.text(20, 95, '100%', { fontSize: '26px', fill: '#cc8800' });

    // UI: Phase indicator
    this.add.text(20, 130, '🎯 Phase', { fontSize: '15px', fill: '#6a5a8a' });
    phaseText = this.add.text(20, 150, '1 / 10', { fontSize: '26px', fill: '#8866cc' });

    // UI: Timer
    this.add.text(20, 185, '⏱️ Time Left', { fontSize: '15px', fill: '#6a5a8a' });
    timerText = this.add.text(20, 205, '10:00', { fontSize: '26px', fill: '#5a3d7a' });

    // UI: Feed display (shows last promoted content and effects)
    this.add.text(640, 570, '📣 PROMOTED TO FEED 📣', { fontSize: '13px', fill: '#7a6a9a' }).setOrigin(0.5);

    feedContainer = this.add.container(640, 610);

    feedTypeText = this.add.text(0, 0, '—', {
        fontSize: '22px',
        fill: '#6a5a8a',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    feedContainer.add(feedTypeText);

    feedEngText = this.add.text(-120, 30, '', { fontSize: '18px', fill: '#00ff88' }).setOrigin(0.5);
    feedContainer.add(feedEngText);

    feedStabText = this.add.text(0, 30, '', { fontSize: '18px', fill: '#ffaa00' }).setOrigin(0.5);
    feedContainer.add(feedStabText);

    feedSourceText = this.add.text(120, 30, '', { fontSize: '15px', fill: '#666' }).setOrigin(0.5);
    feedContainer.add(feedSourceText);

    // UI: Instructions
    this.add.text(640, 680, '👆 Click a post to select it! [P] ✅ Promote | [S] 🚫 Suppress | [V] 🔍 Verify', {
        fontSize: '15px',
        fill: '#7a6a9a',
        align: 'center'
    }).setOrigin(0.5);

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
        playAgainGraphics.fillRoundedRect(-100 + 3, 160 - 25 + 3, 200, 50, 25);
        playAgainGraphics.fillStyle(hover ? 0x6c5ce7 : 0x5f27cd, 1);
        playAgainGraphics.fillRoundedRect(-100, 160 - 25, 200, 50, 25);
        playAgainGraphics.lineStyle(3, 0xffffff, 0.6);
        playAgainGraphics.strokeRoundedRect(-100, 160 - 25, 200, 50, 25);
    };
    drawPlayAgainButton(false);
    gameOverOverlay.add(playAgainGraphics);

    const playAgainHitbox = this.add.rectangle(0, 160, 200, 50, 0xffffff, 0);
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

    const startBg = this.add.rectangle(0, 0, 1280, 720, 0xe8dff5, 1);
    startOverlay.add(startBg);

    const startTitle = this.add.text(0, -260, '📱 TRENDING 📱', {
        fontSize: '79px',
        fill: '#5a3d7a',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    startOverlay.add(startTitle);

    const introText = this.add.text(0, -60,
        '👋 Welcome to your first day as Content Moderator at TrendNet!\n\n' +
        '🤖 Our algorithm is designed to maximize engagement.\n' +
        'It promotes whatever gets clicks — viral content, controversy, even misinformation.\n\n' +
        '🧠 Your job is to be the human in the loop.\n' +
        'Review content before it trends. Promote truth. Suppress lies.\n' +
        '⚠️ But be careful — suppress too much valid content and users will revolt!\n\n' +
        '📊 The board wants growth. Society needs stability.\n' +
        '⏱️ You have 10 minutes to prove you can balance both.\n\n' +
        '🌍 The world is watching. 👀', {
        fontSize: '18px',
        fill: '#4a4a6a',
        align: 'center',
        lineSpacing: 7
    }).setOrigin(0.5);
    startOverlay.add(introText);

    const controlsText = this.add.text(0, 180, '🎮  [P] ✅ Promote  |  [S] 🚫 Suppress  |  [V] 🔍 Verify', {
        fontSize: '15px',
        fill: '#6a5a8a',
        align: 'center'
    }).setOrigin(0.5);
    startOverlay.add(controlsText);

    // Start button with rounded corners
    const startButtonGraphics = this.add.graphics();
    const drawStartButton = (hover) => {
        startButtonGraphics.clear();
        // Shadow
        startButtonGraphics.fillStyle(0x000000, 0.3);
        startButtonGraphics.fillRoundedRect(-110 + 4, 240 - 30 + 4, 220, 60, 30);
        // Main button
        startButtonGraphics.fillStyle(hover ? 0x00d2d3 : 0x00b894, 1);
        startButtonGraphics.fillRoundedRect(-110, 240 - 30, 220, 60, 30);
        // Highlight
        startButtonGraphics.fillStyle(0xffffff, 0.2);
        startButtonGraphics.fillRoundedRect(-110, 240 - 30, 220, 25, { tl: 30, tr: 30, bl: 0, br: 0 });
        // Border
        startButtonGraphics.lineStyle(3, 0xffffff, 0.7);
        startButtonGraphics.strokeRoundedRect(-110, 240 - 30, 220, 60, 30);
    };
    drawStartButton(false);
    startOverlay.add(startButtonGraphics);

    const startHitbox = this.add.rectangle(0, 240, 220, 60, 0xffffff, 0);
    startHitbox.setInteractive({ useHandCursor: true });
    startHitbox.on('pointerover', () => drawStartButton(true));
    startHitbox.on('pointerout', () => drawStartButton(false));
    startHitbox.on('pointerdown', () => startGame());
    startOverlay.add(startHitbox);

    const startButtonText = this.add.text(0, 250, '🚀 BEGIN SHIFT', {
        fontSize: '24px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    startOverlay.add(startButtonText);
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
    engagementText.setText(Math.floor(engagement).toString());
    stabilityText.setText(Math.floor(stability) + '%');
    phaseText.setText((currentPhase + 1) + ' / 10');

    // Update timer (countdown from 10:00)
    const remainingMs = Math.max(0, GAME_DURATION - gameTimer);
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    timerText.setText(minutes + ':' + seconds.toString().padStart(2, '0'));

    // Color stability based on value
    if (stability > 66) {
        stabilityText.setFill('#00ff88');
    } else if (stability > 33) {
        stabilityText.setFill('#ffaa00');
    } else {
        stabilityText.setFill('#ff4444');
    }
}

function spawnPostPair(scene) {
    const postA = generatePost();
    const postB = generatePost();

    // Create container for the pair
    const container = scene.add.container(-200, 360);

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
    const algoChoice = postA.engagement >= postB.engagement ? cardA : cardB;
    const algoIndicator = scene.add.text(70, -40, '🤖', {
        fontSize: '18px',
        fill: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 4, y: 2 }
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
    const cardColor = getTypeColor(post.type);

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

    // Post type with emoji
    const typeEmoji = getTypeEmoji(post.type);
    const typeText = scene.add.text(0, -15, typeEmoji + ' ' + post.type.toUpperCase(), {
        fontSize: '14px',
        fill: '#fff',
        fontStyle: 'bold'
    });
    typeText.setOrigin(0.5);
    container.add(typeText);

    // Stats with icons
    const engText = scene.add.text(0, 12, '📈 +' + post.engagement, {
        fontSize: '17px',
        fill: '#7dffb3',
        fontStyle: 'bold'
    });
    engText.setOrigin(0.5);
    container.add(engText);

    const stabColor = post.stability < 0 ? '#ff7675' : '#74b9ff';
    const stabSign = post.stability >= 0 ? '+' : '';
    const stabText = scene.add.text(0, 35, '⚖️ ' + stabSign + post.stability, {
        fontSize: '17px',
        fill: stabColor,
        fontStyle: 'bold'
    });
    stabText.setOrigin(0.5);
    container.add(stabText);

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

function getTypeEmoji(type) {
    const emojis = {
        'neutral': '📰',
        'positive': '✨',
        'viral': '🔥',
        'controversial': '⚡',
        'fake news': '🚨'
    };
    return emojis[type] || '📰';
}

function generatePost() {
    const types = [
        { type: 'neutral', engagement: 5, stability: 2, weight: 30 },
        { type: 'positive', engagement: 15, stability: 1, weight: 25 },
        { type: 'viral', engagement: 40, stability: 0, weight: 5 },
        { type: 'controversial', engagement: 35, stability: -5, weight: 25 },
        { type: 'fake news', engagement: 50, stability: -15, weight: 15 }
    ];

    // Weighted random selection
    const totalWeight = types.reduce((sum, t) => sum + t.weight, 0);
    let random = Math.random() * totalWeight;

    for (const t of types) {
        random -= t.weight;
        if (random <= 0) {
            // Add some randomness to values
            return {
                type: t.type,
                engagement: t.engagement + Math.floor(Math.random() * 10) - 5,
                stability: t.stability + Math.floor(Math.random() * 4) - 2,
                valid: t.type !== 'fake news' || Math.random() > 0.8 // fake news is usually invalid
            };
        }
    }

    return types[0]; // fallback
}

function getTypeColor(type) {
    const colors = {
        'neutral': 0x636e72,
        'positive': 0x00b894,
        'viral': 0xa29bfe,
        'controversial': 0xfdcb6e,
        'fake news': 0xff7675
    };
    return colors[type] || 0x636e72;
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
            engagement += post.engagement;
            stability += post.stability;
            pair.resolved = true;
            container.resolved = true; // Prevent pointerout from redrawing
            flashCard(container, 0x00ff88);
            updateFeed(post, postLabel, 'YOU');
            break;

        case 'suppress':
            if (post.valid) {
                // Suppressing valid content causes backlash
                stability -= 10;
                flashCard(container, 0xff4444);
            } else {
                // Suppressing invalid content is good
                stability += 5;
                flashCard(container, 0x00ff88);
            }
            pair.resolved = true;
            container.resolved = true; // Prevent pointerout from redrawing
            break;

        case 'verify':
            // Reveal validity (simplified for prototype)
            flashCard(container, post.valid ? 0x00ff88 : 0xff4444);
            break;
    }

    // Clamp stability
    stability = Math.max(0, Math.min(100, stability));

    // Clear selection
    selectedPost = null;
}

function flashCard(container, color) {
    if (container.bg && container.cardWidth) {
        // Redraw the card with the flash color
        redrawCard(container.bg, container.cardWidth, container.cardHeight, container.cornerRadius, color, false);
    }
}

function algorithmDecides(pair) {
    if (pair.resolved) return;

    // Algorithm always picks higher engagement
    const chosenIsA = pair.postA.engagement >= pair.postB.engagement;
    const chosen = chosenIsA ? pair.postA : pair.postB;
    const chosenLabel = chosenIsA ? 'A' : 'B';

    engagement += chosen.engagement;
    stability += chosen.stability;

    // Clamp stability
    stability = Math.max(0, Math.min(100, stability));

    // Update feed display
    updateFeed(chosen, chosenLabel, 'ALGORITHM');
}

function updateFeed(post, label, source) {
    // Update feed type with post label and color based on content type
    feedTypeText.setText(`Post ${label}: ${post.type.toUpperCase()}`);
    feedTypeText.setFill(getTypeColorHex(post.type));

    // Show engagement change
    const engSign = post.engagement >= 0 ? '+' : '';
    feedEngText.setText(`ENG: ${engSign}${post.engagement}`);
    feedEngText.setFill(post.engagement >= 0 ? '#00ff88' : '#ff4444');

    // Show stability change
    const stabSign = post.stability >= 0 ? '+' : '';
    feedStabText.setText(`STAB: ${stabSign}${post.stability}`);
    feedStabText.setFill(post.stability >= 0 ? '#00ff88' : '#ff4444');

    // Show who made the decision
    feedSourceText.setText(`by ${source}`);
    feedSourceText.setFill(source === 'ALGORITHM' ? '#ff6666' : '#66ff66');
}

function triggerGameOver(title, reason) {
    gameOver = true;
    gameOverReason = reason;

    // Update game over overlay
    gameOverText.setText(title);
    gameOverText.setFill(title === 'TERM COMPLETED' ? '#00ff88' : '#ff4444');
    gameOverSubtext.setText(reason);
    finalStatsText.setText(`Final Engagement: ${Math.floor(engagement)}\nFinal Stability: ${Math.floor(stability)}%\nPhase Reached: ${currentPhase + 1}/10`);

    gameOverOverlay.setVisible(true);
}

function getTypeColorHex(type) {
    const colors = {
        'neutral': '#4a5568',
        'positive': '#48bb78',
        'viral': '#9f7aea',
        'controversial': '#ed8936',
        'fake news': '#e53e3e'
    };
    return colors[type] || '#4a5568';
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

    // Reset UI
    engagementText.setText('0');
    stabilityText.setText('100%');
    stabilityText.setFill('#00ff88');
    phaseText.setText('1 / 10');
    timerText.setText('10:00');
    feedTypeText.setText('—');
    feedTypeText.setFill('#888');
    feedEngText.setText('');
    feedStabText.setText('');
    feedSourceText.setText('');

    // Hide game over, show start screen
    gameOverOverlay.setVisible(false);
    startOverlay.setVisible(true);
    gameStarted = false;
}
