const { envVars } = module.parent.exports;

const versions = [...envVars.versions];
versions.sort();

const versionsReversed = [...versions];
versionsReversed.reverse();

class versionRequest {
  static setVersion(version) {
    return (req, res, next) => {
      req.version = this.formatVersion(version);
      next();
    };
  }

  static setVersionByHeader(headerName) {
    return (req, res, next) => {
      if (req && req.headers) {
        const version = (headerName && req.headers[headerName.toLowerCase()]) || req.headers['x-api-version'];
        req.version = this.formatVersion(version);
      }

      next();
    };
  }

  static setVersionByQueryParam(queryParam, options = { removeQueryParam: false }) {
    return (req, res, next) => {
      if (req && req.query) {
        const version = (queryParam && req.query[queryParam.toLowerCase()]) || req.query['api-version'];
        if (version !== undefined) {
          req.version = this.formatVersion(version);
          if (options && options.removeQueryParam === true) {
            if (queryParam && req.query[queryParam.toLowerCase()]) {
              delete req.query[queryParam.toLowerCase()];
            } else {
              delete req.query['api-version'];
            }
          }
        }
      }
      next();
    };
  }

  static setVersionByAcceptHeader(customFunction) {
    return (req, res, next) => {
      if (req && req.headers && req.headers.accept) {
        if (customFunction && typeof customFunction === 'function') {
          req.version = this.formatVersion(customFunction(req.headers.accept));
        } else {
          const acceptHeader = String(req.headers.accept);
          const params = acceptHeader.split(';')[1];
          const paramMap = {};
          if (params) {
            // eslint-disable-next-line no-restricted-syntax
            for (const i of params.split(',')) {
              const keyValue = i.split('=');
              if (typeof keyValue === 'object' && keyValue[0] && keyValue[1]) {
                paramMap[this.removeWhitespaces(keyValue[0])
                  .toLowerCase()] = this.removeWhitespaces(keyValue[1]);
              }
            }
            req.version = this.formatVersion(paramMap.version);
          }

          if (req.version === undefined) {
            req.version = this.formatVersion(this.setVersionByAcceptFormat(req.headers));
          }
        }
      }

      next();
    };
  }

  // eslint-disable-next-line consistent-return
  static setVersionByAcceptFormat(headers) {
    const acceptHeader = String(headers.accept);
    const header = this.removeWhitespaces(acceptHeader);
    let start = header.indexOf('-v');
    if (start === -1) {
      start = header.indexOf('.v');
    }
    const end = header.indexOf('+');
    if (start !== -1 && end !== -1) {
      return header.slice(start + 2, end);
    }
  }

  static isObject(variable) {
    return typeof variable === 'object' || typeof variable === 'function';
  }

  static removeWhitespaces(str) {
    if (typeof str === 'string') {
      return str.replace(/\s/g, '');
    }

    return str;
  }

  // eslint-disable-next-line consistent-return
  static formatVersion(version) {
    if (!version || typeof version === 'function' || version === true) {
      return versionsReversed[0];
    }
    if (typeof version === 'object') {
      return JSON.stringify(version);
    }
    let ver = version.toString();
    const split = ver.split('.');
    if (split.length === 3) {
      return ver;
    }

    if (split.length === 2) {
      let foundMatch = false;
      // eslint-disable-next-line array-callback-return,no-restricted-syntax
      for (const apiVersion of versionsReversed) {
        const apiVersionSplit = apiVersion.split('.');
        if (split[0] === apiVersionSplit[0] && split[1] === apiVersionSplit[1]) {
          ver = apiVersion;
          foundMatch = true;
          break;
        }
      }
      if (foundMatch) {
        return ver;
      }
    }

    if (split.length === 1) {
      let foundMatch = false;
      // eslint-disable-next-line array-callback-return,no-restricted-syntax
      for (const apiVersion of versionsReversed) {
        const apiVersionSplit = apiVersion.split('.');
        if (split[0] === apiVersionSplit[0]) {
          ver = apiVersion;
          foundMatch = true;
          break;
        }
      }
      if (foundMatch) {
        return ver;
      }
    }

    if (split.length && split.length < 3) {
      // eslint-disable-next-line no-plusplus
      for (let i = split.length; i < 3; i++) {
        ver += '.0';
      }
      return ver;
    }

    if (split.length === 0) {
      return versionsReversed[0];
    }

    if (split.length > 3) {
      return split.slice(0, 3).join('.');
    }
  }
}

module.exports = versionRequest;
