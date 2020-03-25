const { envVars } = module.parent.exports;
const { app } = module.parent.exports;
const { middleware } = envVars;
const { versionRouter } = envVars.requires;

const fn = {};

// wrapper for async middleware functions so that error stack traces will be shown in console
// https://medium.com/@Abazhenov/using-async-await-in-express-with-node-8-b8af872c0016
// updated so it converts standard rejection message to error object
// so it can be handled by the error handler
fn.asyncMw = (func) => (req, res, next) => {
  Promise.resolve(func(req, res, next))
    .catch((error) => {
      let newError = error;
      if (!(error instanceof Error)) {
        const message = (error && typeof (error) === 'string') ? error : 'Server Error';
        newError = new Error(message);
      }
      console.error(newError);
      next(newError);
    });
};

// get all properties on an object, enumerable or non-enumerable
// as well as properties defined on the object's parent recursively
// for more info, see: https://stackoverflow.com/a/30158566/8793175
fn.getAllObjectPropertyNames = (obj) => {
  const allProperties = [];
  let newObj = obj;
  for (; newObj !== null; newObj = Object.getPrototypeOf(newObj)) {
    const ownProperties = Object.getOwnPropertyNames(newObj);
    ownProperties.forEach((ownProperty) => {
      if (!allProperties.includes(ownProperty)) {
        allProperties.push(ownProperty);
      }
    });
  }
  return allProperties;
};

fn.getFullErrorObj = (errorObj) => {
  const errorProps = fn.getAllObjectPropertyNames(errorObj);
  return JSON.parse(JSON.stringify(errorObj, errorProps));
};

fn.objToMap = (obj) => new Map(Object.entries(obj));

fn.setRoutes = (params) => {
  params.routeList.forEach((route) => {
    const path = params.prefix + route.path;
    const versionRoutesObj = {};
    route.versions.forEach((versions) => {
      versions.versions.forEach((versionNumber) => {
        if (params.controller[versions.func]) {
          versionRoutesObj[versionNumber] = params.controller[versions.func];
        } else {
          console.warn(`ROUTES: ${versions.func} not found`);
        }
      });
    });

    if (route.auth) {
      app[route.method](path, middleware.auth.authenticateToken,
        versionRouter.route(fn.objToMap(versionRoutesObj)));
    } else {
      app[route.method](path,
        versionRouter.route(fn.objToMap(versionRoutesObj)));
    }
  });
};

fn.trim = (value) => {
  if (value === null || value === undefined || value === false) {
    return '';
  }
  return String(value).trim();
};

module.exports = fn;
