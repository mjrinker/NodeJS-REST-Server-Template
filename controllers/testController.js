const { envVars } = module.parent.parent.exports;
const fn = envVars.functions;

module.exports.test_1 = fn.asyncMw(async (req, res, next) => {
  res.json('success 1');
  return next();
});

module.exports.test_2_0_0 = fn.asyncMw(async (req, res, next) => {
  res.json('success 2.0.0');
  return next();
});

module.exports.test_2_1_0 = fn.asyncMw(async (req, res, next) => {
  res.json('success 2.1.0');
  return next();
});
