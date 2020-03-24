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
      fn.console.log(fn.color('error', newError));
      next(newError);
    });
};


fn.color = (color, value) => `!c:${color}!${value}!/c!`;

fn.colors = {
  black: '0:0:0',
  blue: '0:123:255',
  cyan: '23:162:184',
  danger: '220:53:69',
  dark: '52:58:64',
  darkgray: '52:58:64',
  default: '192:204:219',
  error: '220:53:69',
  gray: '108:117:125',
  green: '40:167:69',
  grey: '108:117:125',
  indigo: '102:16:242',
  info: '23:162:184',
  light: '248:249:250',
  lime: '0:255:0',
  orange: '253:126:20',
  pink: '232:62:140',
  primary: '0:123:255',
  purple: '111:66:193',
  red: '220:53:69',
  secondary: '108:117:125',
  success: '40:167:69',
  teal: '32:201:151',
  warn: '255:193:7',
  warning: '255:193:7',
  white: '255:255:255',
  yellow: '255:193:7',
};

fn.console = {};
fn.console.log = (...args) => {
  const escapeCode = {
    start: '\x1b[38:2:',
    end: '\x1b[0m',
  };

  const newArgs = [];

  args.forEach((arg) => {
    const newArg = (String(arg)).split(/(?=!c:[\w#,:]+!.*?!\/c!)/g).map((subString) => {
      const colorCode = subString.replace(/.*!c:([\w#,:]+)!.*/, '$1');
      const color = fn.rgbColor(colorCode);
      const startCode = Number(process.env.COLOR_LOGS) ? `${escapeCode.start + color}m` : '';
      const endCode = Number(process.env.COLOR_LOGS) ? escapeCode.end : '';
      return subString.replace(/!c:([\w#,:]+)!/, startCode).replace(/!\/c!/, endCode);
    }).join('');

    newArgs.push(newArg);
  });

  console.log(...newArgs);
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

fn.rgbColor = (colorCode) => {
  let rgbColor = fn.colors[colorCode] || '';

  if (colorCode.startsWith('#')) {
    let redHex = 'ff';
    let greenHex = 'ff';
    let blueHex = 'ff';
    if (colorCode.length === 7) {
      redHex = colorCode.substring(1, 3);
      greenHex = colorCode.substring(3, 5);
      blueHex = colorCode.substring(5, 7);
    } else if (colorCode.length === 4) {
      redHex = colorCode.substring(1, 2) + colorCode.substring(1, 2);
      greenHex = colorCode.substring(2, 3) + colorCode.substring(2, 3);
      blueHex = colorCode.substring(3, 4) + colorCode.substring(3, 4);
    }
    const redDec = parseInt(redHex, 16);
    const greenDec = parseInt(greenHex, 16);
    const blueDec = parseInt(blueHex, 16);
    rgbColor = `${redDec}:${greenDec}:${blueDec}`;
  } else if (colorCode.search(/\d{1,3}[,:]\d{1,3}[,:]\d{1,3}/) === 0) {
    rgbColor = colorCode.replace(/,/g, ':');
  }

  return rgbColor;
};

fn.setRoutes = (params) => {
  params.routeList.forEach((route) => {
    const path = params.prefix + route.path;
    const versionRoutesObj = {};
    route.versions.forEach((versions) => {
      versions.versions.forEach((versionNumber) => {
        if (params.controller[versions.func]) {
          versionRoutesObj[versionNumber] = params.controller[versions.func];
        } else {
          fn.console.log('ROUTES:', fn.color('warn', versions.func), 'not found');
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
