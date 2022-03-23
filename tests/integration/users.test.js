const request = require('supertest');
const { User } = require('../../models/user');
const mongoose = require('mongoose');

let server;

describe('/api/users', () => {
  beforeEach(() => {
    server = require('../../index');
  });
  afterEach(async () => {
    await server.close();
    await User.deleteMany({});
  });

  // GET /  api/users
  describe('GET /', () => {
    it('should return all users', async () => {
      const users = [
        { name: 'user1', email: '@email1', password: 'password1' },
        { name: 'user2', email: '@email2', password: 'password2' },
      ];

      await User.insertMany(users);

      const res = await request(server).get('/api/users');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(
        res.body.some((u) => u.name === 'user1' && u.email === '@email1')
      ).toBeTruthy();
      expect(
        res.body.some((u) => u.name === 'user2' && u.email === '@email2')
      ).toBeTruthy();
    });
  });

  // GET /:id  api/customers
  describe('GET /me', () => {
    let token;
    let user;

    const exec = async () => {
      return await request(server)
        .get('/api/users/me')
        .set('x-auth-token', token)
        .send(user);
    };

    beforeEach(async () => {
      user = new User({
        name: 'user1',
        email: '@email1',
        password: 'password1',
      });
      await user.save();
      token = user.generateAuthToken();
    });

    it('should return 401 if invalid token is passed', async () => {
      token = '';

      const res = await exec();

      expect(res.status).toBe(401);
    });

    it('should return a user if valid token is passed', async () => {
      const res = await exec();

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('name', user.name);
      expect(res.body).toHaveProperty('email', user.email);
    });
  });

  // POST /  api/users  [auth, validateObjectId]
  describe('POST /', () => {
    let name;
    let email;
    let password;

    const exec = async () => {
      return await request(server)
        .post('/api/users')
        .send({ name, email, password });
    };

    beforeEach(() => {
      name = 'name1';
      email = 'email1@email.com';
      password = 'password1';
    });

    it('should return 400 if user already registered', async () => {
      await exec();

      const res = await request(server)
        .post('/api/users')
        .send({ name, email, password });

      expect(res.status).toBe(400);
    });

    it('should return 400 if user name is less than 5 characters', async () => {
      name = '1234';

      const res = await exec();

      expect(res.status).toBe(400);
    });

    it('should return 400 if user name is more than 50 characters', async () => {
      name = new Array(52).join('a');

      const res = await exec();

      expect(res.status).toBe(400);
    });

    it('should return 400 if user email is less than 5 characters', async () => {
      email = '1234';

      const res = await exec();

      expect(res.status).toBe(400);
    });

    it('should return 400 if user email is more than 50 characters', async () => {
      email = new Array(52).join('a');

      const res = await exec();

      expect(res.status).toBe(400);
    });

    it('should return 400 if user email is not valid', async () => {
      email = '123456';

      const res = await exec();

      expect(res.status).toBe(400);
    });

    it('should save the user if it is valid', async () => {
      await exec();

      const user = await User.find({ name: 'user1' });

      expect(user).not.toBeNull();
    });

    it('should return the user if it is valid', async () => {
      const res = await exec();

      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('name', 'name1');
      expect(res.body).toHaveProperty('email', 'email1@email.com');
    });
  });

  // DELETE /:id  api/users
  describe('DELETE /:id', () => {
    let token;
    let user;
    let id;

    const exec = async () => {
      return await request(server)
        .delete('/api/users/' + id)
        .set('x-auth-token', token)
        .send();
    };

    beforeEach(async () => {
      // Before each test we need to create a customer and
      // put it in the database.
      user = new User({
        name: 'name1',
        email: 'email1@email.com',
        password: 'password1',
      });
      await user.save();

      id = user._id;
      token = new User({ isAdmin: true }).generateAuthToken();
    });

    it('should return 401 if client is not logged in', async () => {
      token = '';

      const res = await exec();

      expect(res.status).toBe(401);
    });

    it('should return 403 if the user is not an admin', async () => {
      token = new User({ isAdmin: false }).generateAuthToken();

      const res = await exec();

      expect(res.status).toBe(403);
    });

    it('should return 404 if id is invalid', async () => {
      id = 1;

      const res = await exec();

      expect(res.status).toBe(404);
    });

    it('should return 404 if no user with the given id was found', async () => {
      id = mongoose.Types.ObjectId();

      const res = await exec();

      expect(res.status).toBe(404);
    });

    it('should delete the customer if input is valid', async () => {
      await exec();

      const userInDb = await User.findById(id);

      expect(userInDb).toBeNull();
    });

    it('should return the removed user', async () => {
      const res = await exec();

      expect(res.body).toHaveProperty('_id', user._id.toHexString());
      expect(res.body).toHaveProperty('name', user.name);
      expect(res.body).toHaveProperty('email', user.email);
    });
  });
});
