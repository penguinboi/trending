// ABOUTME: Main game entry point for Trending
// ABOUTME: Sets up Phaser 3 game with conveyor belt queue system

const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
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

// Game state
let postPairs = [];
let beltSpeed = PHASE_SPEEDS[0];
let spawnTimer = 0;
let engagement = 0;
let stability = 100;
let selectedPost = null;

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

function create() {
    // Game title
    this.add.text(640, 25, 'TRENDING', {
        fontSize: '48px',
        fill: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);

    // Tagline
    this.add.text(640, 60, 'The world sees what you choose to show', {
        fontSize: '16px',
        fill: '#6a6a8a',
        fontStyle: 'italic'
    }).setOrigin(0.5);

    // Decision zone (right side of screen)
    decisionZone = this.add.rectangle(1100, 360, 200, 600, 0x2d2d4a, 0.3);
    decisionZone.setStrokeStyle(2, 0x4a4a6a);

    // Decision zone label
    this.add.text(1100, 80, 'DECISION\nZONE', {
        fontSize: '16px',
        fill: '#6a6a8a',
        align: 'center'
    }).setOrigin(0.5);

    // Belt track
    this.add.rectangle(640, 360, 1200, 300, 0x0f0f1a, 0.5);

    // Belt lines (visual guides)
    for (let i = 0; i < 12; i++) {
        this.add.line(0, 0, i * 100, 220, i * 100, 500, 0x2a2a3a).setOrigin(0);
    }

    // UI: Engagement meter
    this.add.text(20, 20, 'User Engagement', { fontSize: '14px', fill: '#888' });
    engagementText = this.add.text(20, 40, '0', { fontSize: '28px', fill: '#00ff88' });

    // UI: Stability meter
    this.add.text(20, 70, 'Global Stability', { fontSize: '14px', fill: '#888' });
    stabilityText = this.add.text(20, 88, '100%', { fontSize: '24px', fill: '#ffaa00' });

    // UI: Phase indicator
    this.add.text(20, 120, 'Phase', { fontSize: '14px', fill: '#888' });
    phaseText = this.add.text(20, 138, '1 / 10', { fontSize: '24px', fill: '#aa88ff' });

    // UI: Timer
    this.add.text(20, 170, 'Time Left in Term', { fontSize: '14px', fill: '#888' });
    timerText = this.add.text(20, 188, '10:00', { fontSize: '24px', fill: '#ffffff' });

    // UI: Instructions
    this.add.text(640, 680, 'Click a post in the Decision Zone to select it. Press [P] Promote | [S] Suppress | [V] Verify', {
        fontSize: '14px',
        fill: '#6a6a8a',
        align: 'center'
    }).setOrigin(0.5);

    // Input handlers
    this.input.keyboard.on('keydown-P', () => handleAction('promote'));
    this.input.keyboard.on('keydown-S', () => handleAction('suppress'));
    this.input.keyboard.on('keydown-V', () => handleAction('verify'));

    // Spawn initial post pair
    spawnPostPair(this);
}

function update(time, delta) {
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
            const pulse = 0.5 + 0.5 * Math.sin(gameTimer / 100);
            pair.cardA.bg.setStrokeStyle(4, 0xff6600, pulse);
            pair.cardB.bg.setStrokeStyle(4, 0xff6600, pulse);
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
    const vs = scene.add.text(0, 0, 'VS', { fontSize: '20px', fill: '#4a4a6a', fontStyle: 'bold' });
    vs.setOrigin(0.5);
    container.add(vs);

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

    // Card background
    const bg = scene.add.rectangle(0, 0, 180, 120, getTypeColor(post.type), 0.8);
    bg.setStrokeStyle(2, 0xffffff, 0.3);
    container.add(bg);

    // Post label (A or B)
    const labelText = scene.add.text(-70, -45, 'Post ' + label, { fontSize: '14px', fill: '#fff', fontStyle: 'bold' });
    container.add(labelText);

    // Post type
    const typeText = scene.add.text(0, -25, post.type.toUpperCase(), { fontSize: '12px', fill: '#fff' });
    typeText.setOrigin(0.5);
    container.add(typeText);

    // Expected engagement
    const engText = scene.add.text(0, 5, 'ENG: +' + post.engagement, { fontSize: '14px', fill: '#00ff88' });
    engText.setOrigin(0.5);
    container.add(engText);

    // Expected instability
    const stabText = scene.add.text(0, 25, 'STAB: ' + post.stability, { fontSize: '14px', fill: post.stability < 0 ? '#ff4444' : '#ffaa00' });
    stabText.setOrigin(0.5);
    container.add(stabText);

    // Make interactive
    bg.setInteractive();
    bg.on('pointerdown', () => selectPost(post, container, bg));
    bg.on('pointerover', () => bg.setStrokeStyle(3, 0xffffff, 0.8));
    bg.on('pointerout', () => {
        if (selectedPost !== post) {
            bg.setStrokeStyle(2, 0xffffff, 0.3);
        }
    });

    // Store reference
    container.postData = post;
    container.bg = bg;

    return container;
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
        'neutral': 0x4a5568,
        'positive': 0x48bb78,
        'viral': 0x9f7aea,
        'controversial': 0xed8936,
        'fake news': 0xe53e3e
    };
    return colors[type] || 0x4a5568;
}

function selectPost(post, container, bg) {
    // Deselect previous
    if (selectedPost && selectedPost.bg) {
        selectedPost.bg.setStrokeStyle(2, 0xffffff, 0.3);
    }

    selectedPost = { post, container, bg };
    bg.setStrokeStyle(4, 0x00ffff, 1);
}

function handleAction(action) {
    if (!selectedPost) return;

    const { post, container } = selectedPost;

    // Find the pair this post belongs to
    const pair = postPairs.find(p =>
        p.postA === post || p.postB === post
    );

    if (!pair || pair.resolved) return;

    switch (action) {
        case 'promote':
            engagement += post.engagement;
            stability += post.stability;
            pair.resolved = true;
            flashCard(container, 0x00ff88);
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
    if (container.bg) {
        container.bg.setFillStyle(color, 1);
        // Reset after flash (would use tween in full implementation)
    }
}

function algorithmDecides(pair) {
    if (pair.resolved) return;

    // Algorithm always picks higher engagement
    const chosen = pair.postA.engagement >= pair.postB.engagement ? pair.postA : pair.postB;

    engagement += chosen.engagement;
    stability += chosen.stability;

    // Clamp stability
    stability = Math.max(0, Math.min(100, stability));

    console.log(`Algorithm chose: ${chosen.type} (+${chosen.engagement} eng, ${chosen.stability} stab)`);
}
