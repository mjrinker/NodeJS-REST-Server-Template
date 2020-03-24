module.exports = (envVars) => {
  const { Sequelize, sequelize } = envVars.requires;

  class Token extends Sequelize.Model {}
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

  return Token;
};
