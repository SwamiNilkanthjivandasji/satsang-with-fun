# satsang-with-fun

Satsang with Fun – a mobile-first, installable (PWA) web app with quizzes and learning games. Static front end hosted on **GitHub Pages**; accounts and progress stored in **Supabase**.

> Original design, icons and sample questions. The structure and game mechanics follow the reference app; none of its artwork, text or question content is reused.

## Phase 1 (this commit)

| Area | Status |
|---|---|
| Login: Google, name + 4-digit PIN, guest | Done (Google + PIN need Supabase; guest/local work without it) |
| Home with 5 sections, section menus | Done |
| Satsang Quiz (2 teams, 8 boxes/level, timer, hidden prizes, levels 1–5, stars) | Done (sample content: Ramayan L1–2, Maths L1–2) |
| Gujarati / English switch | Done (UI text; questions have optional `en`) |
| Offline shell + install prompt | Done |
| Inner Enemies (`shatru`): canvas shooter, 6 faults → 4 virtue gems → 4 powers, 5 waves, 3 lives, best score saved | Done |
| Charanvidhi Master (`charan`): match-3, 8×8, phase 1 only (16 levels), hearts, chest, chihna collection | Done for phase 1. Phases 2–5 are locked ("coming soon") – not defined. **The 16 chihna names/meanings/art are empty placeholders; supply them in `data/charan.json` and `icons/charan/`.** |
| Ekadashi, Vachanamrut, Dhyan Darshan, Memory, 5 traditional games | **Not built** – shown as "Coming soon" |

## Run locally

```bash
python3 -m http.server 8000   # or any static server
# open http://localhost:8000
```

With no Supabase keys the app runs in **local-only mode**: progress stays in the browser, Google login is disabled.

## Deploy (GitHub Pages)

1. Push to `main`.
2. Repo → Settings → Pages → Source: *Deploy from a branch* → `main` / root.
3. Site appears at `https://<owner>.github.io/satsang-with-fun/` (all paths are relative, so the sub-path works).

## Enable accounts and cloud progress (Supabase)

1. Create a Supabase project. Run `supabase/schema.sql` in the SQL editor.
2. Authentication → Providers → **Google**: enable (needs a Google OAuth client; add Supabase's callback URL there).
3. Authentication → Providers → **Email**: enable, and turn **off** "Confirm email" (name + PIN accounts use a generated email address).
4. Authentication → URL Configuration: add the GitHub Pages URL to *Site URL* and *Redirect URLs*.
5. Put the project URL and **anon** key in `js/config.js`. Never put the `service_role` key anywhere in this repo.

## Content

- Menu and section items: `data/menu.json` (`ready: true` turns an item into a playable link; the game module must exist at `js/games/<id>.js`).
- Quiz questions: `data/prashn.json`. Each level has exactly 8 boxes. Prize kinds: `points`, `bonus` (extra turn).

## Assumption log (needs client confirmation)

| # | Assumption | Default chosen |
|---|---|---|
| A1 | Which data is saved per user | Unlocked level per category and ⭐ count per category. Team names/settings stay in the browser. |
| A2 | Rule to unlock the next level | Finishing all 8 boxes unlocks the next level, whichever team wins. |
| A3 | Who earns a ⭐ | Team with more points in that level; both on a tie. |
| A4 | Wrong answer | Answer shown, prize stays hidden, turn passes to the other team. |
| A5 | Correct answer | Prize revealed and points added; a `bonus` prize keeps the turn. |
| A6 | Question timer | Optional, default 30 s (per-box `seconds` overrides). Time-up does not auto-fail; the teacher decides. |
| A7 | "Login without account" | Guest mode, progress stored on this device only. |
| A8 | Name + PIN | First use registers the account; the same name with another PIN is rejected. Names are case-insensitive. |
| A9 | PIN reset | Not self-service (no email on file); an administrator resets it in Supabase. |
| A10 | Manual +/− buttons | Adjust the current team's total by 10 points; never below 0. |
| A11 | Categories | Only Ramayan and Maths have questions; Mahabharat, Krishna Leela, Hanumanji are listed as "Coming soon". |
| A12 | Fault → gem mapping | કામ→વિવેક, ક્રોધ→ક્ષમા, લોભ→સંતોષ, મોહ→વિવેક, મદ→સત્સંગ, મત્સર→સત્સંગ. Chosen by us; confirm with client. |
| A13 | Shooter rules | Lives 3, 5 waves, auto-fire; power durations: shield 6 s, power 8 s, magnet 8 s; no sound. |
| A14 | Charanvidhi hearts | 5 hearts, one lost per failed level, refill after 15 min. |
| A15 | Charanvidhi levels | Goal/moves/colour count follow a formula (`js/games/charan-levels.js`), tuned with a bot, not real players. Finishing level N unlocks N+1 and reveals chihna N. |
| A16 | Mechanics source | Mechanics taken from the reference's help text and limited play, not full observation; differences are possible. |

## Known risks

- **A 4-digit PIN is weak** (10,000 combinations). Supabase rate limits help, and the app locks the form for 5 minutes after 5 wrong tries, but that client-side lock can be bypassed. Fine for game progress; do not store sensitive data under it. If children's data is involved, check consent/privacy requirements for your markets.
- The PIN is turned into a Supabase password client-side (`pinPepper` + PIN). The pepper is public, so it does not add secrecy.
- Supabase free projects pause after a period of inactivity.
- Questions in `data/prashn.json` are sample content; have them reviewed before publishing.
