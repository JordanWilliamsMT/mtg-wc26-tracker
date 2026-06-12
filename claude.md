# WC26 Sweepstake — Claude Code Context

## What this project is

An office sweepstake tracker for the FIFA World Cup 2026. 22 staff members each have 2 teams (1 top-tier, 1 bottom-tier). Winner takes all based on which participant's team wins the tournament. Hosted on Netlify, no traditional backend or database.

## Tech stack

- **Frontend:** Vite + React (JSX), no TypeScript
- **Styling:** Inline styles only, CSS variables defined in `src/index.css`
- **Backend:** Netlify Functions (ESM, `export default async function handler(req)`)
- **Database:** Netlify Blobs — key/value store, accessed via `@netlify/blobs`
- **Hosting:** Netlify, auto-deploys from GitHub (`master` branch)
- **Package manager:** npm

## Data sources

- **Fixtures + standings:** football-data.org free tier — header `X-Auth-Token`, env var `FOOTBALL_DATA_KEY`. Competition code `WC`, season 2026.
- **Win odds:** The Odds API free tier — query param `apiKey`, env var `ODDS_API_KEY`. Sport: `soccer_fifa_world_cup_winner`.
- **No other external APIs.**

## Environment variables (Netlify dashboard, never in code)

- `FOOTBALL_DATA_KEY` — football-data.org API key
- `ODDS_API_KEY` — The Odds API key
- `ADMIN_PASSWORD` — plain text password for admin panel
- `ENABLE_LIVE_POLL` — set to `"true"` to enable 5-min polling on game days

## Project structure

```
netlify/
  functions/
    sync.js      ← scheduled 7am UTC daily + on-demand. Fetches fixtures, standings, odds → writes to Blobs → generates moments
    poll.js      ← runs every 5 mins, only calls sync if hasGamesToday is true
    data.js      ← read-only endpoint, frontend calls /api/data?key=<blobkey>
    admin.js     ← write endpoint, password-protected. Handles participants, moments, forceSync
src/
  components/
    Leaderboard.jsx   ← win probability from odds, fun facts strip, tonight's stakes
    Fixtures.jsx      ← upcoming/live/results, BST times via timeZone:'Europe/London'
    Groups.jsx        ← all 12 WC2026 groups, computed standings
    Bracket.jsx       ← knockout bracket R32 → Final
    Moments.jsx       ← banter feed + live odds ticker
    FunFacts.jsx      ← most goals, biggest win, avg goals — calculated from fixtures
    Admin.jsx         ← password-protected panel: participants, force sync, manual moments
  hooks/
    useData.js    ← fetches all blob data, 5-min poll on game days, leaderboard/stakes/standings calc
    useAdmin.js   ← auth state, wraps all admin API calls
  data/
    teams.js      ← canonical team names, flags, TOP_TEAMS, BOTTOM_TEAMS, CHARITY_TEAMS, TEAM_NAME_MAP
```

## Netlify Blobs keys

All stored under the `sweepstake` store:

- `fixtures` — `{ fixtures: [...], updatedAt }`
- `standings` — `{ groups: { "Group A": [...] }, updatedAt }`
- `odds` — `{ odds: { "Brazil": 12.3, ... }, updatedAt }` (normalised % probability)
- `participants` — `{ participants: [{ id, name, teams: [topTeam, botTeam] }], updatedAt }`
- `moments` — `{ moments: [...], updatedAt }` (max 100, sorted newest first)
- `meta` — `{ lastSync, hasGamesToday, hasLiveGames, gamesToday }`

## Team names — critical

Team names must match exactly between `src/data/teams.js` and what football-data.org returns. The `TEAM_NAME_MAP` in `teams.js` handles known variants. If a team isn't showing odds or moments, the name likely doesn't match. **Never rename teams without updating both `teams.js` and checking the API response.**

Known tricky ones:

- football-data.org returns `"Czechia"` not `"Czech Republic"`
- Odds API returns `"United States"` not `"USA"`
- `TEAM_NAME_MAP` in `teams.js` handles these

