// ABOUTME: Main game entry point for Trending
// ABOUTME: Sets up Phaser 3 game with conveyor belt queue system

// Detect device pixel ratio for crisp rendering on retina displays
const dpr = window.devicePixelRatio || 1;

const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#a8d4f0',
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
const PHASE_SPEEDS = [24, 36, 52, 72, 96, 124, 156, 192, 232, 280];

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

// Helper to create touch-friendly action button
function createActionButton(scene, x, y, width, height, label, color, callback) {
    const container = scene.add.container(x, y);
    container.setDepth(100);

    const graphics = scene.add.graphics();
    const radius = 12;

    const drawButton = (hover) => {
        graphics.clear();
        // Shadow
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRoundedRect(-width/2 + 3, -height/2 + 3, width, height, radius);
        // Main fill
        graphics.fillStyle(hover ? Phaser.Display.Color.ValueToColor(color).lighten(20).color : color, 1);
        graphics.fillRoundedRect(-width/2, -height/2, width, height, radius);
        // Highlight
        graphics.fillStyle(0xffffff, 0.2);
        graphics.fillRoundedRect(-width/2, -height/2, width, height/3, { tl: radius, tr: radius, bl: 0, br: 0 });
        // Border
        graphics.lineStyle(2, 0xffffff, 0.5);
        graphics.strokeRoundedRect(-width/2, -height/2, width, height, radius);
    };
    drawButton(false);
    container.add(graphics);

    // Invisible hitbox
    const hitbox = scene.add.rectangle(0, 0, width, height, 0xffffff, 0);
    hitbox.setInteractive({ useHandCursor: true });
    hitbox.on('pointerover', () => drawButton(true));
    hitbox.on('pointerout', () => drawButton(false));
    hitbox.on('pointerdown', callback);
    container.add(hitbox);

    // Label (scale font with button height, minimum 16px)
    const fontSize = Math.max(16, Math.round(height * 0.47));
    const text = scene.add.text(0, 0, label, {
        fontSize: fontSize + 'px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(text);

    return container;
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

// Music state
let introMusic = null;
let bgMusic = null;
let gameOverMusic = null;
let musicRate = 1.0;

// Start screen UI
let startOverlay;

// Game over UI
let gameOverOverlay;
let gameOverText;
let gameOverSubtext;
let finalStatsText;
let playAgainButton;

// Confirm restart overlay
let confirmOverlay;

// UI elements
let engagementText;
let stabilityText;
let decisionZone;
let messageText;
let messageTimer = 0;
const MESSAGE_DURATION = 3000; // 3 seconds
let stabilityWarningShown = { 50: false, 33: false, 20: false };

// Action buttons for mobile
let promoteButton;
let suppressButton;
let verifyButton;

// Cheat code state
let cheatBuffer = '';
let godMode = false;
const CHEAT_CODE = 'godmode';
let godModeIndicator;

function preload() {
    this.load.audio('intro', 'assets/audio/intro.ogg');
    this.load.audio('music', 'assets/audio/music.ogg');
    this.load.audio('select', 'assets/audio/select.ogg');
    this.load.audio('promote', 'assets/audio/promote.ogg');
    this.load.audio('suppress', 'assets/audio/suppress.ogg');
    this.load.audio('verify', 'assets/audio/verify.wav');
    this.load.audio('gameover', 'assets/audio/gameover.ogg');
    this.load.audio('victory', 'assets/audio/victory.ogg');
    this.load.audio('phase', 'assets/audio/phase.ogg');
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

    // Message area (contextual feedback to player, where tagline used to be)
    messageText = this.add.text(640, 95, '', {
        fontSize: '18px',
        fill: '#7a6a9a',
        fontStyle: 'bold',
        padding: { x: 4, y: 4 }
    }).setOrigin(0.5).setDepth(100);

    // God mode indicator (hidden by default)
    godModeIndicator = this.add.text(1260, 20, '🔓 GOD MODE', {
        fontSize: '16px',
        fill: '#9b59b6',
        fontStyle: 'bold',
        padding: { x: 4, y: 4 }
    }).setOrigin(1, 0).setDepth(100).setVisible(false);

    // Restart button (upper right, hidden until game starts)
    const restartButton = createActionButton(this, 1100, 30, 200, 44, '🔄 Restart Game', 0x7a6a9a, () => {
        currentScene.sound.play('select', { volume: 0.5 });
        confirmOverlay.setVisible(true);
    });
    restartButton.setDepth(100);
    restartButton.setVisible(false);
    this.restartButton = restartButton;

    // Decision zone (right side of screen)
    decisionZone = this.add.rectangle(1100, 360, 200, 600, 0x2d2d4a, 0.3);
    decisionZone.setStrokeStyle(2, 0x4a4a6a);

    // Decision zone label
    this.add.text(1100, 80, '⚠️ DECISION ZONE ⚠️', {
        fontSize: '16px',
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
    this.add.text(640, 530, '📣 Last Post Promoted to 🔥Wildfire Social Feed 📣', { fontSize: '22px', fill: '#7a6a9a', padding: { x: 4, y: 4 } }).setOrigin(0.5).setDepth(100);

    feedContainer = this.add.container(640, 570);
    feedContainer.setDepth(100);

    feedTypeText = this.add.text(0, 0, '—', {
        fontSize: '22px',
        fill: '#6a5a8a',
        fontStyle: 'bold',
        padding: { x: 4, y: 4 }
    }).setOrigin(0.5);
    feedContainer.add(feedTypeText);

    feedEngText = this.add.text(0, 25, '', { fontSize: '16px', fill: '#228833' }).setOrigin(0.5);
    feedContainer.add(feedEngText);

    feedStabText = this.add.text(0, 45, '', { fontSize: '16px', fill: '#228833' }).setOrigin(0.5);
    feedContainer.add(feedStabText);

    feedSourceText = this.add.text(0, 65, '', { fontSize: '16px', fill: '#666' }).setOrigin(0.5);
    feedContainer.add(feedSourceText);

    feedFakeText = this.add.text(0, 85, '', { fontSize: '16px', fill: '#cc4444', fontStyle: 'bold', padding: { x: 4, y: 4 } }).setOrigin(0.5);
    feedContainer.add(feedFakeText);

    // UI: Suppressed post display (shows last suppressed post and impact)
    this.add.text(150, 530, '🚫 LAST SUPPRESSED 🚫', { fontSize: '22px', fill: '#7a6a9a', padding: { x: 4, y: 4 } }).setOrigin(0.5).setDepth(100);

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
        fontSize: '16px',
        fill: '#228833'
    }).setOrigin(0.5);
    suppressedContainer.add(suppressedImpactText);

    suppressedBacklashText = this.add.text(0, 45, '', {
        fontSize: '16px',
        fill: '#cc4444'
    }).setOrigin(0.5);
    suppressedContainer.add(suppressedBacklashText);

    // UI: Stability guide
    this.add.text(640, 680, 'Estimated Stability Impact: ❤️+++ > 😂++ > 👍+ > 😮- > 😢-- > 😡---', {
        fontSize: '16px',
        fill: '#6a5a8a',
        align: 'center',
        padding: { x: 4, y: 4 }
    }).setOrigin(0.5).setDepth(100);

    // UI: Instructions
    this.add.text(640, 700, '👆 Click to select post | [P] ⬆️ Promote (1.25x Engagement!) | [S] 🚫 Suppress | [V] 🔍 Verify | 🤖 = Algorithm\'s pick', {
        fontSize: '16px',
        fill: '#7a6a9a',
        align: 'center',
        padding: { x: 4, y: 4 }
    }).setOrigin(0.5).setDepth(100);

    // Action buttons (horizontal row centered above belt, 2x size)
    const buttonWidth = 170;
    const buttonHeight = 76;
    const buttonSpacing = 12;
    const buttonY = 160;
    const totalWidth = buttonWidth * 3 + buttonSpacing * 2;
    const startX = (1280 - totalWidth) / 2 + buttonWidth / 2;

    promoteButton = createActionButton(this, startX, buttonY, buttonWidth, buttonHeight, '⬆️ P', 0x27ae60, () => handleAction('promote'));
    suppressButton = createActionButton(this, startX + buttonWidth + buttonSpacing, buttonY, buttonWidth, buttonHeight, '🚫 S', 0xe74c3c, () => handleAction('suppress'));
    verifyButton = createActionButton(this, startX + (buttonWidth + buttonSpacing) * 2, buttonY, buttonWidth, buttonHeight, '🔍 V', 0x3498db, () => handleAction('verify'));

    // Input handlers
    this.input.keyboard.on('keydown-P', () => handleAction('promote'));
    this.input.keyboard.on('keydown-S', () => handleAction('suppress'));
    this.input.keyboard.on('keydown-V', () => handleAction('verify'));

    // Cheat code listener
    this.input.keyboard.on('keydown', (event) => {
        cheatBuffer += event.key.toLowerCase();
        if (cheatBuffer.length > CHEAT_CODE.length) {
            cheatBuffer = cheatBuffer.slice(-CHEAT_CODE.length);
        }
        if (cheatBuffer === CHEAT_CODE) {
            godMode = !godMode;
            cheatBuffer = '';
            godModeIndicator.setVisible(godMode);
            if (godMode) {
                showMessage('🔓 God mode enabled!', '#9b59b6');
            }
        }
    });

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
    playAgainHitbox.on('pointerdown', () => {
        this.sound.play('select', { volume: 0.5 });
        resetGame();
    });
    gameOverOverlay.add(playAgainHitbox);

    playAgainButton = this.add.text(0, 160, '🔄 PLAY AGAIN 🎮', {
        fontSize: '22px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    gameOverOverlay.add(playAgainButton);

    // Confirm restart overlay (hidden initially)
    confirmOverlay = this.add.container(640, 360);
    confirmOverlay.setDepth(1002);
    confirmOverlay.setVisible(false);

    const confirmBg = this.add.rectangle(0, 0, 1280, 720, 0x000000, 0.7);
    confirmOverlay.add(confirmBg);

    const confirmBox = this.add.graphics();
    confirmBox.fillStyle(0x3d3d5c, 1);
    confirmBox.fillRoundedRect(-200, -100, 400, 200, 20);
    confirmBox.lineStyle(3, 0x7a6a9a, 1);
    confirmBox.strokeRoundedRect(-200, -100, 400, 200, 20);
    confirmOverlay.add(confirmBox);

    const confirmText = this.add.text(0, -50, 'Restart Game?', {
        fontSize: '32px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    confirmOverlay.add(confirmText);

    // Yes button
    const yesButtonGraphics = this.add.graphics();
    const drawYesButton = (hover) => {
        yesButtonGraphics.clear();
        yesButtonGraphics.fillStyle(hover ? 0x2ecc71 : 0x27ae60, 1);
        yesButtonGraphics.fillRoundedRect(-150, 10, 120, 50, 12);
        yesButtonGraphics.lineStyle(2, 0xffffff, 0.5);
        yesButtonGraphics.strokeRoundedRect(-150, 10, 120, 50, 12);
    };
    drawYesButton(false);
    confirmOverlay.add(yesButtonGraphics);

    const yesHitbox = this.add.rectangle(-90, 35, 120, 50, 0xffffff, 0);
    yesHitbox.setInteractive({ useHandCursor: true });
    yesHitbox.on('pointerover', () => drawYesButton(true));
    yesHitbox.on('pointerout', () => drawYesButton(false));
    yesHitbox.on('pointerdown', () => {
        this.sound.play('select', { volume: 0.5 });
        confirmOverlay.setVisible(false);
        resetGame();
    });
    confirmOverlay.add(yesHitbox);

    const yesText = this.add.text(-90, 35, 'Yes', {
        fontSize: '22px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    confirmOverlay.add(yesText);

    // No button
    const noButtonGraphics = this.add.graphics();
    const drawNoButton = (hover) => {
        noButtonGraphics.clear();
        noButtonGraphics.fillStyle(hover ? 0xe74c3c : 0xc0392b, 1);
        noButtonGraphics.fillRoundedRect(30, 10, 120, 50, 12);
        noButtonGraphics.lineStyle(2, 0xffffff, 0.5);
        noButtonGraphics.strokeRoundedRect(30, 10, 120, 50, 12);
    };
    drawNoButton(false);
    confirmOverlay.add(noButtonGraphics);

    const noHitbox = this.add.rectangle(90, 35, 120, 50, 0xffffff, 0);
    noHitbox.setInteractive({ useHandCursor: true });
    noHitbox.on('pointerover', () => drawNoButton(true));
    noHitbox.on('pointerout', () => drawNoButton(false));
    noHitbox.on('pointerdown', () => {
        this.sound.play('select', { volume: 0.5 });
        confirmOverlay.setVisible(false);
    });
    confirmOverlay.add(noHitbox);

    const noText = this.add.text(90, 35, 'No', {
        fontSize: '22px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    confirmOverlay.add(noText);

    // Start screen overlay (high depth, shown initially)
    startOverlay = this.add.container(640, 360);
    startOverlay.setDepth(1001);

    const startBg = this.add.rectangle(0, 0, 1280, 720, 0xa8d4f0, 1);
    startOverlay.add(startBg);

    const startTitle = createFireTitle(this, 0, -290, 79);
    startOverlay.add(startTitle);

    const startSubtitle = this.add.text(0, -210, 'The Content Moderator Game', {
        fontSize: '22px',
        fill: '#7a6a9a',
        fontStyle: 'italic'
    }).setOrigin(0.5);
    startOverlay.add(startSubtitle);

    // Intro paragraphs shown one at a time
    const introParagraphs = [
        'Welcome to your first day as\nContent Moderator at',
        '🤖 Our algorithm maximizes engagement.\nIt promotes whatever gets clicks —\nviral content, controversy, even misinformation.',
        'Your job is to be the human in the loop.\nReview content before it trends.\nPromote truth. Suppress fake news.',
        'But be careful — suppress too much\nvalid content and users will revolt!',
        'Our investors want more growth.\nSociety needs stability.\nYou have 10 minutes to balance both.',
        '🌍 The world is watching. 👀'
    ];

    let currentParagraph = 0;

    const introText = this.add.text(0, -20, introParagraphs[0], {
        fontSize: '32px',
        fill: '#4a4a6a',
        align: 'center',
        lineSpacing: 12
    }).setOrigin(0.5);
    startOverlay.add(introText);

    // Wildfire Social™ branding (fire gradient, shows only on first paragraph)
    const wildfireContainer = this.add.container(0, 70);
    startOverlay.add(wildfireContainer);

    const wildfireLetters = 'Wildfire Social'.split('');
    const fireColors = ['#FFD700', '#FFCC00', '#FFB300', '#FF9900', '#FF7700', '#FF5500', '#FF3300', '#FF0000', '#FF3300', '#FF5500', '#FF7700', '#FF9900', '#FFB300', '#FFCC00', '#FFD700'];
    const wfLetterSpacing = 26;
    const wfTotalWidth = wildfireLetters.length * wfLetterSpacing;
    const wfStartX = -wfTotalWidth / 2 + wfLetterSpacing / 2;

    wildfireLetters.forEach((letter, i) => {
        const letterText = this.add.text(wfStartX + i * wfLetterSpacing, 0, letter, {
            fontSize: '40px',
            fill: fireColors[i % fireColors.length],
            fontStyle: 'bold italic'
        }).setOrigin(0.5);
        wildfireContainer.add(letterText);
    });

    const tmText = this.add.text(wfStartX + wildfireLetters.length * wfLetterSpacing + 10, -15, '™', {
        fontSize: '40px',
        fill: '#FF5500',
        fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    wildfireContainer.add(tmText);

    // Next button
    const nextButtonY = 180;
    const nextButtonGraphics = this.add.graphics();
    const drawNextButton = (hover) => {
        nextButtonGraphics.clear();
        nextButtonGraphics.fillStyle(0x000000, 0.3);
        nextButtonGraphics.fillRoundedRect(-100 + 4, nextButtonY - 30 + 4, 200, 60, 30);
        nextButtonGraphics.fillStyle(hover ? 0x7a6a9a : 0x5a4a7a, 1);
        nextButtonGraphics.fillRoundedRect(-100, nextButtonY - 30, 200, 60, 30);
        nextButtonGraphics.lineStyle(3, 0xffffff, 0.7);
        nextButtonGraphics.strokeRoundedRect(-100, nextButtonY - 30, 200, 60, 30);
    };
    drawNextButton(false);
    startOverlay.add(nextButtonGraphics);

    const nextHitbox = this.add.rectangle(0, nextButtonY, 200, 60, 0xffffff, 0);
    nextHitbox.setInteractive({ useHandCursor: true });
    nextHitbox.on('pointerover', () => drawNextButton(true));
    nextHitbox.on('pointerout', () => drawNextButton(false));
    startOverlay.add(nextHitbox);

    const nextButtonText = this.add.text(0, nextButtonY, 'NEXT ➡️', {
        fontSize: '22px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    startOverlay.add(nextButtonText);

    // Start button (hidden initially)
    const startButtonY = 180;
    const startButtonGraphics = this.add.graphics();
    const drawStartButton = (hover) => {
        startButtonGraphics.clear();
        startButtonGraphics.fillStyle(0x000000, 0.3);
        startButtonGraphics.fillRoundedRect(-130 + 4, startButtonY - 35 + 4, 260, 70, 35);
        startButtonGraphics.fillStyle(hover ? 0x00d2d3 : 0x00b894, 1);
        startButtonGraphics.fillRoundedRect(-130, startButtonY - 35, 260, 70, 35);
        startButtonGraphics.fillStyle(0xffffff, 0.2);
        startButtonGraphics.fillRoundedRect(-130, startButtonY - 35, 260, 30, { tl: 35, tr: 35, bl: 0, br: 0 });
        startButtonGraphics.lineStyle(3, 0xffffff, 0.7);
        startButtonGraphics.strokeRoundedRect(-130, startButtonY - 35, 260, 70, 35);
    };
    startButtonGraphics.setVisible(false);
    startOverlay.add(startButtonGraphics);

    const startHitbox = this.add.rectangle(0, startButtonY, 260, 70, 0xffffff, 0);
    startHitbox.setInteractive({ useHandCursor: true });
    startHitbox.on('pointerover', () => drawStartButton(true));
    startHitbox.on('pointerout', () => drawStartButton(false));
    startHitbox.on('pointerdown', () => {
        this.sound.play('select', { volume: 0.5 });
        startGame();
    });
    startHitbox.setVisible(false);
    startOverlay.add(startHitbox);

    const startButtonText = this.add.text(-8, startButtonY, '🚀 BEGIN SHIFT', {
        fontSize: '24px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    startButtonText.setVisible(false);
    startOverlay.add(startButtonText);

    // Next button click handler
    nextHitbox.on('pointerdown', () => {
        this.sound.play('select', { volume: 0.5 });
        currentParagraph++;
        if (currentParagraph < introParagraphs.length) {
            introText.setText(introParagraphs[currentParagraph]);
        }
        // Hide Wildfire Social branding after first paragraph
        if (currentParagraph === 1) {
            wildfireContainer.setVisible(false);
            introText.setY(0);
        }
        if (currentParagraph >= introParagraphs.length - 1) {
            // Hide next button, show start button
            nextButtonGraphics.setVisible(false);
            nextHitbox.setVisible(false);
            nextButtonText.setVisible(false);
            startButtonGraphics.setVisible(true);
            drawStartButton(false);
            startHitbox.setVisible(true);
            startButtonText.setVisible(true);
        }
    });

    const copyrightText = this.add.text(0, 320, '© 2026 🐧 PenguinboiSoftware', {
        fontSize: '16px',
        fill: '#8a7aaa'
    }).setOrigin(0.5);
    startOverlay.add(copyrightText);

    const musicCredit = this.add.text(0, 340, '🎵 Music by Not Jam | 🔊 SFX by JDSherbert & Kevin Fowler', {
        fontSize: '16px',
        fill: '#8a7aaa'
    }).setOrigin(0.5);
    startOverlay.add(musicCredit);

    // Start intro music (requires user interaction due to browser autoplay policy)
    introMusic = this.sound.add('intro', { volume: 0.5, loop: true });
    const startIntroMusic = () => {
        if (introMusic && !introMusic.isPlaying && !gameStarted) {
            introMusic.play();
        }
        document.removeEventListener('click', startIntroMusic);
        document.removeEventListener('touchstart', startIntroMusic);
    };
    document.addEventListener('click', startIntroMusic);
    document.addEventListener('touchstart', startIntroMusic);
}

function update(time, delta) {
    // Don't run game logic until started
    if (!gameStarted) return;

    // Check for game over
    if (gameOver) return;

    // Check loss conditions (skip if god mode enabled)
    if (stability <= 0 && !godMode) {
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
        // Play phase sound and show banner
        currentScene.sound.play('phase', { volume: 0.5 });
        showPhaseBanner(currentPhase + 1);
        // Show phase change message
        if (currentPhase >= 7) {
            showMessage(`⚡ Phase ${currentPhase + 1}! Content is flooding in!`, '#cc4444');
        } else if (currentPhase >= 4) {
            showMessage(`🎯 Phase ${currentPhase + 1} - Speed increasing!`, '#cc8800');
        } else {
            showMessage(`🎯 Phase ${currentPhase + 1} begins.`, '#5a3d7a');
        }
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
                // Redraw cards with warning border (use grey for suppressed posts)
                const colorA = pair.postA.suppressed ? 0x666666 : pair.cardA.cardColor;
                const colorB = pair.postB.suppressed ? 0x666666 : pair.cardB.cardColor;
                redrawCardWarning(pair.cardA.bg, pair.cardA.cardWidth, pair.cardA.cardHeight, pair.cardA.cornerRadius, colorA);
                redrawCardWarning(pair.cardB.bg, pair.cardB.cardWidth, pair.cardB.cardHeight, pair.cardB.cornerRadius, colorB);
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

    // Stability threshold warnings
    if (stability <= 20 && !stabilityWarningShown[20]) {
        showMessage('🔥 CRITICAL! Society is fracturing!', '#cc4444');
        stabilityWarningShown[20] = true;
    } else if (stability <= 33 && !stabilityWarningShown[33]) {
        showMessage('😰 Stability critical! Be careful!', '#cc4444');
        stabilityWarningShown[33] = true;
    } else if (stability <= 50 && !stabilityWarningShown[50]) {
        showMessage('📉 Stability dropping. Watch the reactions.', '#cc8800');
        stabilityWarningShown[50] = true;
    }

    // Update message timer (fade out)
    if (messageTimer > 0) {
        messageTimer -= delta;
        if (messageTimer <= 0) {
            messageText.setAlpha(0);
        } else if (messageTimer < 1000) {
            messageText.setAlpha(messageTimer / 1000);
        }
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
                    container.verifyText.setText('🚨 FAKE');
                    container.verifyText.setBackgroundColor('#cc0000');
                } else {
                    container.verifyText.setText('✅ REAL');
                    container.verifyText.setBackgroundColor('#228833');
                }
            }

            verifyingPost = null;
            verifyTimer = 0;
        }
    }
}

function spawnPostPair(scene, startX = -200) {
    const postA = generatePost();
    const postB = generatePost();

    // Create container for the pair (depth 10 keeps posts below UI)
    const container = scene.add.container(startX, 360);
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
        fontSize: '54px',
        padding: { x: 4, y: 4 }
    });
    algoIndicator.setOrigin(0.5);
    algoChoice.add(algoIndicator);

    const pair = {
        x: startX,
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
        fontSize: '16px',
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

    // Verification status (hidden until verified, large banner almost filling card)
    const verifyText = scene.add.text(0, 0, '', {
        fontSize: '28px',
        fill: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#000000dd',
        padding: { x: 20, y: 15 }
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
        graphics.lineStyle(10, 0xFFFF00, 1);
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
    // Play select sound
    currentScene.sound.play('select', { volume: 0.5 });

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
            // Play promote sound
            currentScene.sound.play('promote', { volume: 0.5 });
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
            // Add large up arrow over the post
            const checkSign = container.scene.add.text(0, 0, '⬆️', {
                fontSize: '80px',
                padding: { left: 20, right: 20, top: 20, bottom: 20 }
            }).setOrigin(0.5);
            container.add(checkSign);
            updateFeed(post, postLabel, 'YOU', stabEffect, engEffect, originalStab);
            // Show message based on outcome
            if (post.isFakeNews) {
                showMessage('🚨 You promoted fake news!', '#cc4444');
            } else if (stabEffect >= 2) {
                showMessage('✨ Great choice! Stability increased.', '#228833');
            }
            break;

        case 'suppress':
            // Play suppress sound
            currentScene.sound.play('suppress', { volume: 0.5 });
            let suppressImpact;
            if (!post.isFakeNews) {
                // Suppressing real content causes escalating backlash
                suppressionBacklash++;
                suppressImpact = -suppressionBacklash; // -1, -2, -3, etc.
                stability += suppressImpact;
                flashCard(container, 0xff4444);
                showMessage(`⚠️ Censorship backlash! That was real content. (${suppressImpact})`, '#cc4444');
            } else {
                // Suppressing fake news is good
                suppressImpact = 1;
                stability += suppressImpact;
                flashCard(container, 0x00ff88);
                showMessage('✅ Fake news blocked! Good call.', '#228833');
            }
            // Update suppressed post display
            updateSuppressedDisplay(post, suppressImpact);
            // Mark post as suppressed (algorithm will choose the other post)
            post.suppressed = true;
            container.resolved = true;
            // Grey out the suppressed card
            redrawCard(container.bg, container.cardWidth, container.cardHeight, container.cornerRadius, 0x666666, false);
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
                // Play verify sound
                currentScene.sound.play('verify', { volume: 0.4 });
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

    // Show message for algorithm decisions
    if (chosen.isFakeNews) {
        showMessage('🚨 Algorithm promoted fake news!', '#cc4444');
    } else if (stabEffect <= -2) {
        showMessage('📉 Algorithm spread destabilizing content.', '#cc8800');
    }
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
        feedStabText.setText(`Stability: ${origSign}${origStab} → ${stabSign}${stabEffect} 🚨 Fake News Penalty`);
    } else {
        feedStabText.setText(`Stability: ${stabSign}${stabEffect}`);
    }
    feedStabText.setFill(stabEffect >= 0 ? '#228833' : '#cc4444');

    // Show who made the decision
    feedSourceText.setText(`by ${source}`);
    feedSourceText.setFill(source === 'ALGORITHM' ? '#cc4444' : '#228833');

    // Show fake news status
    if (post.isFakeNews) {
        feedFakeText.setText('🚨 FAKE');
        feedFakeText.setFill('#cc4444');
    } else {
        feedFakeText.setText('✅ REAL');
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

    // Stop game music
    if (bgMusic) {
        bgMusic.stop();
    }

    // Play game over music
    if (title.includes('COLLAPSE')) {
        gameOverMusic = currentScene.sound.add('gameover', { volume: 0.5 });
        gameOverMusic.play();
    } else if (title.includes('COMPLETED')) {
        gameOverMusic = currentScene.sound.add('victory', { volume: 0.5 });
        gameOverMusic.play();
    }

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

function showMessage(text, color) {
    messageText.setText(text);
    messageText.setFill(color || '#cc4444');
    messageText.setAlpha(1);
    messageTimer = MESSAGE_DURATION;
}

function showPhaseBanner(phaseNum) {
    // Create large banner in center of screen
    const banner = currentScene.add.container(640, 360);
    banner.setDepth(500);

    const bg = currentScene.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRoundedRect(-200, -60, 400, 120, 20);
    banner.add(bg);

    const text = currentScene.add.text(0, 0, `PHASE ${phaseNum}`, {
        fontSize: '64px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    banner.add(text);

    // Fade out after 0.5 seconds
    currentScene.tweens.add({
        targets: banner,
        alpha: 0,
        duration: 200,
        delay: 300,
        onComplete: () => banner.destroy()
    });
}

function startGame() {
    gameStarted = true;
    startOverlay.setVisible(false);
    currentScene.restartButton.setVisible(true);
    // Stop intro music
    if (introMusic) {
        introMusic.stop();
    }
    // Start background music at 80% speed, speeds up 10% each loop
    musicRate = 0.8;
    bgMusic = currentScene.sound.add('music', { volume: 0.5 });
    bgMusic.on('complete', () => {
        musicRate *= 1.1;
        bgMusic.play({ rate: musicRate });
    });
    bgMusic.play({ rate: musicRate });
    // Start first pair one CARD_CLEARANCE ahead of spawn point
    spawnPostPair(currentScene, -200 + CARD_CLEARANCE);
    // Trigger immediate spawn of second pair to maintain proper spacing
    spawnTimer = getSpawnInterval();
    // Show tagline first, then welcome message
    showMessage('🌍 Choose what the world sees 👀', '#7a6a9a');
    setTimeout(() => {
        showMessage('👋 Welcome, new moderator! Good luck.', '#5a3d7a');
    }, MESSAGE_DURATION);
}

function resetGame() {
    // Stop game music and game over music, restart intro music
    if (bgMusic) {
        bgMusic.stop();
        bgMusic = null;
    }
    if (gameOverMusic) {
        gameOverMusic.stop();
        gameOverMusic = null;
    }
    if (introMusic) {
        introMusic.play();
    }

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
    stabilityWarningShown = { 50: false, 33: false, 20: false };
    messageTimer = 0;
    cheatBuffer = '';
    godMode = false;
    godModeIndicator.setVisible(false);

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
    messageText.setText('');
    messageText.setAlpha(0);

    // Hide game over, show start screen
    gameOverOverlay.setVisible(false);
    startOverlay.setVisible(true);
    currentScene.restartButton.setVisible(false);
    gameStarted = false;
}
