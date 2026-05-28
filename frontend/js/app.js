const App = {
  init() {
    ApiClient.init();

    Router.on('/auth', () => {
      this._showView('view-auth');
      AuthModule.renderAuthGate();
    });

    Router.on('/upload', () => {
      if (!AuthModule.isAuthenticated()) return Router.navigate('/auth');
      this._showView('view-upload');
      ReceiptUploader.init(document.getElementById('view-upload'));
    });

    Router.on('/edit', () => {
      if (!AuthModule.isAuthenticated()) return Router.navigate('/auth');
      this._showView('view-edit');
      const data = Router.getRouteData();
      ExpenseEditor.init(document.getElementById('view-edit'));
      if (data) ExpenseEditor.render(data);
    });

    Router.on('/expenses', () => {
      if (!AuthModule.isAuthenticated()) return Router.navigate('/auth');
      this._showView('view-expenses');
      ExpenseList.init(document.getElementById('view-expenses'));
      ExpenseList.load();
    });

    // Auth state callback
    AuthModule.init(() => {
      if (AuthModule.isAuthenticated()) {
        this._showHeader(true);
        if (Router.getCurrentRoute() === '/auth') {
          Router.navigate('/upload');
        }
      } else {
        this._showHeader(false);
        Router.navigate('/auth');
      }
    });

    // Sign out button
    document.getElementById('sign-out-btn').addEventListener('click', () => {
      AuthModule.signOut();
      this._showHeader(false);
      Router.navigate('/auth');
    });

    Router.init();
  },

  _showView(id) {
    document.querySelectorAll('.view').forEach(v => {
      v.classList.remove('active');
      v.style.display = 'none';
    });
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('active');
      el.style.display = 'block';
    }
  },

  _showHeader(show) {
    const header = document.getElementById('app-header');
    if (show) {
      header.classList.remove('hidden');
    } else {
      header.classList.add('hidden');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
