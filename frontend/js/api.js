const ApiClient = {
  _baseUrl: '',

  init() {
    this._baseUrl = (window.APP_CONFIG && window.APP_CONFIG.apiEndpoint) || '';
    // Remove trailing slash
    this._baseUrl = this._baseUrl.replace(/\/$/, '');
  },

  async request(method, path, body) {
    const token = AuthModule.getIdToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = token;
    }

    const opts = { method, headers };
    if (body) {
      opts.body = JSON.stringify(this._toSnakeCase(body));
    }

    try {
      const res = await fetch(`${this._baseUrl}${path}`, opts);

      if (res.status === 401) {
        Router.navigate('/auth');
        throw new Error('Session expired. Please sign in again.');
      }

      const data = await res.json();

      if (!res.ok) {
        const msg = (data.error && data.error.message) || data.message || 'Request failed';
        throw new Error(msg);
      }

      return this._toCamelCase(data);
    } catch (err) {
      if (err.message === 'Session expired. Please sign in again.') throw err;
      if (err instanceof TypeError) {
        throw new Error('Network error. Please check your connection.');
      }
      throw err;
    }
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },

  // snake_case → camelCase
  _toCamelCase(obj) {
    if (Array.isArray(obj)) return obj.map(i => this._toCamelCase(i));
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).reduce((acc, key) => {
        const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        acc[camel] = this._toCamelCase(obj[key]);
        return acc;
      }, {});
    }
    return obj;
  },

  // camelCase → snake_case
  _toSnakeCase(obj) {
    if (Array.isArray(obj)) return obj.map(i => this._toSnakeCase(i));
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).reduce((acc, key) => {
        const snake = key.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
        acc[snake] = this._toSnakeCase(obj[key]);
        return acc;
      }, {});
    }
    return obj;
  }
};
