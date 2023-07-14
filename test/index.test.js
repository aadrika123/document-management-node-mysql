const request = require('supertest');
const app = require('../index'); // Import your Express application

// Write your test cases
test('Login with valid credentials should return 200 and access token', async () => {
    const response = await request(app)
        .post('/auth/login')
        .send({ email: 'water@gmail.com', password: '12345' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
});

test('Login with invalid credentials should return 401', async () => {
    const response = await request(app)
        .post('/auth/login')
        .send({ email: 'water@gmail.com', password: 'wrongpassword' });

    expect(response.status).toBe(401);
});

test('Login without required fields should return 400', async () => {
    const response = await request(app)
        .post('/auth/login')
        .send({ email: 'water@gmail.com' });

    expect(response.status).toBe(400);
}); 

test('View All Documents return should be 200', async () => {
    const response = await request(app)
        .post('/document/view-all')
        // .send({ email: 'water@gmail.com' });

    expect(response.status).toBe(200);
}); 