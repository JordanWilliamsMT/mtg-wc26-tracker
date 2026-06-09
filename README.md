# ⚽ WC26 Sweepstake — Full Setup Guide

## What it does
- Live leaderboard ordered by win probability (from real bookmaker odds)
- Auto-fetching fixtures, live scores, results
- All 12 group standings with form guide
- Full knockout bracket (R32 → Final)
- Banter moments feed (auto-generated + admin manual posts)
- Live odds ticker
- Tonight's stakes — who's watching nervously
- Last team standing sidebar competition
- Admin panel (password-protected) for participants + force sync

---

## Step 1 — API keys (free, 5 mins)

### API-Football (fixtures, results, standings)
1. Go to https://dashboard.api-football.com/register
2. Create a free account
3. Copy your API key from the dashboard

### The Odds API (win probabilities)
1. Go to https://the-odds-api.com
2. Sign up for the free tier (500 requests/month)
3. Copy your API key

---

## Step 2 — GitHub repo

1. Create a new repo on GitHub (e.g. `wc26-sweepstake`)
2. Push this project:
```bash
cd wc26-sweepstake
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/wc26-sweepstake.git
git push -u origin main
```

---

## Step 3 — Netlify setup

1. Go to https://app.netlify.com
2. Click **Add new site → Import an existing project**
3. Connect GitHub → select your repo
4. Build settings are auto-detected from `netlify.toml`
5. Click **Deploy**

### Add environment variables
In Netlify: **Site settings → Environment variables → Add variable**

| Key | Value |
|-----|-------|
| `API_FOOTBALL_KEY` | Your API-Football key |
| `ODDS_API_KEY` | Your Odds API key |
| `ADMIN_PASSWORD` | Whatever password you want |
| `ENABLE_LIVE_POLL` | `true` |

6. **Redeploy** after adding env vars (Deploys → Trigger deploy)

---

## Step 4 — First sync

Once deployed, go to your site URL → Admin tab → enter your password → **Force sync now**

This fetches all fixtures, standings, and odds for the first time.

After that, everything runs automatically:
- **7am UTC daily** — full sync (fixtures, standings, odds, moments)
- **Every 5 mins on game days** — live score updates only

---

## Local development

```bash
npm install

# Copy env file and fill in your keys
cp .env.example .env

# Run with Netlify Dev (emulates functions + blobs locally)
npm run dev
```

---

## Free tier limits (you will not exceed these)

| Service | Free allowance | Our usage |
|---------|---------------|-----------|
| API-Football | 100 req/day | ~20/day max |
| The Odds API | 500 req/month | ~30/month |
| Netlify Functions | 125k/month | ~300/month |
| Netlify Blobs | 1GB | <1MB |
| Netlify Bandwidth | 100GB/month | <1GB |

---

## Adding participants

Go to your live site → **Admin** tab → enter password → add each person and assign their top + bottom team.
