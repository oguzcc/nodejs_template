const request = require('supertest');
const { User } = require('../../models/user');

let server;

describe('/api/auth', () => {
  beforeEach(() => {
    server = require('../../index');
  });

  afterEach(async () => {
    await server.close();
    await User.deleteMany({});
  });

  // POST /  api/auth  []
  describe('POST /', () => {
    let name;
    let email;
    let password;

    beforeEach(async () => {
      name = 'name1';
      email = 'email1@email.com';
      password = 'password1';
      return await request(server)
        .post('/api/users')
        .send({ name, email, password });
    });

    const exec = async () => {
      return await request(server).post('/api/auth').send({ email, password });
    };

    it('should return 400 if email is invalid', async () => {
      email = 'emailx@email.com';

      const res = await exec();

      expect(res.status).toBe(400);
    });

    it('should return 400 if password is invalid', async () => {
      password = 'passwordx';

      const res = await exec();

      expect(res.status).toBe(400);
    });

    it('should return 200 if it is valid', async () => {
      const res = await exec();

      expect(res.status).toBe(200);
      expect(res.headers).toHaveProperty('x-auth-token');
    });
  });
});
