const { envVars } = module.parent.parent.exports;
const { middleware } = envVars;
const { models } = envVars;
const { bcrypt } = envVars.requires;
const { jwt } = envVars.requires;
const { transporters } = envVars.requires;
const fn = envVars.functions;

module.exports.resetPassword = fn.asyncMw(async (req, res) => {
  const user = await models.User.findOne({
    where: {
      email: req.body.email,
    },
  });

  if (user) {
    const secret = `${user.password}.${user.created.toISOString().replace(/\D/g, '')}`;
    const token = jwt.sign({ user_id: user.id }, secret, { expiresIn: '15m' });
    const resetUrl = `http://${req.headers.host}/change_password/${user.id}/${token}`;
    const emailTemplate = {
      from: process.env.EMAIL_LOGIN,
      to: user.email,
      subject: 'Roam Password Reset',
      html: `
            <p>Hey ${user.first_name || user.email},</p>
            <p>We heard that you lost your Roam password. Sorry about that!</p>
            <p>But don&apos;t worry! You can use the following link to reset your password:</p>
            <a href="${resetUrl}">${resetUrl}</a>
            <p>If you don’t use this link within 15 minutes, it will expire.</p>
            `,
    };

    // eslint-disable-next-line consistent-return
    transporters.main.sendMail(emailTemplate, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json('Error sending email');
      }

      return res.status(200).json({
        message: 'A password reset link was sent to your email address.',
      });
    });
  }
});

module.exports.changePassword = fn.asyncMw(async (req, res, next) => {
  const { userId, token } = req.params;
  const { password, logout } = req.body;

  let message = 'We\'re sorry, but we weren\'t able to reset your password. Please click the "Forgot Password" link and try again.';

  if (!password
    || password.length < parseInt(process.env.MIN_PASSWORD_LENGTH, 10)) {
    message += ' Make sure your password follows the guidelines.';
    const error = new Error(message);
    res.status(400).json({
      type: 'BadRequestError',
      message,
      error: fn.getFullErrorObj(error),
    });
  }

  const user = await models.User.findByPk(userId);
  let payload = { user_id: null };
  try {
    const secret = `${user.password}.${user.created.toISOString().replace(/\D/g, '')}`;
    payload = jwt.verify(token, secret);
  } catch (err) {
    const error = new Error(message);
    if (err.name === 'TokenExpiredError') {
      message = 'We\'re sorry, but we weren\'t able to reset your password because the link has expired. Please click the "Forgot Password" link and try again.';
    }
    return res.status(401).json({
      type: 'UnauthorizedError',
      code: 'userAuthentication',
      message,
      error: fn.getFullErrorObj(error),
    });
  }
  if (payload.user_id === user.id) {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);
    const saved = await models.User.update({
      password: hashedPassword,
    }, {
      where: {
        id: user.id,
      },
    });

    if (saved) {
      if (logout) {
        await models.Token.destroy({
          where: {
            user_id: user.id,
          },
        });

        res.status(200)
          .json({
            message: 'Your password was successfully reset and you were logged out of all devices.',
          });
        return next();
      }

      return res.status(200).json({
        message: 'Your password was successfully reset.',
      });
    }
    const error = new Error(message);
    return res.status(500).json({
      type: 'ServerError',
      message,
      error: fn.getFullErrorObj(error),
    });
  }
  const error = new Error(message);
  return res.status(401).json({
    type: 'UnauthorizedError',
    code: 'userAuthentication',
    message,
    error: fn.getFullErrorObj(error),
  });
});

module.exports.login = fn.asyncMw(async (req, res, next) => {
  let message = 'There was a problem logging in.';
  const additionalMessage = 'Please check to make sure your email and password is correct and try again.';

  const user = await models.User.findOne({
    where: {
      email: fn.trim(req.body.email),
    },
    raw: true,
  });

  if (!user) {
    message += ` ${additionalMessage}`;
    const error = new Error(message);
    res.status(404).json({
      type: 'NotFoundError',
      message,
      error: fn.getFullErrorObj(error),
    });
    console.error(error);
  }

  try {
    if (!(await bcrypt.compare(req.body.password, user.password))) {
      message += ` ${additionalMessage}`;
      const error = new Error(message);
      res.status(401).json({
        type: 'UnauthorizedError',
        code: 'userAuthentication',
        message,
        error: fn.getFullErrorObj(error),
      });
      console.error(error);

      return next();
    }
  } catch (err) {
    res.status(500).json({
      type: 'ServerError',
      code: 'userAuthentication',
      message,
      error: fn.getFullErrorObj(err),
    });
    console.error(err);

    return next();
  }

  const accessToken = middleware.auth.generateAccessToken(user);
  const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET);

  const salt = await bcrypt.genSalt();
  const hashedRefreshToken = await bcrypt.hash(refreshToken, salt);

  await models.Token.create({
    user_id: user.id,
    refresh_token: hashedRefreshToken,
  });

  res.json({
    expiresInSeconds: 1800,
    accessToken,
    refreshToken,
  });

  return next();
});

// eslint-disable-next-line consistent-return
module.exports.logout = fn.asyncMw(middleware.auth.invalidateRefreshToken);

// eslint-disable-next-line consistent-return
module.exports.refreshToken = fn.asyncMw(async (req, res, next) => {
  const { refreshToken } = req.body;

  const message = 'There was a problem refreshing your access token.';

  if (!refreshToken) {
    const error = new Error(message);
    return res.status(401).json({
      type: 'UnauthorizedError',
      code: 'userAuthentication',
      message,
      error: fn.getFullErrorObj(error),
    });
  }

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        type: 'UnauthorizedError',
        code: 'userAuthorization',
        message,
        error: fn.getFullErrorObj(err),
      });
    }

    return models.Token.findAll({
      where: {
        user_id: user.id,
      },
    }).then(async (tokens) => {
      let tokenFound = false;
      // eslint-disable-next-line no-restricted-syntax
      for (const token of tokens) {
        // eslint-disable-next-line no-await-in-loop
        if (await bcrypt.compare(refreshToken, token.refresh_token)) {
          tokenFound = true;
          break;
        }
      }

      if (!tokenFound) {
        const error = new Error(message);
        return res.status(403).json({
          type: 'UnauthorizedError',
          code: 'userAuthorization',
          message,
          error: fn.getFullErrorObj(error),
        });
      }

      const accessToken = middleware.auth.generateAccessToken({ email: user.email });
      res.json({
        expiresInSeconds: 1800,
        accessToken,
      });
      return next();
    });
  });
});

module.exports.register = fn.asyncMw(async (req, res, next) => {
  let message = 'There was a problem registering.';

  const { password } = req.body;
  if (!password
    || password.length < parseInt(process.env.MIN_PASSWORD_LENGTH, 10)) {
    message += ' Make sure your password follows the guidelines.';
    const error = new Error(message);
    return res.status(400).json({
      type: 'BadRequestError',
      message,
      error: fn.getFullErrorObj(error),
    });
  }

  try {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);
    await models.User.create({
      first_name: req.body.firstName,
      last_name: req.body.lastName,
      email: req.body.email,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: 'Thank you for registering!',
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      message += ' A user with that email already exists.';
      return res.status(409).json({
        type: 'AlreadyExistsError',
        message,
        error: fn.getFullErrorObj(err),
      });
    }
    console.error(err);
    return res.status(500).json({
      type: 'ServerError',
      message,
      error: fn.getFullErrorObj(err),
    });
  }
});
