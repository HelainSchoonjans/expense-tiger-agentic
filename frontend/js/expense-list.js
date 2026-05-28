const ExpenseList = {
  _container: null,

  init(container) {
    this._container = container;
  },

  async load() {
    this._showLoading();
    try {
      const response = await ApiClient.get('/expenses');
      const expenses = response.data || response || [];
      if (Array.isArray(expenses) && expenses.length > 0) {
        // Sort by date descending
        expenses.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        this.render(expenses);
      } else {
        this._showEmpty();
      }
    } catch (err) {
      this._container.innerHTML = `
        <div class="list-container">
          <h2>My Expenses</h2>
          <div class="error-message">${err.message || 'Failed to load expenses.'}</div>
          <button class="btn-secondary" onclick="ExpenseList.load()">Retry</button>
        </div>
      `;
    }
  },

  render(expenses) {
    this._container.innerHTML = `
      <div class="list-container">
        <h2>My Expenses</h2>
        <div class="expense-cards">
          ${expenses.map(exp => `
            <div class="expense-card">
              <div class="card-header">
                <span class="merchant">${this._esc(exp.merchantName || 'Unknown')}</span>
                <span class="amount">${this._formatAmount(exp.totalAmount, exp.currency)}</span>
              </div>
              <div class="card-body">
                <span class="date">${this._formatDate(exp.date)}</span>
                ${exp.category ? `<span class="category">${this._esc(exp.category)}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  _showLoading() {
    this._container.innerHTML = `
      <div class="list-container">
        <h2>My Expenses</h2>
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading expenses...</p>
        </div>
      </div>
    `;
  },

  _showEmpty() {
    this._container.innerHTML = `
      <div class="list-container">
        <h2>My Expenses</h2>
        <div class="empty-state">
          <p>No expenses yet. Upload a receipt to get started!</p>
          <a href="#/upload" class="btn-primary">Upload Receipt</a>
        </div>
      </div>
    `;
  },

  _formatAmount(amount, currency) {
    const cur = currency || 'USD';
    const num = parseFloat(amount) || 0;
    return `${cur} ${num.toFixed(2)}`;
  },

  _formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  },

  _esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
