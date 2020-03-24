const { envVars } = module.parent.exports;
const { fs } = envVars.requires;

const models = {};

const files = fs.readdirSync('config/models/');
files.forEach((file) => {
  if (file.match(/\.js$/g)) {
    const modelName = file.replace(/\.js$/i, '');
    // eslint-disable-next-line global-require,import/no-dynamic-require
    models[modelName] = require(`./models/${modelName}`)(envVars);
  }
});

module.exports = models;
