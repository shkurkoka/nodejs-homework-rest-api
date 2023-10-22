const Joi = require('joi');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const authenticate = require('../../middleware/authenticate');
const Contact = require('../../models/contacts');
const User = require('../../models/users');

const router = express.Router()

const secretKey = crypto.randomBytes(32).toString('hex');

mongoose.connect('mongodb+srv://dbUser:User2023@cluster0.kymatmd.mongodb.net/')
  .then(() => {
    console.log('Database connection successful');
  })
  .catch((error) => {
    console.error('Database connection error:', error.message);
    process.exit(1);
  });


router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ email, password: hashedPassword });

    await user.save();

    const token = jwt.sign({ userId: user._id }, secretKey, { expiresIn: '1h' });

    user.token = token;
    await user.save();

    res.status(201).json({ user: { email: user.email, subscription: user.subscription }, token });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Email or password is wrong' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Email or password is wrong' });
    }

    const token = jwt.sign({ userId: user._id }, secretKey, { expiresIn: '1h' });

    user.token = token;
    await user.save();

    res.status(200).json({ token, user: { email: user.email, subscription: user.subscription } });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    user.token = '';
    await user.save();

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/current', authenticate, async (req, res) => {
  res.status(200).json({ email: req.user.email, subscription: req.user.subscription });
});



router.get('/', authenticate, async (req, res, next) => {
  try {
    const contactsList = await Contact.find();
    res.status(200).json(contactsList);
  } catch (error) {
    next(error);
  }
});

router.get('/:contactId', authenticate, async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.contactId);
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    res.status(200).json(contact);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { error } = contactSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const newContact = new Contact(req.body);
    await newContact.save();
    res.status(201).json(newContact);
  } catch (error) {
    next(error);
  }
});

router.delete('/:contactId', authenticate, async (req, res, next) => {
  try {
    const deletedContact = await Contact.findByIdAndDelete(req.params.contactId);
    if (!deletedContact) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    res.status(200).json({ message: 'Contact deleted' });
  } catch (error) {
    next(error);
  }
});

router.put('/:contactId', authenticate, async (req, res, next) => {
  try {
    const { error } = contactSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const updatedContact = await Contact.findByIdAndUpdate(
      req.params.contactId,
      req.body,
      { new: true }
    );

    if (!updatedContact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.status(200).json(updatedContact);
  } catch (error) {
    next(error);
  }
});

router.patch('/:contactId/favorite', authenticate, async (req, res, next) => {
  try {
    const { error } = favoriteSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ message: 'Missing field favorite' });
    }

    const contactId = req.params.contactId;
    const { favorite } = req.body;

    const updatedContact = await Contact.findByIdAndUpdate(
      contactId,
      { favorite },
      { new: true }
    );

    if (!updatedContact) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.status(200).json(updatedContact);
  } catch (error) {
    next(error);
  }
});

module.exports = router;