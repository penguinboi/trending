# 🔥 TRENDING 🔥

*The world sees what you choose to show.*

A content moderation simulation game for **Pirate Software Game Jam 18**.

## 🎮 Play the Game

**Theme:** "The World is Watching"

You are a Content Moderator at *Wildfire Social*, a major social media platform. An AI algorithm runs the feed, always promoting whatever drives the most engagement - even if it destabilizes society. You're the human in the loop. Can you survive your 10-minute shift without society collapsing?

## 🕹️ How to Play

- **Click** a post card to select it
- **[P] Promote** - Push content to the feed (1.25x impact bonus!)
- **[S] Suppress** - Block content (escalating backlash if it wasn't fake news!)
- **[V] Verify** - Check if content is real or fake (takes 2 seconds!)

If you don't act, the algorithm decides for you - and it always chooses maximum engagement.

## 📊 Reaction Types

Posts show their **engagement value** (visible) and **reaction type** (visible). Stability impact is hidden!

| Reaction | Emoji | Stability | Fake News Risk |
|----------|-------|-----------|----------------|
| Love | ❤️ | +3 (Most stabilizing) | Very low (5%) |
| Haha | 😂 | +2 (Stabilizing) | Low (15%) |
| Like | 👍 | +1 (Slightly stabilizing) | Low (10%) |
| Wow | 😮 | -1 (Slightly destabilizing) | Moderate (25%) |
| Sad | 😢 | -2 (Destabilizing) | Moderate (20%) |
| Angry | 😡 | -3 (Most destabilizing) | High (40%) |

**Tip:** Fake news inverts positive stability and doubles negative stability when promoted!

## 🏆 Win/Lose Conditions

- **Win:** Survive all 10 phases with stability > 0%
- **Lose:** Stability drops to 0% (Societal Collapse)

## 🛠️ Local Development

```bash
# Start local server
python3 -m http.server 8080

# Open in browser
open http://localhost:8080
```

## 📁 Project Structure

```
trending/
├── index.html      # Entry point
├── css/
│   └── style.css   # Base styles
├── js/
│   └── game.js     # Main game code (Phaser 3)
└── assets/
    ├── images/
    └── audio/
```

## 🎯 Game Jam Info

- **Jam:** Pirate Software Game Jam 18
- **Theme:** "The World is Watching"
- **Deadline:** January 31st, 2026 at 6:00 AM
- **Jam Page:** https://itch.io/jam/pirate

## 📜 License

Made for Pirate Software Game Jam 18. All code is original.
