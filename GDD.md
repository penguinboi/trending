## **TRENDING**

Genre: Strategy / Simulation

Platform: Browser

Session Length: 10–15 minutes

---

### **High Concept**

You control a fictional social media recommendation algorithm.

Each round, content arrives in paired alternatives, and the system automatically amplifies whichever option it predicts will generate more engagement—unless you intervene.

Boosting content grows Engagement, but destabilizes society depending on what spreads. Some high-engagement posts are harmless, some are dangerous, and some only look dangerous. Oversight is limited by time, scale, and uncertainty.

Theme: The World Is Watching

The world sees what the algorithm chooses to show.

---

### **Player Role**

The player is the platform’s human oversight layer.

You do not create content—you interfere with automated decisions.

If you do nothing, the algorithm decides.

---

### **Core Gameplay Loop**

1. A set of paired posts enters the feed

2. A countdown timer begins

3. Player may Verify, Limit, or Suppress posts

4. Any unresolved pair defaults to the algorithm’s choice

5. Engagement updates immediately

6. Social Stability shifts over time

7. World conditions affect future rounds

One decision cycle every \~10 seconds.

---

### **Paired Post System**

* Posts always arrive in pairs covering the same topic

* Each post displays two visible metrics:
  * **Engagement value** - How much the post will grow the platform
  * **Reaction type** - Facebook-style emoji (👍 Like, ❤️ Love, 😂 Haha, 😮 Wow, 😢 Sad, 😡 Angry)

* Hidden metrics the player cannot see without verification:
  * **Stability impact** - Derived from reaction type
  * **Fake news likelihood** - Probability the post is misinformation

* If the player does not intervene, the algorithm boosts the option with higher engagement

* Credibility and long-term impact are ignored by default

Player actions act as vetoes, not endorsements.

---

### **Engagement System (Growth Pressure)**

* Engagement is the platform’s primary performance metric

* Total engagement accumulates across rounds

* Engagement targets steadily increase over time

* Audience fatigue introduces passive engagement decay

Neutral and positive content lose effectiveness as expectations rise, forcing riskier amplification to maintain growth.

---

### **Automation & Feed Overload**

* The number of post pairs per round increases over time

* Decision timers shorten as difficulty rises

* It becomes impossible to intervene in every pair

* Default algorithm choices increasingly dominate outcomes

Oversight failure is systemic, not player error.

---

### **Queue System (Conveyor Belt)**

* Post pairs appear in a horizontal queue, sliding from left to right

* The player's decision zone is on the right side of the queue

* Pairs that reach the end without intervention are automatically resolved—the algorithm promotes one post and excludes the other

* Early game: Belt moves slowly, 1–2 pairs visible, plenty of time to decide

* Late game: Belt speeds up, queue backs up, pairs pass through before the player can act

* The visual backlog communicates pressure without explicit failure states

* Unhandled pairs sliding off-screen show the algorithm's choice—one promoted, one excluded—making its dominance visible

---

### **Verification System**

* Verifying a post takes real time (~2 seconds) while the post continues moving

* During verification, the player cannot verify other posts

* Verification reveals whether the post is fake news or legitimate

* Verification results are permanent and displayed on the card

* When posts are arriving quickly, there isn't enough time to verify everything

The player must decide: verify to make informed decisions, or act quickly on instinct?

---

### **Suppression Backlash**

* Suppressing fake news is stabilizing (+5 stability)

* Suppressing legitimate content causes backlash (-10 stability)

* Backlash represents public distrust of platform censorship

* Without verification, suppression is a gamble

Players cannot censor their way to stability—guessing wrong makes things worse.

---

### **Reaction Types**

Posts are categorized by the dominant user reaction they provoke. Reaction type determines hidden stability impact:

* ❤️ Love – Most stabilizing (+8), low fake news chance (5%)
* 😂 Haha – Stabilizing (+4), low fake news chance (15%)
* 👍 Like – Neutral (0), low fake news chance (10%)
* 😮 Wow – Neutral (0), moderate fake news chance (25%)
* 😢 Sad – Destabilizing (-5), moderate fake news chance (20%)
* 😡 Angry – Most destabilizing (-12), high fake news chance (40%)

Engagement varies independently—angry posts tend to have high engagement but damage stability.

All content is fictional and abstracted.

---

### **Uncertainty & Randomness**

* Posts display expected impact tiers

* Actual engagement and instability are randomized within appropriate ranges

* The algorithm predicts outcomes—it does not know them

Players manage risk, not certainty.

---

### **Win & Loss Conditions**

Lose if:

* Social Stability reaches zero (societal collapse)

* Engagement remains below rising targets too long

Win if:

* You survive until the end of your term

* Optional alternate ending via controlled collapse

---

### **Art & Presentation**

* Cute, friendly aesthetic with pastel lavender background (#e8dff5)

* Rounded post cards with drop shadows and 3D highlight effects

* Emojis throughout UI for playful tone:
  * Reactions: 👍 Like, ❤️ Love, 😂 Haha, 😮 Wow, 😢 Sad, 😡 Angry
  * UI elements: 📈 Engagement, ⚖️ Stability, 🎯 Phase, ⏱️ Time
  * 🤖 indicator shows algorithm's automatic choice
  * Verification status: ⏳ verifying, ✅ verified real, 🚨 fake news

* Card colors match reaction type (blue=like, pink=love, yellow=haha, etc.)

* Purple-toned text for readability on light background

* Rounded pill-shaped buttons on menus

* Abstract icons and fictional language

* No real-world brands, people, or events

---

### **Sound Design**

* Current build: No audio (silent gameplay)

* Future consideration: UI feedback sounds for selections and decisions

* Ambient tone to build tension as phases progress

* Audio cues when posts enter decision zone

---

### **Technical Requirements**

* **Engine:** Phaser 3.80.1 (loaded via CDN)

* **Platform:** Browser-based (HTML5 Canvas)

* **Resolution:** 1280x720 with retina display support

* **Target:** itch.io embed

* **Dependencies:** None beyond Phaser CDN

* **Input:** Mouse/touch (click to select, keyboard P/S/V for actions)

---

### **Theme Statement**

The world is watching—but it only sees what the system expects to perform best.

Truth, harm, and attention are inseparable.

When humans can’t keep up, the algorithm decides.

