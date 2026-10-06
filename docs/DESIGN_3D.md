# Why the 3D sky of Mishkat is drawn the way it is

*6 October 2026. Every formula below is the code of `public/js/layouts.js` (shapes and orders), `public/js/galaxy.js` (rendering, camera, resting sweep) and `public/js/readcam.js` (the reading camera). Verses are quoted from the Tanzil text.*

## 1. The image that guided the design

> ﴿وَهُوَ ٱلَّذِى خَلَقَ ٱلَّيْلَ وَٱلنَّهَارَ وَٱلشَّمْسَ وَٱلْقَمَرَ كُلٌّ فِى فَلَكٍ يَسْبَحُونَ﴾ (Al-Anbiya 21:33)
> ﴿لَا ٱلشَّمْسُ يَنۢبَغِى لَهَآ أَن تُدْرِكَ ٱلْقَمَرَ وَلَا ٱلَّيْلُ سَابِقُ ٱلنَّهَارِ وَكُلٌّ فِى فَلَكٍ يَسْبَحُونَ﴾ (Ya-Sin 36:40)
> ﴿ٱلشَّمْسُ وَٱلْقَمَرُ بِحُسْبَانٍ﴾ (Ar-Rahman 55:5)

«Each one swims in an orbit», and «by a precise reckoning»: nothing in the sky is placed at random, nothing overtakes what comes before it. The 3D view of Mishkat takes this as its **rule of design**, not as a claim about the Quran:

1. **Every word of the Quran is a star** (the 77,433 words of the Tanzil text, without the basmala that opens the surahs) and **every star moves on one orbit**: a single continuous thread on which the words follow each other in reading order.
2. **Nothing overtakes**: on the thread the recited word only ever moves forward; the camera that follows it never goes back across an arm or a petal.
3. **Everything by a reckoning**: the place of each word is computed by a stated law from measurable facts of the text (the number of words of its verse and of its surah, its rank in the reading order), never placed by hand or at random.

What this is **not**: the shapes do not reveal a hidden structure of the Quran, and no number is presented as a sign or a miracle. The laws are chosen by the designer for clarity, beauty and readability; the text gives only the measures (how many words, which order). This follows the project's rule of no numerology (see the project file).

## 2. One thread, one turn per verse

All shapes share one construction (`helixAroundAxis`):

- the **axis** of the thread is the shape's curve (a spiral, a ring, a petal…);
- around it, **each verse makes one turn of a small helix** (2π for a verse of 8 words or more; a shorter verse a part of a turn, 2π/8 per word), so that **from one word to the next the direction never turns by more than 45°** — the eye can follow the recitation;
- the **radius of the turn grows with √(words of the verse)**: long Medinan verses make wide rings, short Meccan verses narrow ones. The square root keeps the area of a ring proportional to the number of its words (the area of a disc grows as r²);
- the radius changes from one verse to the next with a smoothstep curve s²(3 − 2s), so the thread has no kink;
- the frame of the helix is the normal of the axis in the disc (across the arm) and the vertical (the binormal of a flat curve), the tangent being taken by a symmetric difference with a step of 10⁻⁴;
- inside a surah the words always keep **Mushaf order**; between two surahs a gap of 40 "virtual words" leaves a visible pause.

## 3. The galaxy: a Fermat spiral

The axis of the galaxy is **Fermat's spiral** (the parabolic spiral):

  r = R·√u,  θ = Θ·u,  with u ∈ [0, 1] the reading position on one arm, R = 575 units, Θ = 2.75 turns.

- **Equal area for every word.** The area swept from the centre to the radius r is πr² = πR²·u: it grows *linearly* with the reading position. Every word therefore receives the same share of the disc — the law that H. Vogel (1979) used for the seeds of a sunflower (r = c·√n).
- **One stroke through the centre.** The reading position s runs from −1 to 1; u = |s| and the second arm is the first one turned by π. Fermat's spiral has an **inflection point at the origin**: its curvature
  κ(θ) = (θ + 3/(4θ)) / (a·(θ + 1/(4θ))^{3/2}),  with r = a√θ,
  tends to **0 at the centre** and to **≈ 1/r far from it**. So the thread crosses the core without a kink and its arms open more and more gently — the reading camera turns least where the words are densest.
