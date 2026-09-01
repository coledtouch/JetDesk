# JetDesk.AI image prompts

Ready-to-run prompts for an image model (GPT Image, Midjourney, Flux, Ideogram, Firefly). Each prompt carries the brand constraints so the outputs match `BRAND.md`. Paste the **Brand block** in front of any prompt you write yourself.

## Brand block (prefix for every prompt)

```
Brand: JetDesk.AI, a trip-cost, fuel and runway app for pilots who manage a light business turboprop or light jet.
Palette: midnight navy background #070B14, deep cabin navy #0B1220, hairlines #1E2A40, instrument white #E6EAF2, one accent only: ion blue #4CC9FF. Optional single warm ramp light. No purple, no orange sunsets, no neon rainbows.
Mood: night ramp, blue hour, quiet, expensive, precise. Business-jet cabin finish. Cockpit glass. Contrails over a dark blue sky.
Style: photographic realism or clean flat vector, never cartoon, never 3D clay, never "AI glow", no circuitry, no brains, no globes.
Aircraft, if any: Piper M600 or Meridian, Pilatus PC-12, TBM 960, Cessna Citation, Embraer Phenom. Never airliners, never fighter jets, never propeller vintage.
People: none, or a single pilot from behind or in silhouette. No faces, no stock-photo smiles.
Text: none in the image unless the prompt says so. Any text is set in the fonts Michroma (uppercase, tracked), Manrope (bold, tight) or B612 Mono (numbers).
```

Negative prompt (models that take one):

```
airliner, fighter jet, propeller biplane, cartoon, clip art, 3d render, clay, neon, purple, magenta, orange sunset, lens flare cluster, watermark, signature, text, letters, logo of another brand, smiling pilot, stock photo, globe, circuit board, glowing brain, hexagons
```

## 1. Hero image (landing page, desktop and phone)

Placement: behind the hero grid in `renderWelcome()`, fading to Midnight at the bottom, copy on the left half. Output 1600 by 900 (and a 900 by 1200 portrait crop for phones). Deliver as WebP under 200 KB.

```
[Brand block]
Wide cinematic photograph, 16:9. A single-engine turboprop (Piper M600 style, T-tail, dark paint with a thin ion-blue stripe) parked on a wet ramp at blue hour, nose pointed slightly toward camera from the right third of the frame. The left half of the frame is dark, empty sky and wet ramp reflection for copy. One warm sodium ramp light far behind the airplane, cool blue everywhere else. Cabin door open with soft white light spilling onto the ramp. Shallow depth of field, 35 mm lens, low camera height. Reflections of the wing in the wet ramp. No text, no people, no other aircraft.
```

Variant, phone portrait:

```
[Brand block]
Vertical photograph, 3:4. Looking down the wet ramp at blue hour toward a parked light business jet (Phenom 100 style) far in the frame, rows of dim ramp lights leading to it, top two thirds of the frame is dark night sky with a faint contrail lit by the last light. The empty sky is for copy. Cool blue palette, one warm cabin light. No text, no people.
```

Variant, abstract (if the photo fights the phone mock):

```
[Brand block]
Abstract minimal background, 16:9. Midnight navy #070B14 field with a very slow radial glow of ion blue #4CC9FF at 15% strength in the upper left. Two thin horizontal contrail lines in ion blue at 55% and 30% opacity, sweeping from the lower right and fading out. Fine grain, no other elements, no text. Looks like the dashboard glass of a business jet at night.
```

## 2. Logo mark variants

The mark is fixed geometry (see `BRAND.md` section 2 and `logo/mark.svg`). Use the image model only to explore treatments, then rebuild the winner as vector by hand.

Explore a refined mark:

```
[Brand block]
Flat vector logo mark on a solid #070B14 square, centered, 1:1. A minimal delta wing drawn as a hollow isosceles triangle (apex up, cut-out inner triangle), in ion blue #4CC9FF, with two short horizontal contrail bars beneath it, the lower bar shorter and fainter. Geometric, single weight, no gradients, no outline, no shadow, no text. Style of a modern aerospace company mark. Six variations in a 3 by 2 grid: sharper apex, wider stance, thicker bars, rounded corners, bars inside the wing, wing with a notch on the trailing edge.
```

App icon mockup (to preview on a phone before committing):

