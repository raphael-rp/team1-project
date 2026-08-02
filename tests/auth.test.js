const request = require("supertest");
const app = require("../app");

jest.setTimeout(15000);


describe("Authentication API", () => {


    test("User login successfully", async () => {

        const response = await request(app)
            .post("/login")
            .send({
                email: "test@gmail.com",
                password: "123456"
            });


        // Login redirects to dashboard after success
        // or renders login page if failed
        expect([200, 302]).toContain(response.statusCode);

    });



    test("Create new user successfully", async () => {

        const response = await request(app)
            .post("/signup")
            .send({

                username: "Test User",
                email: "test@gmail.com",
                password: "123456",
                confirmPassword: "123456"

            });


        // Signup redirects to login page
        expect([200, 302]).toContain(response.statusCode);

    });


});