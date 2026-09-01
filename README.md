# JetDesk.AI brand and design kit

Everything a designer or a coding agent needs to make images, logo variants, a hero and store screenshots for **JetDesk.AI** (https://www.jetdesk.ai), and to wire them into the live site.

Snapshot of production as of September 2026, app version v27345d78.

## Start here

1. `BRAND.md` is the rulebook: the mark, the two palettes, the three typefaces, spacing, imagery and voice.
2. `AGENTS.md` tells a coding agent how the site is built, where assets go, and the constraints (self-hosted only, offline PWA, size budgets).
3. `prompts/image-prompts.md` has copy-paste prompts for the hero, logo explorations, the OG card, store screenshots and an email header, each with the brand block baked in.

## Folder map

| Folder or file | What it is |
|---|---|
| `brand/tokens.css`, `brand/tokens.json` | The production color, type, radius and logo values. Use these, never eyeball a hex. |
| `logo/` | `mark.svg` (wing alone), `mark-tile-dark.svg` (app icon art), `lockup-dark.svg`, `lockup-light.svg`, PNG icons at 192, 512 (any and maskable) and the 180 apple-touch icon. |
| `design/` | The design canvas sources: `Brand.dc.html` (brand system board), `Main.dc.html` (desktop landing), `Mobile.dc.html` (phone landing), `AppScreens.dc.html` (app tabs in the brand), two rejected alternates (`DirectionContrail`, `DirectionAfterburner`) kept for reference, and `canvas.json`. They are plain HTML with inline styles and open in any browser (the Google Fonts links in them are for preview only; the site self-hosts). |
| `screenshots/` | Real captures of the live site: landing desktop dark, landing mobile dark and light, the Account tab, and one older airport-detail screen from the previous brand for comparison. |
| `site/` | The app sources with secrets removed. Builds with `python3 assemble_pwa.py` and runs with `npx wrangler@4 pages dev`. See `AGENTS.md`. |
| `prompts/` | Image generation prompts. |

## What we want generated

In priority order:

1. **Hero image** for the landing page (dark, blue hour, light turboprop or light jet, empty left half for copy). Desktop 16:9 and phone 3:4. WebP under 200 KB each.
2. **Open Graph card** 1200 by 630 for link previews (currently the site falls back to the app icon).
3. **Logo explorations** of the delta-wing mark: treatments to compare, with the winner rebuilt as SVG matching the geometry in `BRAND.md`.
4. **Store-style screenshots**: five framed phone screens on brand backdrops with the headlines listed in the prompts file. Real UI only, composited from `screenshots/` or fresh captures of the local build.
5. **Email header** 600 by 160 for the verification and welcome emails.

## Non-negotiables

- One accent: ion blue. Midnight navy backgrounds. No purple, no orange sunsets, no neon.
- No airliners, no fighters, no faces, no cartoon planes, no "AI" glow.
- Every asset is served from the site itself. No external hosts, no CDNs, no Google Fonts at runtime.
- All dollar figures in any mock are the calculator's own sample (KHPN vs KBDR, 150 gal, $2.30 gap, +$191 net), never presented as a customer result.
- "Planning aid only, not for navigation." stays on every marketing surface.
- No em dashes in any copy or doc.

## Contact

hello@jetdesk.ai
