const Router = {
  routes: {},
  currentRoute: null,

  init() {
    window.addEventListener('hashchange', () => this._handleRoute());
    this._handleRoute();
  },

  on(route, handler) {
    this.routes[route] = handler;
  },

  navigate(route, data) {
    if (data) {
      this._routeData = data;
    }
    window.location.hash = route;
  },

  getRouteData() {
    const data = this._routeData;
    this._routeData = null;
    return data;
  },

  getCurrentRoute() {
    return window.location.hash.slice(1) || '/auth';
  },

  _handleRoute() {
    const route = this.getCurrentRoute();
    this.currentRoute = route;

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    const handler = this.routes[route];
    if (handler) {
      handler();
    } else {
      // Default to auth
      this.navigate('/auth');
    }
  }
};
