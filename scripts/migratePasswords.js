// One-time migration: hashes any plaintext passwords in the `account`
// collection with bcrypt. Safe to run more than once — accounts whose
// password already looks like a bcrypt hash are skipped untouched.
//
// Usage:
//   node scripts/migratePasswords.js
//
// Reads MONGODB_URI from the environment (via dotenv), same as the app.

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const accountSchema = new mongoose.Schema({
    username: String,
    email: { type: String, unique: true },
    password: String
});
const Account = mongoose.model("Account", accountSchema, "account");

// bcrypt hashes always look like $2a$10$... / $2b$10$... / $2y$10$..., 60 chars total.
function looksHashed(password) {
    return /^\$2[aby]\$\d{2}\$.{53}$/.test(password);
}

async function run() {

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to database:", mongoose.connection.name);

    const accounts = await Account.find({});
    console.log(`Found ${accounts.length} account(s) total.`);

    let migrated = 0;
    let skipped = 0;

    for (const account of accounts) {

        if (looksHashed(account.password)) {
            skipped++;
            continue;
        }

        const hashed = await bcrypt.hash(account.password, 10);

        await Account.updateOne(
            { _id: account._id },
            { $set: { password: hashed } }
        );

        console.log(`Hashed password for ${account.email}`);
        migrated++;

    }

    console.log(`\nDone. Migrated: ${migrated}, already hashed (skipped): ${skipped}`);

    await mongoose.disconnect();

}

run().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
