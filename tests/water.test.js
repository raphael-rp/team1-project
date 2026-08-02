const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const app = require("../app");

jest.setTimeout(15000);

const WaterGoal = mongoose.model("WaterGoal");
const Account = mongoose.model("Account");


describe("Water Goal API", () => {

    let agent;
    let accountId;

    beforeAll(async () => {

        const account = await Account.create({
            username: "Water Tester",
            email: "watertester@example.com",
            password: await bcrypt.hash("testpass123", 10)
        });

        accountId = account._id;

        agent = request.agent(app);

        await agent
            .post("/login")
            .send({
                email: "watertester@example.com",
                password: "testpass123"
            });

    });

    afterAll(async () => {
        await WaterGoal.deleteMany({ accountId });
        await Account.deleteOne({ _id: accountId });
    });


    test("Create water goal successfully (first time)", async () => {

        const response = await agent
            .post("/water-goal")
            .send({ goalMl: 2500 });

        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toBe("/water");

        const goal = await WaterGoal.findOne({ accountId }).lean();
        expect(goal).not.toBeNull();
        expect(goal.goalMl).toBe(2500);

    });


    test("Update existing water goal successfully", async () => {

        const response = await agent
            .post("/water-goal")
            .send({ goalMl: 3200 });

        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toBe("/water");

        const goal = await WaterGoal.findOne({ accountId }).lean();
        expect(goal.goalMl).toBe(3200);

    });


});
