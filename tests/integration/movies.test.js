const request = require('supertest');
const { Movie } = require('../../models/movie');
const { Genre } = require('../../models/genre');
const { User } = require('../../models/user');
const mongoose = require('mongoose');

let server;

describe('/api/movies', () => {
  beforeEach(() => {
    server = require('../../index');
  });
  afterEach(async () => {
    await server.close();
    await Movie.deleteMany({});
    await Genre.deleteMany({});
  });

  // GET /    api/movies    []
  describe('GET /', () => {
    let movies;

    beforeEach(async () => {
      movies = [
        {
          title: 'movie1',
          genre: { name: 'genre1' },
          numberInStock: 10,
          dailyRentalRate: 2,
        },
        {
          title: 'movie2',
          genre: { name: 'genre2' },
          numberInStock: 20,
          dailyRentalRate: 2,
        },
      ];
      await Movie.insertMany(movies);
    });

    const exec = async () => {
      return await request(server).get('/api/movies');
    };

    it('should return all movies', async () => {
      const res = await exec();

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body.some((m) => m.title === 'movie1')).toBeTruthy();
      expect(res.body.some((m) => m.title === 'movie2')).toBeTruthy();
    });
  });

  // GET /:id   api/movies/:id    [validateObjectId]
  describe('GET /:id', () => {
    let movie;
    let movieId;

    beforeEach(async () => {
      movie = new Movie({
        title: 'movie1',
        genre: { name: 'genre1' },
        numberInStock: 10,
        dailyRentalRate: 2,
      });
      await movie.save();
      movieId = movie._id;
    });

    const exec = async () => {
      return await request(server).get('/api/movies/' + movieId);
    };

    it('should return 404 if invalid id is passed', async () => {
      movieId = '1';

      const res = await exec();

      expect(res.status).toBe(404);
    });

    it('should return 404 if no movie with the given id exists', async () => {
      movieId = mongoose.Types.ObjectId();

      const res = await exec();

      expect(res.status).toBe(404);
    });

    it('should return a movie if valid id is passed', async () => {
      const res = await exec();

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title', movie.title);
    });
  });

  // POST /   api/movies    [auth, validateMiddleware]
  describe('POST /', () => {
    let token;
    let title;
    let genreId;
    let genre;
    let numberInStock;
    let dailyRentalRate;

    beforeEach(async () => {
      token = new User().generateAuthToken();

      genre = new Genre({ name: 'genre1' });
      await genre.save();

      genreId = genre._id;

      title = 'movie1';

      numberInStock = 10;
      dailyRentalRate = 2;
    });

    const exec = async () => {
      return await request(server)
        .post('/api/movies')
        .set('x-auth-token', token)
        .send({ title, genreId, numberInStock, dailyRentalRate });
    };

    it('should return 400 if genreId is not valid', async () => {
      genreId = mongoose.Types.ObjectId();

      const res = await exec();

      expect(res.status).toBe(400);
    });

    it('should return 401 if client is not logged in', async () => {
      token = '';

      const res = await exec();

      expect(res.status).toBe(401);
    });

    it('should return 400 if movie title is less than 5 characters', async () => {
      title = '1234';

      const res = await exec();

      expect(res.status).toBe(400);
    });

    it('should return 400 if movie title is more than 50 characters', async () => {
      title = new Array(52).join('a');

      const res = await exec();

      expect(res.status).toBe(400);
    });

    it('should save the movie if it is valid', async () => {
      await exec();

      const movie = await Movie.find({ title: 'movie1' });

      expect(movie).not.toBeNull();
    });

    it('should return the movie if it is valid', async () => {
      const res = await exec();

      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('title', 'movie1');
    });
  });

  // PUT /:id   api/movies    {}
  describe('PUT /:id', () => {
    let token;
    let title;
    let genreId;
    let genre;
    let numberInStock;
    let dailyRentalRate;
    let newTitle;
    let newNumberInStock;
    let newDailyRentalRate;
    let newGenre;
    let movie;
    let movieId;

    beforeEach(async () => {
      // Before each test we need to create a genre and a movie,
      // and put it in the database.
      genre = new Genre({ name: 'genre1' });
      await genre.save();

      movie = new Movie({
        title: 'movie1',
        genre: genre,
        numberInStock: 10,
        dailyRentalRate: 2,
      });
      await movie.save();

      movieId = movie._id;
      genreId = genre._id;
      token = new User().generateAuthToken();
      newTitle = 'updatedTitle';
      newNumberInStock = 9;
      newDailyRentalRate = 3;
    });

    const exec = async () => {
      return await request(server)
        .put('/api/movies/' + movieId)
        .set('x-auth-token', token)
        .send({
          title: newTitle,
          genreId: genreId,
          numberInStock: newNumberInStock,
          dailyRentalRate: newDailyRentalRate,
        });
    };

    it('should return 400 if genreId is not valid', async () => {
      genreId = mongoose.Types.ObjectId();

      const res = await exec();

      expect(res.status).toBe(400);
    });

    it('should return 401 if client is not logged in', async () => {
      token = '';

      const res = await exec();

      expect(res.status).toBe(401);
    });

    it('should return 400 if movie title is less than 5 characters', async () => {
      newTitle = '1234';

      const res = await exec();

      expect(res.status).toBe(400);
    });

    it('should return 400 if movie title is more than 50 characters', async () => {
      newTitle = new Array(52).join('a');

      const res = await exec();

      expect(res.status).toBe(400);
    });

    it('should return 404 if movieId is invalid', async () => {
      movieId = '1';

      const res = await exec();

      expect(res.status).toBe(404);
    });

    it('should return 404 if movie with the given movieId was not found', async () => {
      movieId = mongoose.Types.ObjectId();

      const res = await exec();

      expect(res.status).toBe(404);
    });

    it('should update the movie if input is valid', async () => {
      await exec();

      const updatedMovie = await Movie.findById(movie._id);

      expect(updatedMovie.title).toBe(newTitle);
    });

    it('should return the updated movie if it is valid', async () => {
      const res = await exec();

      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('title', newTitle);
      expect(res.body).toHaveProperty('numberInStock', newNumberInStock);
      expect(res.body).toHaveProperty('dailyRentalRate', newDailyRentalRate);
    });
  });

  describe('DELETE /:id', () => {
    let token;
    let genre;
    let movie;
    let id;

    beforeEach(async () => {
      // Before each test we need to create a genre and
      // put it in the database.
      genre = new Genre({ name: 'genre1' });
      await genre.save();

      movie = new Movie({
        title: 'movie1',
        genre: genre,
        numberInStock: 10,
        dailyRentalRate: 2,
      });
      await movie.save();

      id = movie._id;
      token = new User({ isAdmin: true }).generateAuthToken();
    });

    const exec = async () => {
      return await request(server)
        .delete('/api/movies/' + id)
        .set('x-auth-token', token)
        .send();
    };

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
      id = '1';

      const res = await exec();

      expect(res.status).toBe(404);
    });

    it('should return 404 if no movie with the given id was found', async () => {
      id = mongoose.Types.ObjectId();

      const res = await exec();

      expect(res.status).toBe(404);
    });

    it('should delete the movie if input is valid', async () => {
      await exec();

      const movieInDb = await Movie.findById(id);

      expect(movieInDb).toBeNull();
    });

    it('should return the removed movie', async () => {
      const res = await exec();

      expect(res.body).toHaveProperty('_id', movie._id.toHexString());
      expect(res.body).toHaveProperty('title', movie.title);
    });
  });
});
