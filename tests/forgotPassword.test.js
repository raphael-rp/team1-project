const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const app = require("../app");

jest.setTimeout(15000);

const Account = mongoose.model("Account");


describe("Forgot Password API", () => {

    let accountId;
    const email = "forgottester@example.com";
    const currentPassword = "OldPass123";

    beforeAll(async () => {

        const account = await Account.create({
            username: "Forgot Tester",
            email,
            password: await bcrypt.hash(currentPassword, 10)
        });

        accountId = account._id;

    });

    afterAll(async () => {
        await Account.deleteOne({ _id: accountId });
    });


    test("Rejects a password that fails the strength rules", async () => {

        const response = await request(app)
            .post("/forgot-password")
            .send({
                email,
                newPassword: "weak",
                confirmPassword: "weak"
            });

        expect(response.text).toContain("Password must be at least 8 characters");

    });


    test("Rejects an unknown email", async () => {

        const response = await request(app)
            .post("/forgot-password")
            .send({
                email: "doesnotexist@example.com",
                newPassword: "ValidPass123",
                confirmPassword: "ValidPass123"
            });

        expect(response.text).toContain("No account found with that email");

    });


    test("Rejects resetting to the same password", async () => {

        const response = await request(app)
            .post("/forgot-password")
            .send({
                email,
                newPassword: currentPassword,
                confirmPassword: currentPassword
            });

        expect(response.text).toContain("must be different from your current password");

    });


    test("Resets successfully with a valid new password, and the new password actually works", async () => {

        const newPassword = "FreshPass456";

        const resetResponse = await request(app)
            .post("/forgot-password")
            .send({
                email,
                newPassword,
                confirmPassword: newPassword
            });

        expect(resetResponse.statusCode).toBe(302);
        expect(resetResponse.headers.location).toBe("/login?reset=success");

        // Old password must no longer work
        const oldLogin = await request(app)
            .post("/login")
            .send({ email, password: currentPassword });

        expect(oldLogin.text).toContain("Invalid email or password");

        // New password must work
        const newLogin = await request(app)
            .post("/login")
            .send({ email, password: newPassword });

        expect(newLogin.statusCode).toBe(302);
        expect(newLogin.headers.location).toBe("/");

    });


});