```
[Brand block]
Realistic iPhone home screen at night, close crop, showing one app icon: a rounded square in deep cabin navy #0B1220 with a 1px hairline border, containing a hollow ion-blue delta wing and two contrail bars, the label "JetDesk" beneath in white system font. Neighboring icons blurred and desaturated. No other text.
```

Wordmark exploration (Michroma is the standard; this is only to check spacing and the .AI treatment):

```
[Brand block]
Typographic lockup on #070B14, 5:1 wide. The word "JETDESK" in a wide geometric squared sans (Michroma), white #E6EAF2, tracked wide, followed by ".AI" at half size in ion blue #4CC9FF, baseline aligned. To the left, the delta-wing mark on a rounded navy tile. Three spacing variants stacked vertically. Nothing else.
```

## 3. Open Graph and social card

Output 1200 by 630 PNG under 300 KB. Goes to `site/dist/img/og.png` and the `og:image` line in `assemble_pwa.py`.

```
[Brand block]
Social share card, 1200 by 630. Left 60%: on flat midnight navy, the text "Know what the trip costs before you file." in bold tight Manrope, white, with "before you file." in ion blue #4CC9FF; above it a small tracked uppercase eyebrow "JETDESK.AI" in Michroma; below it a small line "Fuel-stop math · runway verdicts · live FAA weather" in grey #A7B2C3. Right 40%: a phone screen mock in a dark rounded frame showing a green verdict card that reads "WORTH THE STOP" and the number "+$191" in a monospace cockpit font, over a wet ramp photo at blue hour, fading into the navy on the left. Thin hairline border #1E2A40 around the card. No other text.
```

Twitter and LinkedIn square variant:

```
[Brand block]
Square social image, 1:1, midnight navy. Centered delta-wing mark on a rounded navy tile, "JETDESK.AI" beneath in Michroma white with ".AI" in ion blue, and one line under it in grey: "For pilots who manage the airplane." A faint contrail sweeps behind. No other elements.
```

## 4. App store and landing screenshots

Real UI only. Start from `screenshots/` and `design/AppScreens.dc.html`; use the image model for the device frame and backdrop, then composite the real screen. Never let the model draw the UI.

Backdrop for framed screenshots (1284 by 2778 for iPhone 6.7 inch, 1080 by 1920 for Android):

```
[Brand block]
Vertical phone-store screenshot backdrop, 9:19.5. Flat midnight navy with a soft ion-blue radial glow behind where a phone will sit in the lower two thirds. Top quarter is empty for a headline. Two faint contrail lines crossing the lower corner. No phone, no text, no UI.
```

Headlines for the five store screenshots (set in Manrope 800, white, ion-blue keyword, on the backdrop above the framed real screenshot):

1. `Know the cost before you file.` Screen: Trip tab with a two-leg trip and per-leg cost.
2. `Is the stop worth it?` Screen: Fuel Stop calculator showing `WORTH THE STOP +$191`.
3. `Runway verdict, with the wind.` Screen: Airport detail with runway diagram, crosswind and best runway, density altitude.
4. `Weather at your ETA.` Screen: METAR and TAF card with the flight category chip.
5. `Crew intel that follows the airport.` Screen: FBO tracker with prices, crew car and fees, "Synced" chip.

## 5. Email header and misc

Email header (600 by 160, PNG, for the verification and welcome emails in `site/lib/email.js`):

```
[Brand block]
Email header banner, 600 by 160, midnight navy, the JetDesk lockup (tile mark plus "JETDESK.AI" wordmark) left aligned with 32 px padding, a faint contrail line running to the right edge. No other text.
```

Favicon and mask icon: rebuild from `logo/mark.svg` at 32, 48 and 180 px; do not generate with an image model.

## 6. Checking an output against the brand

Reject an image if any of these are true:

- More than one accent hue, or the accent is not ion blue.
- The aircraft is an airliner, a fighter, or has propellers of a vintage type.
- There is warm orange light across more than a corner of the frame.
- Any text is present that the prompt did not ask for, or the text is in a font other than Michroma, Manrope or B612 Mono.
- Any UI in the frame was drawn by the model instead of composited from real screenshots.
- People with visible faces.
- The file is over budget (hero 200 KB WebP, OG 300 KB, icons PNG at the listed sizes).