## The 22 participants and their teams

| #   | Name                  | Top team      | Bottom team    |
| --- | --------------------- | ------------- | -------------- |
| 1   | Cait Alborn           | Sweden        | Japan          |
| 2   | Phoebe March          | Brazil        | Bosnia         |
| 3   | Richard Jansen-Parkes | Paraguay      | Mexico         |
| 4   | Ashley Handley        | Canada        | Austria        |
| 5   | Jordan Williams       | Argentina     | Australia      |
| 6   | Karen McKay           | Switzerland   | Egypt          |
| 7   | Leigh Milne           | Turkey        | South Africa   |
| 8   | Jess Pullara          | Portugal      | Ivory Coast    |
| 9   | Tegan Goulbourne      | Morocco       | Czech Republic |
| 10  | Simeon Kelly          | United States | DR Congo       |
| 11  | Ollie Eggleton        | Norway        | South Korea    |
| 12  | Zoe Taylor            | Netherlands   | Tunisia        |
| 13  | Chris Holman          | France        | Saudi Arabia   |
| 14  | Kiki Anderson         | Uruguay       | Uzbekistan     |
| 15  | Jake Lacey-Watts      | Scotland      | Croatia        |
| 16  | Claire Leech          | Senegal       | Panama         |
| 17  | Fabio Musio           | Germany       | Cape Verde     |
| 18  | Beth Morgan           | Spain         | Iran           |
| 19  | Anne-Marie Howe       | Qatar         | Belgium        |
| 20  | Stephen Tredger       | Ghana         | Ecuador        |
| 21  | Clive                 | Colombia      | Algeria        |
| 22  | Roland Renshaw        | England       | Iraq           |

Charity teams (not in sweepstake, winnings go to charity): New Zealand, Curacao, Jordan, Haiti

## Scoring / win probability

Winner takes all — no points system. Win probability = sum of participant's two teams' odds (from The Odds API, normalised to %). Calculated in `useData.js` → `getLeaderboard()`.

## Moments system

- One moment generated per finished game (not two)
- Group stage: one post mentioning both participants if their teams are involved
- Knockout: elimination moment + advancing moment (two posts, different teams)
- Final: also generates a winner/champion moment
- Moments are stored in Blobs, max 100, never regenerated for already-seen game IDs (`seenIds` set)
- Admin can post manual moments via the admin panel

## Design system

CSS variables in `src/index.css`:

- `--navy` / `--navy-2` / `--navy-3` / `--navy-4` — dark backgrounds
- `--lime` — electric green, primary accent
- `--muted` — secondary text
- `--red` / `--amber` / `--green` — status colours
- `--font-display: 'Bebas Neue'` — headings/numbers
- `--font-body: 'Inter'` — body text
- `--font-mono: 'JetBrains Mono'` — scores/stats
- All styling is inline JSX, no CSS files per component, no Tailwind

## Scheduled functions

- `sync` — `0 7 * * *` (7am UTC = 8am BST)
- `poll` — `*/5 * * * *` (every 5 mins, skips if no games today)
- Both defined in `netlify.toml`

## Local dev

```bash
npm run dev   # runs netlify dev on port 8888
```

Requires `.env` file (copy from `.env.example`). Netlify Blobs connects to the live site when linked via `netlify link`.

## Deployment

Push to `master` → Netlify auto-deploys. No build step needed for function changes. After any sync.js change, do a force sync from the admin panel.

## Things to be careful about

- **Don't change the Blobs store name** (`sweepstake`) — all data will be lost
- **Don't change function file names** without updating `netlify.toml`
- **Don't add localStorage** — breaks in Netlify's environment
- **Don't use TypeScript** — project is plain JSX
- **Always use `timeZone: 'Europe/London'`** when displaying kickoff times
- **The `seenIds` set in sync.js** prevents duplicate moments — don't remove it
- **Admin password** is plain text in env var, never hardcode it
