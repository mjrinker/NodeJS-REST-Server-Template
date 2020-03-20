const { envVars } = module.parent.exports;
const { models } = envVars;
const { bcrypt } = envVars.requires;
const { jwt } = envVars.requires;
const fn = envVars.functions;

module.exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    const message = 'There was a problem logging in.';
    const error = new Error(message);
    return res.status(401).json({
      type: 'UnauthorizedError',
      code: 'userAuthentication',
      message,
      error: fn.getFullErrorObj(error),
    });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      const message = 'There was a problem logging in.';
      const error = new Error(message);
      return res.status(403).json({
        type: 'UnauthorizedError',
        code: 'userAuthorization',
        message,
        error: fn.getFullErrorObj(error),
      });
    }

    req.user = user;
    return next();
  });

  return next();
};

module.exports.generateAccessToken = (user) => jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30m' });

// eslint-disable-next-line consistent-return
module.exports.invalidateRefreshToken = async (req, res, next) => {
  const { refreshToken } = req.body;

  const message = 'There was a problem logging out.';

  if (!refreshToken) {
    const error = new Error(message);
    return res.status(401)
      .json({
        type: 'UnauthorizedError',
        code: 'userAuthentication',
        message,
        error: fn.getFullErrorObj(error),
      });
  }

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.status(403)
        .json({
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
    })
      .then(async (tokens) => {
        if (tokens.length === 0) {
          res.status(200)
            .json({
              message: 'You have successfully logged out.',
            });
          return next();
        }

        let tokenToDelete = null;
        // eslint-disable-next-line no-restricted-syntax
        for (const token of tokens) {
          // eslint-disable-next-line no-await-in-loop
          if (await bcrypt.compare(refreshToken, token.refresh_token)) {
            tokenToDelete = token;
            break;
          }
        }

        if (!tokenToDelete) {
          const error = new Error(message);
          return res.status(403)
            .json({
              type: 'UnauthorizedError',
              code: 'userAuthorization',
              message,
              error: fn.getFullErrorObj(error),
            });
        }

        await models.Token.destroy({
          where: {
            id: tokenToDelete.id,
          },
        });

        res.status(200)
          .json({
            message: 'You have successfully logged out.',
          });
        return next();
      });
  });
};
