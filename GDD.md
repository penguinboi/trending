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

3. Player may Verify, Promote, or Suppress posts

4. Any unresolved pair defaults to the algorithm’s choice

5. Engagement updates immediately

6. Social Stability shifts over time

7. World conditions affect future rounds (NOT IMPLEMENTED)

Decision cycles vary by phase (~9s in phase 1, ~0.8s in phase 10).

---

### **Paired Post System**

* Posts always arrive in pairs covering the same topic

* Each post displays two visible metrics:
  * **Engagement value** - How much the post will grow the platform
  * **Reaction type** - Facebook-style reactions (Like, Love, Haha, Wow, Sad, Angry)

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

### **Difficulty Modes**

Players choose a difficulty mode before starting:

| Mode | Speed | Starting Stability | Backlash | Description |
|------|-------|-------------------|----------|-------------|
| Chill | 0.75x | 120% | Flat (-1) | Relaxed pace, forgiving penalties, extra stability |
| Normal | 1.0x | 100% | Escalating | Balanced pace, standard penalties, the intended experience |
| Chaos | 1.3x | 80% | 2x Escalating | Overwhelming pace, harsh penalties, good luck |

* Difficulty selection appears after reading the intro paragraphs
* Selected mode is highlighted with a yellow border
* Final stats screen shows which difficulty was played

---

### **Suppression Backlash**

* Suppressing fake news is stabilizing (+1 stability)

* Suppressing legitimate content causes backlash (severity depends on difficulty mode):
  * **Chill:** Flat -1 per mistake (forgiving)
  * **Normal:** Escalating -1, -2, -3... per consecutive mistake
  * **Chaos:** Escalating -2, -4, -6... per consecutive mistake (2x multiplier)

* Backlash represents public distrust of platform censorship

* Censorship backlash counter tracks consecutive mistakes (displayed only in escalating modes)

* Without verification, suppression is a gamble

* When a post is suppressed, the algorithm promotes the other post in the pair

* Shows "no" overlay on suppressed post, robot indicator moves to promoted post

Players cannot censor their way to stability—guessing wrong makes things progressively worse (especially on higher difficulties).

---

### **Reaction Types**

Posts are categorized by the dominant user reaction they provoke. Reaction type determines hidden stability impact:

* Love – Most stabilizing (+3), low fake news chance (5%)
* Haha – Stabilizing (+2), low fake news chance (15%)
* Like – Slightly stabilizing (+1), low fake news chance (10%)
* Wow – Slightly destabilizing (-1), moderate fake news chance (25%)
* Sad – Destabilizing (-2), moderate fake news chance (20%)
* Angry – Most destabilizing (-3), high fake news chance (40%)

**Fake News Penalty:** When fake news is promoted, positive stability becomes negative and negative stability is doubled.

**Player Promotion Bonus:** When the player manually promotes a post (vs algorithm auto-promote), effects are multiplied by 1.25x.

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

* Engagement remains below rising targets too long (NOT IMPLEMENTED)

Win if:

* You survive until the end of your term

* Optional alternate ending via controlled collapse

---

### **Art & Presentation**

* Cute, friendly aesthetic with sky blue background (#a8d4f0)

* Fire gradient title "TRENDING" from yellow (#FFD700) to red (#FF0000)

* Rounded post cards with drop shadows and 3D highlight effects

* Emojis throughout UI for playful tone:
  * Reactions: Like, Love, Haha, Wow, Sad, Angry (each with corresponding emoji)
  * UI elements: Engagement, Stability, Phase, Time (each with icon prefix)
  * Large robot indicator (54px) shows algorithm's automatic choice (moves when suppressing)
  * Player actions: up-arrow promote overlay, no-sign suppress overlay
  * Verification status: hourglass (verifying), checkmark (REAL), alert (FAKE), question mark (no time)

* Restart button in upper right during gameplay (with confirmation dialog)

* Large action buttons centered horizontally above the belt (170x76 pixels)

* Suppressed posts are greyed out

* Selected post highlight: thick yellow border (10px)

* Verification banners fill most of the card (28px font)

* Minimum font size of 16px throughout for readability

* Stepped intro sequence: paragraphs shown one at a time with NEXT button

* Wildfire Social™ branding with fire gradient on first intro paragraph

* Credits displayed on start screen

* Phase banner: Large "PHASE X" text appears briefly (0.5 sec) at center when entering new phase

* Card colors match reaction type (blue=like, pink=love, yellow=haha, etc.)

* Purple-toned text for readability on light background

* Contextual message system provides feedback:
  * Player action outcomes (promoted fake news, good choices, censorship backlash)
  * Algorithm decisions (fake news got through, destabilizing content spread)
  * Phase transitions and stability warnings

* Stability guide showing reaction ranking above controls

* Rounded pill-shaped buttons on menus

* Abstract icons and fictional language

* No real-world brands, people, or events

---

### **Sound Design**

* Intro music: Loops on title screen, stops when game starts

* Background music: "Switch With Me Theme" starts at 80% speed, increases 10% each loop to build tension

* Game over music: Different tracks for collapse vs victory outcomes

* Phase transition sound: Plays when entering a new phase

* Sound effects for all player actions: select, promote, suppress, verify

* UI button sounds: Select sound plays on all menu buttons (intro, game over, restart, confirmation)

**Music Credit:** [Not Jam Music Pack](https://not-jam.itch.io/not-jam-music-pack) by Not Jam

**SFX Credit:** [Ultimate UI SFX Pack](https://jdsherbert.itch.io/) by JDSherbert, additional SFX by Kevin Fowler (CC license)

---

### **Technical Requirements**

* **Engine:** Phaser 3.80.1 (loaded via CDN)

* **Platform:** Browser-based (HTML5 Canvas)

* **Resolution:** 1280x720 with retina display support

* **Target:** itch.io embed

* **Dependencies:** None beyond Phaser CDN

* **Input:** Mouse/touch with keyboard shortcuts
  * Click to select post, keyboard P/S/V for actions
  * Large on-screen action buttons centered above belt (work on all devices)

---

### **Theme Statement**

The world is watching—but it only sees what the system expects to perform best.

Truth, harm, and attention are inseparable.

When humans can’t keep up, the algorithm decides.

