const { envVars } = module.parent.exports;
const { Sequelize } = envVars.requires;
const { sequelize } = envVars.requires;
const models = {};
const { Model } = Sequelize;

class User extends Model {}
models.User = User;
User.init({
  // attributes
  email: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  first_name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  last_name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'user',
  paranoid: true,
  createdAt: 'created',
  updatedAt: 'modified',
  deletedAt: 'deleted',
});

class Token extends Model {}
models.Token = Token;
Token.init({
  // attributes
  user_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  refresh_token: {
    type: Sequelize.STRING,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'token',
  paranoid: true,
  createdAt: 'created',
  updatedAt: 'modified',
  deletedAt: 'deleted',
});

module.exports = models;
