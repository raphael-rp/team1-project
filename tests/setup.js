// Runs once per test file, before that file's tests execute, and gives
// every test a real Mongoose connection instead of silently buffering
// forever against a database that was never connected.
require("dotenv").config({ path: ".env.test" });

const mongoose = require("mongoose");

beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
});

afterAll(async () => {
    await mongoose.connection.close();
});
