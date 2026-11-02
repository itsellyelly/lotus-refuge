# Lotus Refuge 莲心

A pixel-art refuge for friend groups. When work gets tough, meet your circle at a sanctuary of your choice, or vent about the boss at the Gossip Bar.

- **Circles.** No accounts: anyone opens the site, creates a circle, and shares the invite link. Each circle is private: chat, offerings, check-ins and scores are visible only to its members (enforced with Postgres row-level security).
- **Sanctuaries.** Pick the one that fits you; everyone can visit all of them.
  - Guan Yin Temple (gate + hall): offer lotus, chrysanthemum, orchid, peony or plum blossom.
  - Chapel of Light: light a white, red, blue or gold candle.
  - Prayer Hall: make a dua for ease, patience, guidance or gratitude; each dua lights a lamp.
  - Mandir: offer a diya, marigolds, a lotus or fruit.
  - Wishing Tree: for any belief or none; tie a coloured ribbon.
- **Check-ins.** Tell the circle where you are and how you're doing (Drained → Grateful).
- **Gossip Bar.** A vent board with reactions (Same, Hug, LOL, Quit already), plus **Whack-a-Boss**, a 30-second arcade game with a circle leaderboard. A boss nickname can be set per device and is never uploaded.
- **Live presence.** See friends walking around each space in real time.

Stack: Vite + vanilla JS, Supabase (Postgres, anonymous Auth, Realtime), deployed on Vercel.

---

## Set it up (about 20 minutes)

### 1. Create the Supabase project
1. Go to <https://supabase.com/dashboard>, then **New project**. Pick a name, a database password and a region near your friends.
2. Open **SQL Editor**, then **New query**. Paste the whole of `supabase/migrations/20261102000000_init.sql` and click **Run**.
3. Go to **Project Settings → API** and copy the **Project URL** and the **anon public** key. You'll need them in step 3.

### 2. Allow guest identities
In Supabase, go to **Authentication → Sign In / Providers** and turn on **Allow anonymous sign-ins**. Click **Save**.
There is no login screen: each browser gets an invisible guest identity, and the invite link is what lets someone into a circle.
(Clearing browser data or switching devices means joining again from the invite link.)

### 3. Deploy on Vercel
1. Push this folder to a GitHub repo.
2. At <https://vercel.com/new>, import the repo. Vercel detects Vite automatically.
3. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`: the Project URL from step 1
   - `VITE_SUPABASE_ANON_KEY`: the anon public key from step 1
4. Click **Deploy**.

### 4. Invite your circle
Open your site, create a circle, and click **Invite friends** to copy the link. As the circle owner you can make a new link at any time; the old one then stops working.

## Run locally

```bash
npm install
```

```bash
cp .env.example .env
```

```bash
npm run dev
```

Without the two environment variables, the app runs as a single-player demo, so you can try it before Supabase exists.

## Security notes
- The anon key is meant to be public. Row-level security in the migration restricts every table to circle members.
- Members can't promote themselves to owner, edit other people's check-ins, or read other circles.
- Presence (who's walking where) uses private Realtime channels with a membership check.
- Never put the `service_role` key in this app or in Vercel's environment variables.

## Credits
Temple Gate and Guan Yin Hall artwork supplied by the project owner. All other scenes and sprites are drawn in code.
