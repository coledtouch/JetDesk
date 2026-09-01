# JetDesk.AI brand guide

Direction: **Midnight + Ion**. The finish of a business-jet cabin at night with cockpit numerals. Dark, calm, expensive, and every number is legible at arm's length in a bouncing airplane.

JetDesk is a trip cost, fuel and runway desk for pilots who manage the airplane for an owner. The product promise in one line, and the headline used everywhere: **Know what the trip costs before you file.**

## 1. Name and wordmark

- Written form: `JetDesk.AI` in prose, `JETDESK.AI` as the wordmark, `JetDesk` on its own when the suffix is noise (app icon label, email sender name, manifest).
- Wordmark font: **Michroma**, weight 400, uppercase, letter-spacing .08em. `JETDESK` in ink, `.AI` smaller (about 47% of the wordmark size) and in the accent color.
- Never set the wordmark in Manrope or any other face, never add a gradient to it, never italicize it, never put a plane silhouette inside the letters.
- The header subline under the wordmark is `TRIP COST · FUEL · RUNWAYS` (middle dots, uppercase, tracked).

## 2. The mark

A **delta wing** drawn as a hollow triangle with two contrail bars beneath it. Geometry on a 72 by 72 grid:

```
wing      M14 46 L36 14 L58 46 L48 46 L36 28 L24 46 Z     fill  #4CC9FF
contrail  M22 54 H50   stroke #4CC9FF  width 4  round caps  opacity .55
contrail  M30 60 H42   stroke #4CC9FF  width 4  round caps  opacity .30
tile      rounded square x2 y2 w68 h68 rx18  fill #0B1220  stroke #1E2A40 (2px)
```

Files: `logo/mark.svg` (wing alone, transparent), `logo/mark-tile-dark.svg` (wing on the cabin tile, the app icon), `logo/lockup-dark.svg` and `logo/lockup-light.svg` (tile plus wordmark on each background), PNG icons at 192, 512, maskable 192 and 512, and the 180 apple-touch icon.

Rules for the mark:

- The wing is always Ion (`#4CC9FF` on dark, `#0E7CFF` on light). On a photo it may be white. It is never black, never a gradient, never outlined.
- Clear space is 8 grid units (the gap between wing and first contrail) on every side.
- Minimum size 20 px for the mark alone, 96 px wide for a lockup.
- The maskable icons keep the art inside the central 80% safe zone; the tile background bleeds to the edge.
- Do not add stars, globes, propellers, wings with feathers, or a second airplane. One shape, two bars.

## 3. Color

Two modes, one accent family. Dark is the brand mode and the one used for marketing; light exists because the app is used on a sunlit ramp.

### Dark (brand mode)

| Token | Hex | Name | Use |
|---|---|---|---|
| `--bg` | `#070B14` | Midnight | page background, manifest and theme color |
| `--card` | `#0B1220` | Cabin | cards, the icon tile |
| `--card2` | `#121C2E` | Cabin 2 | nested panels, inputs, raw METAR blocks |
| `--line` | `#1E2A40` | | hairlines |
| `--line2` | `#2A3A55` | | stronger borders, input borders |
| `--ink` | `#E6EAF2` | Instrument white | primary text |
| `--ink2` | `#A7B2C3` | | secondary text |
| `--ink3` | `#6B7A90` | | labels, captions, disabled |
| `--acc` | `#4CC9FF` | Ion | the accent: wing, links, eyebrows, key numbers, primary button fill |
| `--acc-soft` | `#0E2536` | | accent tint for chips and highlighted rows |
| `--acc2` | `#7CC4FF` | | hover and secondary accent |
| `--good` / `--good-soft` | `#2FD27D` / `#0F2A1E` | Go green | favourable verdicts, positive dollars, VFR |
| `--warn` / `--warn-soft` | `#FFB020` / `#2B2110` | Caution amber | tight runways, MVFR, notices |
| `--bad` / `--bad-soft` | `#FF5A5F` / `#2B1416` | Stop red | no-go, negative dollars, IFR and LIFR |
| `--btn` / `--btn-ink` | `#4CC9FF` / `#06131F` | | primary button and its text |

### Light (ramp mode)

| Token | Hex | Token | Hex |
|---|---|---|---|
| `--bg` | `#F4F6FA` | `--acc` | `#0E7CFF` |
| `--card` | `#FFFFFF` | `--acc-soft` | `#E3F0FF` |
| `--card2` | `#EEF2F7` | `--acc2` | `#0B5FCC` |
| `--line` | `#DCE3EC` | `--good` / `--good-soft` | `#0E9F5B` / `#E1F5EA` |
| `--line2` | `#C5CFDB` | `--warn` / `--warn-soft` | `#B7791F` / `#FFF3D6` |
| `--ink` | `#0F172A` | `--bad` / `--bad-soft` | `#D93A3F` / `#FCE4E5` |
| `--ink2` | `#475569` | `--btn` | `#0F172A` |
| `--ink3` | `#6B7A90` | `--btn-ink` | `#F4F6FA` |

Both sets are in `brand/tokens.css` and `brand/tokens.json`, copied from production.

Color rules:

