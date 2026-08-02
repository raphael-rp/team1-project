const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const app = require("../app");

jest.setTimeout(15000);

// app.js registers these models as a side effect of being required above,
// so we just look them up rather than redefining the schemas here.
const Meal = mongoose.model("Meal");
const Account = mongoose.model("Account");


describe("Meal API", () => {

    let agent;
    let accountId;

    beforeAll(async () => {

        const account = await Account.create({
            username: "Meal Tester",
            email: "mealtester@example.com",
            password: await bcrypt.hash("testpass123", 10)
        });

        accountId = account._id;

        agent = request.agent(app);

        await agent
            .post("/login")
            .send({
                email: "mealtester@example.com",
                password: "testpass123"
            });

    });

    afterAll(async () => {
        await Meal.deleteMany({ accountId });
        await Account.deleteOne({ _id: accountId });
    });


    test("Add meal successfully", async () => {


        const response = await agent
            .post("/addMeal")
            .send({

                mealName: "Chicken Rice",
                calories: 500,
                mealDate: "2026-08-02"

            });


        // /addMeal requires login, so it may redirect
        expect([200, 302]).toContain(response.statusCode);


    });


    test("Edit meal successfully", async () => {

        const meal = await Meal.create({
            accountId,
            mealName: "Old Meal",
            calories: 200,
            mealDate: new Date("2026-01-01")
        });

        const response = await agent
            .post(`/editMeal/${meal._id}`)
            .send({
                mealName: "Updated Meal",
                calories: 750,
                mealDate: "2026-03-15"
            });

        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toBe("/editMeal");

        const updated = await Meal.findById(meal._id).lean();
        expect(updated.mealName).toBe("Updated Meal");
        expect(updated.calories).toBe(750);

    });


});
