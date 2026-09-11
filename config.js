/* HARD FIVE : config
   FIREBASE null  -> the deck runs the LocalSample adapter (stencil LOCAL), exactly as the prototype.
   FIREBASE set   -> the Firestore adapter (stencil LIVE). Paste the web-app config object from the Firebase console:
     export const FIREBASE = { apiKey: '...', authDomain: '...', projectId: '...', appId: '...' };
   CREW is the crew id. Anyone who has it can read and write the crew's chain; it is the only secret. */
export const FIREBASE = null;
export const CREW = 'default';
