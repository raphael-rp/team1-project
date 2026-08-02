const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');

const testEmail = `mealtest_${Date.now()}@example.com`;
const testPassword = 'password123';

describe('Meals', () => {

  // An agent keeps cookies between requests, so once we log in, /addMeal stays authenticated.
  const agent = request.agent(app);

  beforeAll(async () => {
    await agent
      .post('/signup')
      .type('form')
      .send({
        username: 'Meal Tester',
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword
      });

    await agent
      .post('/login')
      .type('form')
      .send({ email: testEmail, password: testPassword });
  });

  afterAll(async () => {
    // Clean up only the account and meals this file created.
    const Account = mongoose.connection.collection('account');
    const Meal = mongoose.connection.collection('meals');

    const account = await Account.findOne({ email: testEmail });
    if (account) {
      await Meal.deleteMany({ accountId: account._id });
      await Account.deleteOne({ _id: account._id });
    }
    await mongoose.connection.close();
  });

  test('GET /addMeal redirects to /login when not authenticated', async () => {
    // Use a plain (non-agent) request here so it has no session cookie.
    const res = await request(app).get('/addMeal');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('POST /addMeal adds a meal for the logged-in user and redirects to /foodhistory', async () => {
    const res = await agent
      .post('/addMeal')
      .type('form')
      .send({
        mealName: 'Chicken Salad',
        calories: 450,
        mealDate: new Date().toISOString()
      });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/foodhistory');
  });

  test('GET /foodhistory shows the newly added meal', async () => {
    const res = await agent.get('/foodhistory');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Chicken Salad');
  });

});
