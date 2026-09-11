# Hard Five: setup

One person does this once. About five minutes. After it, everyone else just opens the link on their phone.

Until step 5 is done the site runs in LOCAL mode: your own taps work on your own phone, and the other four runs are a sample crew. The stencil in the bottom corner says LOCAL. When it says LIVE, the crew is sharing one chain.

## 1. Create a Firebase project

1. Go to https://console.firebase.google.com and sign in with your Google account.
2. Click **Create a project**. Name it `hard-five`. Turn Google Analytics off (not needed). Create.

## 2. Turn on the database

1. In the left menu: **Build → Firestore Database → Create database**.
2. Location: **nam5 (United States)**. Mode: **Production**. Create.
3. Open the **Rules** tab, delete what is there, paste the contents of `firestore.rules` from this repo, and click **Publish**. The rules say: anyone signed in (anonymously is enough) who knows the crew id can read and write that crew. Nobody can list the crews.

## 3. Turn on anonymous sign-in

1. Left menu: **Build → Authentication → Get started**.
2. **Sign-in method** tab → **Anonymous** → Enable → Save.

Nobody makes an account. Each phone gets an invisible anonymous identity so the rules can tell "signed in" from "not".

## 4. Register the web app

1. Project overview (the gear next to it) → **Project settings** → scroll to **Your apps** → the `</>` (Web) icon.
2. Nickname `hard-five`. Do not tick Firebase Hosting. Register.
3. It shows a `firebaseConfig` object. Copy the whole thing.

## 5. Paste the config

Open `config.js` in this repo and replace the line

```js
export const FIREBASE = null;
```

with the object you copied, in this shape:

```js
export const FIREBASE = {
  apiKey: "...",
  authDomain: "hard-five-xxxxx.firebaseapp.com",
  projectId: "hard-five-xxxxx",
  appId: "1:...:web:..."
};
```

Optionally change `CREW` to any word you like. **The crew id is the only secret.** Anyone who has the site link plus the crew id can read and write the crew's chain. Keep it out of screenshots.

Commit and push. GitHub Pages redeploys in about a minute.

## 6. Authorise the domain

Authentication → **Settings** → **Authorised domains** → add `wadesellers.com`. (localhost is already there for testing.)

## 7. Put it on the phones

On each iPhone, in Safari:

1. Open https://wadesellers.com/hard-five/
2. Share button → **Add to Home Screen** → Add. It installs as an app with its own icon and no browser bars.
3. Open it. The deck log opens with WHO ARE YOU in chalk. Tap your name. That phone is you from now on.

The first phone to open the crew creates it with five runs: WADE and four blank names. Tap LOCAL in the bottom corner to open the deck log, tap a blank name to chalk it in, tap a day count to set where someone is (day 1 if you are all starting together).

## Costs

Firestore's free tier is thousands of times more than five people tapping six times a day. There is nothing to pay.

## If something is off

- Stencil still says LOCAL after step 5: the config did not deploy. Check `config.js` on GitHub, then hard-reload (in the installed app: delete it from the Home Screen and add it again).
- Taps do not reach other phones: Firestore rules not published (step 2.3) or anonymous sign-in not enabled (step 3). The browser console will say `permission-denied`.
- A phone claimed the wrong name: open the deck log (tap LOCAL/LIVE) and tap the margin next to the right name to move ME.
