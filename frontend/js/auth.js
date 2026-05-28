const AuthModule = {
  _userPool: null,
  _currentUser: null,
  _session: null,
  _onAuthChange: null,

  init(onAuthChange) {
    this._onAuthChange = onAuthChange;
    const poolData = {
      UserPoolId: window.APP_CONFIG.userPoolId,
      ClientId: window.APP_CONFIG.userPoolClientId
    };
    this._userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    this._currentUser = this._userPool.getCurrentUser();

    if (this._currentUser) {
      this._currentUser.getSession((err, session) => {
        if (err || !session || !session.isValid()) {
          this._session = null;
          this._currentUser = null;
        } else {
          this._session = session;
        }
        if (this._onAuthChange) this._onAuthChange();
      });
    } else {
      if (this._onAuthChange) this._onAuthChange();
    }
  },

  isAuthenticated() {
    return !!(this._session && this._session.isValid());
  },

  getSession() {
    return this._session;
  },

  getIdToken() {
    if (this._session && this._session.isValid()) {
      return this._session.getIdToken().getJwtToken();
    }
    return null;
  },

  signUp(email, password, callback) {
    const attributeList = [
      new AmazonCognitoIdentity.CognitoUserAttribute({ Name: 'email', Value: email })
    ];
    this._userPool.signUp(email, password, attributeList, null, (err, result) => {
      if (err) {
        callback(this._sanitizeError(err));
        return;
      }
      callback(null, result);
    });
  },

  confirmSignUp(email, code, callback) {
    const userData = { Username: email, Pool: this._userPool };
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
    cognitoUser.confirmRegistration(code, true, (err, result) => {
      if (err) {
        callback(this._sanitizeError(err));
        return;
      }
      callback(null, result);
    });
  },

  signIn(email, password, callback) {
    const authDetails = new AmazonCognitoIdentity.AuthenticationDetails({
      Username: email,
      Password: password
    });
    const userData = { Username: email, Pool: this._userPool };
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => {
        this._currentUser = cognitoUser;
        this._session = session;
        if (this._onAuthChange) this._onAuthChange();
        callback(null, session);
      },
      onFailure: (err) => {
        callback(this._sanitizeError(err));
      }
    });
  },

  signOut() {
    if (this._currentUser) {
      this._currentUser.signOut();
    }
    this._currentUser = null;
    this._session = null;
    if (this._onAuthChange) this._onAuthChange();
  },

  _sanitizeError(err) {
    // Don't reveal whether email exists
    const msg = err.message || String(err);
    if (err.code === 'UserNotFoundException' || err.code === 'NotAuthorizedException') {
      return new Error('Incorrect email or password.');
    }
    if (err.code === 'UsernameExistsException') {
      return new Error('An account with this email already exists.');
    }
    if (err.code === 'InvalidPasswordException') {
      return new Error('Password must be at least 8 characters with uppercase, lowercase, number, and symbol.');
    }
    if (err.code === 'CodeMismatchException') {
      return new Error('Invalid verification code. Please try again.');
    }
    return new Error(msg);
  },

  renderAuthGate() {
    const container = document.getElementById('view-auth');
    container.innerHTML = `
      <div class="auth-container">
        <h2 id="auth-title">Sign In</h2>
        <div id="auth-error" class="error-message hidden"></div>
        <div id="auth-success" class="success-message hidden"></div>

        <form id="auth-form">
          <div class="form-group">
            <label for="auth-email">Email</label>
            <input type="email" id="auth-email" required autocomplete="email">
          </div>
          <div class="form-group">
            <label for="auth-password">Password</label>
            <input type="password" id="auth-password" required autocomplete="current-password">
          </div>
          <div id="confirm-group" class="form-group hidden">
            <label for="auth-code">Verification Code</label>
            <input type="text" id="auth-code" autocomplete="one-time-code">
          </div>
          <button type="submit" id="auth-submit-btn">Sign In</button>
        </form>

        <p class="auth-toggle">
          <span id="auth-toggle-text">Don't have an account?</span>
          <a href="#" id="auth-toggle-link">Sign Up</a>
        </p>
      </div>
    `;

    let mode = 'signin'; // signin | signup | confirm
    const form = document.getElementById('auth-form');
    const title = document.getElementById('auth-title');
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleText = document.getElementById('auth-toggle-text');
    const toggleLink = document.getElementById('auth-toggle-link');
    const confirmGroup = document.getElementById('confirm-group');
    const errorEl = document.getElementById('auth-error');
    const successEl = document.getElementById('auth-success');
    let pendingEmail = '';

    const showError = (msg) => {
      errorEl.textContent = msg;
      errorEl.classList.remove('hidden');
      successEl.classList.add('hidden');
    };
    const showSuccess = (msg) => {
      successEl.textContent = msg;
      successEl.classList.remove('hidden');
      errorEl.classList.add('hidden');
    };
    const clearMessages = () => {
      errorEl.classList.add('hidden');
      successEl.classList.add('hidden');
    };

    const setMode = (newMode) => {
      mode = newMode;
      clearMessages();
      if (mode === 'signin') {
        title.textContent = 'Sign In';
        submitBtn.textContent = 'Sign In';
        toggleText.textContent = "Don't have an account?";
        toggleLink.textContent = 'Sign Up';
        confirmGroup.classList.add('hidden');
      } else if (mode === 'signup') {
        title.textContent = 'Sign Up';
        submitBtn.textContent = 'Sign Up';
        toggleText.textContent = 'Already have an account?';
        toggleLink.textContent = 'Sign In';
        confirmGroup.classList.add('hidden');
      } else if (mode === 'confirm') {
        title.textContent = 'Verify Email';
        submitBtn.textContent = 'Verify';
        toggleText.textContent = 'Back to';
        toggleLink.textContent = 'Sign In';
        confirmGroup.classList.remove('hidden');
      }
    };

    toggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (mode === 'signin') setMode('signup');
      else setMode('signin');
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearMessages();
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;

      if (mode === 'signin') {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';
        this.signIn(email, password, (err) => {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In';
          if (err) showError(err.message);
        });
      } else if (mode === 'signup') {
        if (!this._validatePassword(password)) {
          showError('Password must be at least 8 characters with uppercase, lowercase, number, and symbol.');
          return;
        }
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing up...';
        this.signUp(email, password, (err) => {
          submitBtn.disabled = false;
          if (err) {
            submitBtn.textContent = 'Sign Up';
            showError(err.message);
          } else {
            pendingEmail = email;
            setMode('confirm');
            showSuccess('Account created! Check your email for a verification code.');
          }
        });
      } else if (mode === 'confirm') {
        const code = document.getElementById('auth-code').value.trim();
        if (!code) { showError('Please enter the verification code.'); return; }
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';
        this.confirmSignUp(pendingEmail || email, code, (err) => {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Verify';
          if (err) {
            showError(err.message);
          } else {
            setMode('signin');
            showSuccess('Email verified! You can now sign in.');
          }
        });
      }
    });
  },

  _validatePassword(password) {
    if (password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    if (!/[^A-Za-z0-9]/.test(password)) return false;
    return true;
  }
};
