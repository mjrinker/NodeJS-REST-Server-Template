require('dotenv').config();

const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');
const request = require('request');
const Sequelize = require('sequelize');
const { spawn } = require('child_process');
const versionRouter = require('express-version-route');

const app = express();
const port = parseInt(process.env.SERVER_PORT, 10);

const transporters = {};

transporters.main = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_LOGIN,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const envVars = {
  functions: null,
  middleware: {},
  models: null,
  requires: {
    app,
    bcrypt,
    bodyParser,
    express,
    fs,
    jwt,
    nodemailer,
    path,
    request,
    Sequelize,
    sequelize: null,
    spawn,
    transporters,
    versionRouter,
  },
  versions: ['1.0.0'],
};

module.exports.envVars = envVars;
module.exports.app = app;

const middleware = {};

envVars.middleware = middleware;

const functions = require('./config/functions');

envVars.functions = functions;
const fn = functions;

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PW, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  port: Number(process.env.DB_PORT),
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

envVars.requires.sequelize = sequelize;

sequelize.authenticate().then(() => {
  console.log('Database connection has been established successfully.');
}).catch((err) => {
  console.error('Unable to connect to the database:', err);
});

const models = require('./config/models');

envVars.models = models;

middleware.auth = require('./middleware/auth');
middleware.requestVersion = require('./middleware/requestVersion');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, './views'));
app.use(express.static('public'));
app.use(require('cookie-parser')());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ extended: true }));

app.use(middleware.requestVersion.setVersionByHeader('Accept-Version'));

const routesDir = './routes/';
const ignoreRoutes = { authRoutes: true };
fs.readdir(routesDir, (err, files) => {
  files.forEach((file) => {
    if (!ignoreRoutes[file.replace(/\.js$/, '')]) {
      // eslint-disable-next-line global-require,import/no-dynamic-require
      require(`${routesDir}${file}`);
    }
  });
});

const child = spawn('node', ['authServer.js']);
child.stdout.on('data', (chunk) => {
  console.log('[AuthServer]', `${chunk}`.trim());
});
child.on('close', (code) => {
  console.log(`AuthServer exited with code ${code}`);
});

app.listen(port, () => console.log(`${process.env.SERVER_NAME} Auth Server started on port: ${port}`);
