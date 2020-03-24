module.exports = (envVars) => {
  const { Sequelize, sequelize } = envVars.requires;

  class User extends Sequelize.Model {}
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

  return User;
};
