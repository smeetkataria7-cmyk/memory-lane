# Memory Lane

One orb a day, colored by how the day actually felt.

Fill a single memory orb each day by holding down the emotions you felt — they
draw from one shared pool, so a day only has so much weight to go around. The
orb blends into a glazed sphere, joins your private lane, and the days that
matter rise into Journey on their own.

## What's in it

- **Today** — hold-to-fill emotion picker over a shared 100% pool, with the orb
  re-blending live as you fill it
- **Compose** — optional photo, video, voice note and written note. All optional
  by design: a mandatory journal is the fastest way to make people skip a day
- **Lane** — every day from your first entry to today. Missed days stay visible
  as blanks rather than quietly disappearing
- **Journey** — days that spike (one emotion over 70%) or sprawl (5+ emotions at
  once) land here automatically; you can also pin any day yourself
- **Moments** — a month rolled up: days filled, the dominant feeling, the spread,
  its heaviest and lightest day
- **Looking back** — flashbacks to this calendar day in past months and years,
  plus one Journey day resurfacing on its own each day
- **Board** — a closed friend group of up to 20. Orbs appear live as friends fill
  theirs. Colors only — notes and media never leave your lane
- **Streak** — a plant that grows seed → sprout → sapling → young tree → full
  tree, and resets when the run breaks

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a free project, then open the
SQL editor and run `supabase/migrations/0001_init.sql` in full. That creates the
tables, row-level security policies, the media storage bucket, and turns on
realtime for the board.

### 2. Point the app at it

```bash
cp .env.example .env
```

Fill in the URL from **Project Settings → Data API** and the key from
**Project Settings → API Keys**:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_your-key-here
```

Use the **publishable** key (`sb_publishable_...`; older projects call this the
anon/public key). It is meant to ship inside the app — row-level security is
what actually protects the data, and every table has it enabled.

Never use the **secret** key (`sb_secret_...`, or `service_role` on older
projects). It bypasses row-level security completely and has no business in a
mobile app.

### 3. Run it

```bash
npm install
npm start
```

Install **Expo Go** on your phone and scan the QR code. Phone and laptop need to
be on the same Wi-Fi. This is for developing — it only runs while the dev server
is up, so it is not how you hand the app to anyone else.

## Giving it to friends (Android)

This produces a real installable `.apk` with its own icon. No Play Store, no
fees, and it keeps working when your laptop is off.

```bash
npm install -g eas-cli
eas login                 # free Expo account
eas init                  # links this project, once
```

The app's Supabase values are baked in at build time, and `.env` is not uploaded
to EAS, so set them once as build-time environment variables:

```bash
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL \
  --value "https://your-project-ref.supabase.co" --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "sb_publishable_your-key-here" --visibility plaintext
```

Then build:

```bash
eas build --platform android --profile preview
```

The build runs on Expo's servers (~10-15 minutes on the free tier) and ends with
a download link. Share that link — or the `.apk` itself — in the group chat.
Friends tap it, accept Android's "install from unknown source" prompt once, and
they're in.

To ship a fix later, rebuild and send the new link.

### iPhone friends

There is no free route. Apple requires a **$99/year** Developer Program account
to put an app on someone's iPhone via TestFlight. Until then, iPhone users can
run it through Expo Go with `eas update`, which works but lives inside Expo Go
rather than having its own icon.

## How privacy works here

Your notes, media and emotion breakdown are readable only by you — enforced by
row-level security at the database, not just hidden in the UI.

Sharing to the group board writes a single color to a separate `board_posts`
table. That table has no column that could carry a note, a file, or which
emotions you picked, so there is nothing to leak by accident. Turning sharing
off deletes the row.

## Commands

```bash
npm start          # Expo dev server
npm run typecheck  # tsc --noEmit
npm run android    # open on Android
npm run ios        # open on iOS (needs macOS)
```

## Stack

Expo SDK 57 · React Native 0.86 · expo-router · TypeScript · Supabase
(Postgres + Auth + Storage + Realtime) · react-native-svg for the orb and plant
