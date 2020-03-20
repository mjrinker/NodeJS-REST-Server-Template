const { envVars } = module.parent.exports;
const fn = envVars.functions;

const controller = require('../controllers/authController');

const prefix = '';

const routeList = [
  {
    path: '/change_password/:userId/:token',
    method: 'put',
    controller: 'authController',
    auth: false,
    versions: [
      { versions: envVars.versions, func: 'changePassword' },
    ],
  },
  {
    path: '/login',
    method: 'post',
    controller: 'authController',
    auth: false,
    versions: [
      { versions: envVars.versions, func: 'login' },
    ],
  },
  {
    path: '/logout',
    method: 'delete',
    controller: 'authController',
    auth: false,
    versions: [
      { versions: envVars.versions, func: 'logout' },
    ],
  },
  {
    path: '/refresh_token',
    method: 'put',
    controller: 'authController',
    auth: false,
    versions: [
      { versions: envVars.versions, func: 'refreshToken' },
    ],
  },
  {
    path: '/register',
    method: 'post',
    controller: 'authController',
    auth: false,
    versions: [
      { versions: envVars.versions, func: 'register' },
    ],
  },
  {
    path: '/reset_password',
    method: 'post',
    controller: 'authController',
    auth: false,
    versions: [
      { versions: envVars.versions, func: 'resetPassword' },
    ],
  },
];

fn.setRoutes({
  controller, prefix, routeList,
});
