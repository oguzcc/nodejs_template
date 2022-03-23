const request = require('supertest');
const { Customer } = require('../../models/customer');
const { Movie } = require('../../models/movie');
const { Genre } = require('../../models/genre');
const { Rental } = require('../../models/rental');
const { User } = require('../../models/user');
const mongoose = require('mongoose');

let server;

describe('/api/rentals', () => {
  beforeEach(() => {
    server = require('../../index');
  });
  afterEach(async () => {
    await server.close();
    await Customer.deleteMany({});
    await Movie.deleteMany({});
    await Genre.deleteMany({});
    await Rental.deleteMany({});
  });

  describe('GET /', () => {
    const customer1 = { name: 'customer1', phone: '1234567' };
    const customer2 = { name: 'customer2', phone: '1234567' };
    const movie1 = { title: 'title1', dailyRentalRate: 2 };
    const movie2 = { title: 'title2', dailyRentalRate: 2 };

    it('should return all rentals', async () => {
      const rentals = [
        { customer: customer1, movie: movie1 },
        { customer: customer2, movie: movie2 },
      ];

      await Rental.insertMany(rentals);

      const res = await request(server).get('/api/rentals');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(
        res.body.some((r) => r.customer.name === 'customer1')
      ).toBeTruthy();
      expect(res.body.some((r) => r.movie.title === 'title1')).toBeTruthy();
    });
  });

  describe('GET /:id', () => {
    it('should return a rental if valid id is passed', async () => {
      const rental = new Rental({
        customer: { name: 'customer1', phone: '1234567' },
        movie: { title: 'title1', phone: '1234567', dailyRentalRate: 2 },
      });
      await rental.save();

      const res = await request(server).get('/api/rentals/' + rental._id);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('customer.name', rental.customer.name);
      expect(res.body).toHaveProperty('movie.title', rental.movie.title);
    });

    it('should return 404 if invalid id is passed', async () => {
      const res = await request(server).get('/api/rentals/1');

      expect(res.status).toBe(404);
    });

    it('should return 404 if no rental with the given id exists', async () => {
      const id = mongoose.Types.ObjectId();
      const res = await request(server).get('/api/rentals/' + id);

      expect(res.status).toBe(404);
    });
  });

  // POST /   api/genres    [auth]
  describe('POST /', () => {
    let token;
    let customer;
    let customerId;
    let movie;
    let movieId;
    let genre;

    const exec = async () => {
      return await request(server)
        .post('/api/rentals')
        .set('x-auth-token', token)
        .send({ customerId: customerId, movieId: movieId });
    };

    afterEach(async () => {
      await Customer.deleteMany({});
      await Movie.deleteMany({});
      await Genre.deleteMany({});
      // await Rental.deleteMany({});
    });

    beforeEach(async () => {
      token = new User().generateAuthToken();

      genre = new Genre({ name: 'genre1' });
      await genre.save();

      customer = new Customer({ name: 'customer1', phone: '1234567' });
      await customer.save();
      customerId = customer._id;

      movie = new Movie({
        title: 'title1',
        genre: genre,
        dailyRentalRate: 2,
        numberInStock: 10,
      });
      await movie.save();
      movieId = movie._id;
    });

    it('should return 401 if client is not logged in', async () => {
      token = '';
      const res = await exec();
      expect(res.status).toBe(401);
    });

    it('should return 400 if customer not exist', async () => {
      customerId = mongoose.Types.ObjectId();
      const res = await exec();
      expect(res.status).toBe(400);
    });

    it('should return 400 if movie not exist', async () => {
      movieId = mongoose.Types.ObjectId();

      const res = await exec();
      expect(res.status).toBe(400);
    });

    it('should return 400 if movie not in stock', async () => {
      movie.numberInStock = 0;
      await movie.save();

      const res = await exec();
      expect(res.status).toBe(400);
    });

    // it('should numberInStock - 1', async () => {
    //   movie.title = 'titlex';
    //   await movie.save();

    //   await exec();
    //   const res = await Movie.findOne({ title: 'titlex' });
    //   expect(res.numberInStock).toBe(9);
    // });

    // it('should save the rental if it is valid', async () => {
    //   await exec();
    //   const rental = await Rental.find();
    //   expect(rental).not.toBeNull();
    // });

    it('should return the rental if it is valid', async () => {
      const res = await exec();
      expect(res.body).toHaveProperty('_id');
    });
  });
});
