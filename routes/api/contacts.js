const Joi = require('joi');
const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const mongoose = require('mongoose');
const crypto = require('crypto');
const jimp = require('jimp');

const authenticate = require('../../middleware/authenticate');
const Contact = require('../../models/contacts');
const User = require('../../models/users');

require('dotenv').config();

const router = express.Router()

const secretKey = crypto.randomBytes(32).toString('hex');

const config = {
  host: 'smtp.meta.ua',
  port: 465,
  secure: true,
  auth: {
    user: 'tester202317@meta.ua',
    pass: "Meta2023",
  },
};

const transporter = nodemailer.createTransport(config);

const mailOptions = {
  from: 'tester202317@meta.ua',
  to: user.email,
  subject: 'Email Verification',
  text: `Click on the link to verify your email: ${verificationURL}`,
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.log('Error sending email:', error);
  } else {
    console.log('Email sent:', info.response);
  }
});

mongoose.connect('mongodb+srv://dbUser:User2023@cluster0.kymatmd.mongodb.net/')
  .then(() => {
    console.log('Database connection successful');
  })
  .catch((error) => {
    console.error('Database connection error:', error.message);
    process.exit(1);
  });
  
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'tmp');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

router.get('/verify/:verificationToken', async (req, res, next) => {
  try {
    const { verificationToken } = req.params;

    const user = await User.findOne({ verificationToken });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.verify) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    user.verify = true;
    user.verificationToken = null;
    await user.save();

    return res.status(200).json({ message: 'Email verification successful' });
  } catch (error) {
    next(error);
  }
});

router.post('/verify', async (req, res, next) => {
  try {
    const { email } = req.body;
ий
    const user = await User.findOne({ email, verify: false });

    if (!user) {
      return res.status(400).json({ message: 'Verification has already been passed' });
    }

    const newVerificationToken = uuid.v4();
    user.verificationToken = newVerificationToken;
    await user.save();

    const verificationURL = `http://localhost:3000/users/verify/${newVerificationToken}`;

    const mailOptions = {
      from: 'tester202317@meta.ua',
      to: user.email,
      subject: 'Email Verification',
      text: `Click on the link to verify your email: ${verificationURL}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });

    return res.status(200).json({ message: 'Verification email sent' });
  } catch (error) {
    next(error);
  }
});



router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const avatarURL = gravatar.url(email, { s: '250', d: 'retro' });
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email in use' });
    }

    const user = new User({
      email,
      password,
      verificationToken,
    });

    const token = jwt.sign({ userId: user._id }, secretKey, { expiresIn: '1h' });
    user.token = token;
    await user.save();

    const newVerificationToken = uuid.v4();
    user.verificationToken = newVerificationToken;
    await user.save();

    const verificationURL = `http://localhost:3000/users/verify/${newVerificationToken}`;

    const mailOptions = {
      from: 'tester202317@meta.ua',
      to: user.email,
      subject: 'Email Verification',
      text: `Click on the link to verify your email: ${verificationURL}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });

    res.status(201).json({ user: { email: user.email, subscription: user.subscription, verificationToken: user.verificationToken }, avatarURL, token, message: 'User registered. Verification email sent.'  });
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

router.patch('/avatars', authenticate, upload.single('avatar'), async (req, res, next) => {
  try {
    const user = req.user;

    const imagePath = path.join(__dirname, 'tmp', req.file.filename);
    const image = await jimp.read(imagePath);
    await image.cover(250, 250).write(imagePath);

    const avatarURL = `/avatars/${req.file.filename}`;
    const publicPath = path.join(__dirname, 'public', 'avatars', req.file.filename);
    await fs.promises.rename(imagePath, publicPath);

    user.avatarURL = avatarURL;
    await user.save();

    res.status(200).json({ avatarURL });
  } catch (error) {
    next(error);
  }
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