- **The bulge.** Near the core the helix is wider and rounder: radius × (0.75 + 0.9·e^(−5u)) and vertical flattening 0.38 + 0.9·e^(−6u) (a flat disc at the rim, a round bulge at the centre), as in a spiral galaxy.
- **Scale.** The galaxy spans about ±580 units; every shape uses the same frame and scale, so that the morph from one shape to another (2.2 s) stays smooth.

## 4. The other shapes

| Shape | Law | What the text decides |
|---|---|---|
| **Rose of surahs** (default) | One continuous spiral of rings: surah s gets a ring of width w_s ∝ 2.6 + 0.0034·n_s (n_s its words), normalised to a span of 500 from an inner radius of 80; inside its ring the surah coils max(1, (w_s − 1.2)/2.6) laps; a five-fold ruffle r·(1 + 0.18·(0.3 + 0.7u)·cos 5θ) makes the petals of the rose; the rings rise as 150·u^1.5 | the width of each ring (its number of words) and the order of the rings (the chosen order) |
| **Dome (tawaf)** | One ascending circuit of 150 turns on a hemisphere of radius 470; the height of a word is R × (cumulative words / total). By **Archimedes' hat-box theorem** the area of a spherical band is proportional to its height, so **every surah's band has an area proportional to its words** | the area of each band |
| **Petals** | Each surah a petal: angular width ∝ its words, length L = 40 + 380·√(n_s / n_max); its words run on nested ellipses (semi-axes L/2 and 0.4·L) that leave from and return to the base, lap after lap, each lap scaled by √((l + 1)/laps); the flower opens like a cup, z = 240·(r/600)^1.8 − 60 | the width and length of each petal |
| **Flower of the challenge** | After the logo of the Islamic AI Challenge 2026: 19 petal outlines around a seven-pointed star r₀ = 92·(1 + 0.2·cos 7θ); 114 surahs = 19 × 6, six per petal | only the order of the surahs; the 19 comes from the logo, not from a reading of the text |
| **«قرآن»** | The word itself drawn in 3D and filled by the whole Quran from right to left, each surah's stretch sized by its words (`letters3d.js`) | the length of each stretch |

**Orders** (`suraSequence`): Mushaf order, revelation order (the well-known scholarly order, for exploration only), Meccan then Medinan, number of words, letters, verses, average verse length. The order decides *where* a surah lies on the thread; the words inside it never change order.

## 5. Light and motion

- **Stars**: a crisp core inside a two-scale halo (exp(−9d²)·0.5 + exp(−2.6d²)·0.16); a gentle twinkle of ±7 % at each star's own pace; the far side of the sky slightly dimmer; size clamped between 1.6 and 10 px so that no star becomes a blurred disc.
- **Reading camera** (`readcam.js`): the aim glides to the recited word with an exponential ease (1 − e^(−1.6·dt) for the distance), so the motion is continuous and never jumps; tests simulate the whole Quran for every shape and order (back-and-forth reversals below 1 %).
- **At rest** (nothing recited): a bar of light turns once every 9 s around the centre of the shape, on the screen; a star it crosses lights up (× up to 3.4) and fades behind it as e^(−1.7·Δ) with the angle Δ since the bar passed — the trace of a lighthouse. It fades out (e^(−2.5·dt)) as soon as a recitation starts, so that only the recited words are lit.
- **Pure view** (✧): only the stars and the recited words, full screen, on a computer and on a phone.
- **The light of the month**: each completed act sends a ray to the logo, which keeps a little more light until the end of the month (`glow.js`, see GUIDE.md §6).

## 6. Why these choices are sound

- **Readability**: one thread, bounded turning between words, no overtaking — the recitation can be followed by the eye at the speed of the reciter.
- **Fairness of space**: the square-root radius of a verse's turn, the equal-area Fermat spiral, the equal-area bands of the dome and the word-proportional widths of the rose and the petals all give **space in proportion to the amount of text**, so no surah is visually favoured.
- **Smoothness**: smoothstep transitions of radius, the inflection of Fermat's spiral at the centre and a shared frame for all shapes make every motion and morph continuous.
- **Determinism**: every layout is a pure function of the text (and a seeded generator for the few jitters), recomputed in the browser in a worker and identical for every visitor.

---
© 2026 Mohamed Nour Bou Ali — Mishkat. All rights reserved.
