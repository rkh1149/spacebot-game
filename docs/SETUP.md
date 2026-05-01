# Setup Guide

Follow these steps in order. Should take 20-30 minutes total.

## 1. Local Development

### Prerequisites

- **Node.js 18+** — check with `node -v`. Download from https://nodejs.org if needed.
- **Git** — check with `git --version`.
- A modern browser (Chrome/Edge/Firefox/Safari).

### Install & Run

```bash
# From the project root
cd /Users/richardhoyne/AI\ Project\ 1/GitHub/spacebot-game

# Install dependencies
npm install

# Start dev server (opens http://localhost:5173 automatically)
npm run dev
```

You should see the Space Bot loading screen, then the main menu. Click "NEW GAME", then click the canvas to lock the pointer, and start moving with WASD.

## 2. Push to GitHub

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial scaffold: tech demo"

# Create a new repo on github.com (private recommended)
# Then connect and push:
git remote add origin https://github.com/YOUR_USERNAME/spacebot-game.git
git branch -M main
git push -u origin main
```

## 3. Set up Neon Database

1. Sign up / log in at https://console.neon.tech
2. Create a new project (free tier is fine — name it `spacebot`)
3. In the SQL editor, paste and run the contents of `db/schema.sql`
4. Go to **Connection Details** and copy the connection string. It looks like:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
   ```
5. Save this string — you'll paste it into Vercel in the next step. **Don't commit it to git.**

## 4. Deploy to Vercel

1. Sign up / log in at https://vercel.com
2. Click "New Project" → "Import Git Repository" → select your `spacebot-game` repo
3. Framework Preset should auto-detect as **Vite**
4. Before deploying, add an environment variable:
   - Key: `DATABASE_URL`
   - Value: your Neon connection string from step 3
5. Click Deploy

Within ~1 minute you'll have a live URL like `spacebot-game.vercel.app`.

Vercel auto-deploys every push to `main` and creates preview deployments for pull requests.

## 5. Verify the API

Open `https://YOUR-DEPLOYMENT.vercel.app/api/player` in a browser. You should get a `405 Method not allowed` JSON response — that's correct (the endpoint requires POST).

To test player creation, you can run from your terminal:
```bash
curl -X POST https://YOUR-DEPLOYMENT.vercel.app/api/player \
  -H "Content-Type: application/json" \
  -d '{"username": "test"}'
```

You should get a `201 Created` response with a player object.

## Troubleshooting

**Black screen on load**
- Open browser DevTools → Console. Look for module loading errors. Most common cause: missing `npm install`.

**Mouse doesn't lock to canvas**
- Click the canvas first. Some browsers require a user gesture. Press Esc to release the lock.

**Pause menu doesn't appear**
- Press Esc only after starting the game (clicking NEW GAME first).

**API returns 500 on Vercel**
- Check that `DATABASE_URL` is set in Vercel project settings → Environment Variables. After adding it, redeploy.

**Performance is choppy**
- Close other browser tabs. The composer (post-processing) is the most expensive part — we'll add a low-quality toggle in the next phase.
