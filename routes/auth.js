const Joi = require('joi');
const bcrypt = require('bcrypt');
const { User } = require('../models/user');
const validateMiddleware = require('../middleware/validate');
const express = require('express');
const router = express.Router();

router.post('/', [validateMiddleware(validateAuth)], async (req, res) => {
  let user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).send('Invalid email.');

  const validPassword = await bcrypt.compare(req.body.password, user.password);
  if (!validPassword) return res.status(400).send('Invalid password.');

  const token = user.generateAuthToken();
  res.header('x-auth-token', token).send();
});

function validateAuth(req) {
  const schema = Joi.object({
    email: Joi.string().min(5).max(255).required().email(),
    password: Joi.string().min(5).max(255).required(),
  });

  return schema.validate(req);
}

module.exports = router;