- Ion is a highlight, not a fill. Roughly 5% of any screen. Big Ion areas only on the primary button and the wing.
- Green, amber and red mean what they mean in a cockpit. Never decorative. A positive dollar figure is green, a negative one is red, a runway that is tight is amber.
- No purple, no gradients across text, no neon. The one allowed glow is a soft radial of Ion at 20% or less behind a hero object.
- Backgrounds are flat Midnight or a very slow radial from Cabin 2 into Midnight (the app icon uses `radial-gradient(120% 120% at 30% 20%, #121C2E 0%, #070B14 62%)`).

## 4. Typography

| Role | Face | Weight | Notes |
|---|---|---|---|
| Wordmark, eyebrows, verdict words | Michroma | 400 | uppercase, tracking .08em to .2em, small sizes (10 to 16 px) |
| Headlines | Manrope | 800 | tracking -.03em, line-height 1.02, `text-wrap: balance`; hero is `clamp(34px, 9vw, 54px)` |
| Body | Manrope | 400 to 700 | 13.5 to 16 px, line-height 1.45 to 1.55 |
| Every number | B612 Mono | 700 (400 for raw METAR) | dollars, gallons, knots, feet, minutes, altitudes, ICAO codes in tables |

B612 is the typeface designed for Airbus cockpit displays. Its mono cut is what makes a JetDesk screen feel like an instrument rather than a spreadsheet. Any figure a pilot might read aloud is set in it.

Fonts are self-hosted (`site/dist/fonts/`, Latin subset woff2). Marketing images can use the same three faces from Google Fonts.

## 5. Shape, spacing, surfaces

- Radii: chips 999, inputs 9, buttons 10, small cards 12, cards 16, hero panels 20, phone frame 36, bottom sheets 18 on top, app icon tile 18 on a 72 grid (25%).
- Cards are `--card` with a 1 px `--line` border. No drop shadows on cards inside the app. The only shadow in the brand is under the floating phone mock: `0 30px 70px rgba(0,0,0,.35)` plus a 1 px Ion ring at 20%.
- Touch targets are at least 44 px tall. Inputs are 16 px text so iOS does not zoom.
- Leg and airport cards carry a tinted left border (accent, good, warn or bad) instead of stripes or badges.
- Density is high but calm: 8 to 12 px gaps inside cards, 16 to 26 px between sections, 1100 to 1140 px max landing width, 640 px max app width.

## 6. Imagery

What a JetDesk image is: night ramp, a light business turboprop or light jet (a Piper Meridian or a Pilatus PC-12 is the truth of the product; a Citation or Phenom is fine), cockpit glass at dusk, contrails over a dark blue sky, an FBO at blue hour with ramp lights. Reflections, wet ramp, a single accent light in Ion blue. Wide negative space on one side for copy.

What it is not: airliners, fighter jets, stock pilots grinning in white shirts, sunsets in orange, cartoon planes, globe icons, generic clouds, "AI" glowing brains, circuitry.

Photographic images are cool-toned (blue hour) and dark; one warm light source is allowed (ramp sodium lamp, cabin light) so the frame does not feel synthetic. Any UI in an image must be the real UI (see `screenshots/` and `design/AppScreens.dc.html`).

## 7. Voice

Written for a working pilot, by someone who has stood on the ramp. Short sentences. Numbers with a sign in front of them. No exclamation marks, no "revolutionize", no "AI-powered" in body copy, the `.AI` in the name is enough.

- Say what it does: "Fuel-stop math", "Runway verdict", "Winds on the leg", "Crew intel".
- Lead with the pilot's decision, then the number: "Worth the stop. +$191 after the extra landing, takeoff and detour."
- The owner is "the owner", the other pilot is "your co-pilot" or "the crew". Never "users".
- Verdict words are uppercase Michroma: `WORTH THE STOP`, `NOT WORTH IT`, `LONG ENOUGH`, `TIGHT`, `TOO SHORT`.
- Compliance line on every marketing surface: "Planning aid only, not for navigation."
- Money on the site is always the calculator's own worked sample (KHPN vs KBDR, 150 gal, $2.30 gap, +$191 net). Never present it as a customer result.

Approved lines:

- Know what the trip costs before you file.
- For pilots who manage the airplane.
- The spread between two FBOs is bigger than the spread between two airlines.
- So the calls you make on the ramp are made with numbers, not memory.
- Works offline in the airplane.
- Start free · 14-day Pro trial. No card.

## 8. Offer and product facts (for copy accuracy)

- Free account: airport lookup and runway verdicts, live METAR and TAF with density altitude, Near Me with filters, the fuel-stop calculator, one saved trip, your own price log.
- Pro: unlimited trips, winds-aloft groundspeeds on legs, live crosswind and best runway, market fuel reference, FBO and crew-car intel, crew sharing up to 10 people. $9.99 a month or $79 a year (34% saving, "two months free"). 14-day trial, no card.
- Data: FAA Aviation Weather Center (METAR and TAF), FAA winds aloft, FAA NASR airport file, OurAirports runways, U.S. EIA and OilPriceAPI for market fuel reference.
- Platform: installable PWA at https://www.jetdesk.ai, works offline, iOS and Android.
- Contact: hello@jetdesk.ai
