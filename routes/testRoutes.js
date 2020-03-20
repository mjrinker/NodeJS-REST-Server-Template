const { envVars } = module.parent.exports;
const fn = envVars.functions;

const controller = require('../controllers/testController');

const prefix = '';

const routeList = [
  {
    path: '/test',
    method: 'get',
    controller: 'testController',
    auth: true,
    versions: [
      { versions: ['1.0.0', '1.0.1'], func: 'test_1' },
      { versions: ['2.0.0'], func: 'test_2_0_0' },
      { versions: ['2.1.0'], func: 'test_2_1_0' },
    ],
  },
];

fn.setRoutes({
  controller, prefix, routeList,
});
