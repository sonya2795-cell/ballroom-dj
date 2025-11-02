// server/tools/setAdmin.js
require("dotenv").config();
const admin = require("firebase-admin");

const serviceAccount = require("../firebase-key.json");
const UID = "rTQi5m6FOucZbARtPW5hIWP8z6k1";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function setAdmin(uid) {
  await admin.auth().setCustomUserClaims(uid, { role: "admin" });
  console.log(`✅ ${uid} is now an admin`);
}

setAdmin(UID)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
