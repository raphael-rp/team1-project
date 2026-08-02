const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const app = require("../app");

jest.setTimeout(15000);

const Workout = mongoose.model("Workout");
const Account = mongoose.model("Account");


describe("Workout API", () => {

    let agent;
    let accountId;

    beforeAll(async () => {

        const account = await Account.create({
            username: "Workout Tester",
            email: "workouttester@example.com",
            password: await bcrypt.hash("testpass123", 10)
        });

        accountId = account._id;

        agent = request.agent(app);

        await agent
            .post("/login")
            .send({
                email: "workouttester@example.com",
                password: "testpass123"
            });

    });

    afterAll(async () => {
        await Workout.deleteMany({ accountId });
        await Account.deleteOne({ _id: accountId });
    });


    test("Edit workout successfully", async () => {

        const workout = await Workout.create({
            accountId,
            activity: "Running",
            minutes: 20,
            caloriesBurned: 150,
            workoutDate: new Date("2026-01-01"),
            workoutTime: "07:00"
        });

        const response = await agent
            .post(`/editWorkout/${workout._id}`)
            .send({
                activity: "Cycling",
                minutes: 60,
                caloriesBurned: 500,
                workoutDate: "2026-04-10",
                workoutTime: "17:45"
            });

        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toBe("/exerciseHistory");

        const updated = await Workout.findById(workout._id).lean();
        expect(updated.activity).toBe("Cycling");
        expect(updated.minutes).toBe(60);
        expect(updated.caloriesBurned).toBe(500);
        expect(updated.workoutTime).toBe("17:45");

    });


});
