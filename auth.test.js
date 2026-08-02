const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');

// Unique email per run so this never collides with a real account,
// and so re-running the suite doesn't hit the "Email already exists" case by accident.
const testEmail = `test_${Date.now()}@example.com`;
const testPassword = 'password123';

describe('Authentication', () => {

  afterAll(async () => {
    // Only remove the one account this file created — never wipe the whole database.
    const Account = mongoose.connection.collection('account');
    await Account.deleteOne({ email: testEmail });
    await mongoose.connection.close();
  });

  test('POST /signup creates a new account and redirects to /login', async () => {
    const res = await request(app)
      .post('/signup')
      .type('form')
      .send({
        username: 'Test User',
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword
      });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('POST /signup rejects a duplicate email', async () => {
    const res = await request(app)
      .post('/signup')
      .type('form')
      .send({
        username: 'Test User',
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword
      });

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Email already exists');
  });

  test('POST /signup rejects mismatched passwords', async () => {
    const res = await request(app)
      .post('/signup')
      .type('form')
      .send({
        username: 'Mismatch User',
        email: `mismatch_${Date.now()}@example.com`,
        password: 'abc123',
        confirmPassword: 'xyz789'
      });

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Passwords do not match');
  });

  test('POST /login succeeds with correct credentials and redirects to /', async () => {
    const res = await request(app)
      .post('/login')
      .type('form')
      .send({ email: testEmail, password: testPassword });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/');
  });

  test('POST /login fails with the wrong password', async () => {
    const res = await request(app)
      .post('/login')
      .type('form')
      .send({ email: testEmail, password: 'wrongpassword' });

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Invalid email or password');
  });

  test('POST /login fails for an email that does not exist', async () => {
    const res = await request(app)
      .post('/login')
      .type('form')
      .send({ email: 'doesnotexist@example.com', password: 'whatever' });

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Invalid email or password');
  });

});
