// Initialize firebase-admin only on the server and only if available.
// This file intentionally avoids a top-level `import "firebase-admin"` to prevent
// Next from trying to resolve the package for client builds when it's not installed.

let firestore: any = null;

async function initAdminIfPossible() {
  if (firestore !== null) return firestore;
  if (typeof window !== "undefined") return null; // do not init on client

  try {
    // Dynamically require to avoid bundler resolving this for client builds
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const admin = require("firebase-admin");

    if (!admin.apps.length) {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({ credential: admin.credential.cert(cred) });
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp();
      } else {
        // no creds: do not initialize admin
        return null;
      }
    }

    firestore = admin.firestore();
    return firestore;
  } catch (e) {
    // firebase-admin not available or initialization failed
    firestore = null;
    return null;
  }
}

export { initAdminIfPossible as firestore };
