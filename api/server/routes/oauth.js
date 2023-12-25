const passport = require('passport');
const express = require('express');
const router = express.Router();
const { setAuthTokens } = require('~/server/services/AuthService');
const { loginLimiter, checkBan } = require('~/server/middleware');
const { logger } = require('~/config');
const fs = require('fs').promises;
const path = require('path');

const domains = {
  client: process.env.DOMAIN_CLIENT,
  server: process.env.DOMAIN_SERVER,
};

router.use(loginLimiter);

const usersFilePath = path.join(__dirname, '../../../users/users.txt');
let usersFileExists = true;

fs.access(usersFilePath)
  .then(() => (usersFileExists = true))
  .catch(() => {
    usersFileExists = false;
    logger.warn('users.txt does not exist. User restrictions are not being enforced.');
  });

const oauthHandler = async (req, res) => {
  try {
    await checkBan(req, res);
    if (req.banned) {
      return;
    }

    logger.info(`User logged in: ${req.user.email}`);
    if (usersFileExists) {
      try {
        const data = await fs.readFile(usersFilePath, 'utf8');
        const users = data.split(/(\r\n|\r|\n)/);
        if (!users.includes(req.user.email)) {
          res.status(403).send(`
          <h1>You cannot log in because you are not registered in the system</h1>
          <button onclick="location.href='/'">Back to Home</button>
        `);
          logger.warn(`User denied access: not listed in users.txt: ${req.user.email}`);
          return;
        }
      } catch (err) {
        if (err.code === 'ENOENT') {
          // users.txt does not exist, log a warning and continue
          logger.warn('users.txt does not exist. User restrictions are not being enforced.');
        } else {
          // An unexpected error occurred, log it and return
          logger.error('Error reading users.txt:', err);
          return;
        }
      }
    }

    await setAuthTokens(req.user._id, res);
    res.redirect(domains.client);
  } catch (err) {
    logger.error('Error in setting authentication tokens:', err);
  }
};

/**
 * Google Routes
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['openid', 'profile', 'email'],
    session: false,
  }),
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${domains.client}/login`,
    failureMessage: true,
    session: false,
    scope: ['openid', 'profile', 'email'],
  }),
  oauthHandler,
);

router.get(
  '/facebook',
  passport.authenticate('facebook', {
    scope: ['public_profile'],
    profileFields: ['id', 'email', 'name'],
    session: false,
  }),
);

router.get(
  '/facebook/callback',
  passport.authenticate('facebook', {
    failureRedirect: `${domains.client}/login`,
    failureMessage: true,
    session: false,
    scope: ['public_profile'],
    profileFields: ['id', 'email', 'name'],
  }),
  oauthHandler,
);

router.get(
  '/openid',
  passport.authenticate('openid', {
    session: false,
  }),
);

router.get(
  '/openid/callback',
  passport.authenticate('openid', {
    failureRedirect: `${domains.client}/login`,
    failureMessage: true,
    session: false,
  }),
  oauthHandler,
);

router.get(
  '/github',
  passport.authenticate('github', {
    scope: ['user:email', 'read:user'],
    session: false,
  }),
);

router.get(
  '/github/callback',
  passport.authenticate('github', {
    failureRedirect: `${domains.client}/login`,
    failureMessage: true,
    session: false,
    scope: ['user:email', 'read:user'],
  }),
  oauthHandler,
);
router.get(
  '/discord',
  passport.authenticate('discord', {
    scope: ['identify', 'email'],
    session: false,
  }),
);

router.get(
  '/discord/callback',
  passport.authenticate('discord', {
    failureRedirect: `${domains.client}/login`,
    failureMessage: true,
    session: false,
    scope: ['identify', 'email'],
  }),
  oauthHandler,
);

module.exports = router;
