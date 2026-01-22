# 📱 TRENDING 📱

*The world sees what you choose to show.*

A content moderation simulation game for **Pirate Software Game Jam 18**.

## 🎮 Play the Game

**Theme:** "The World is Watching"

You are a Content Moderator at TrendNet, a major social media platform. An AI algorithm runs the feed, always promoting whatever drives the most engagement - even if it destabilizes society. You're the human in the loop. Can you survive your 10-minute shift without society collapsing?

## 🕹️ How to Play

- **Click** a post card to select it
- **[P] Promote** - Push content to the feed (applies engagement/stability effects)
- **[S] Suppress** - Remove content (backlash if it was valid)
- **[V] Verify** - Check if content is real or fake news

If you don't act, the algorithm decides for you - and it always chooses maximum engagement.

## 📊 Content Types

| Type | Emoji | Engagement | Stability |
|------|-------|------------|-----------|
| Neutral | 📰 | Low | Stabilizing |
| Positive | ✨ | Medium | Slight gain |
| Viral | 🔥 | High | Neutral |
| Controversial | ⚡ | High | Destabilizing |
| Fake News | 🚨 | Very High | Heavy damage |

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
