const ExpenseEditor = {
  _container: null,
  _data: null,

  init(container) {
    this._container = container;
  },

  render(data) {
    this._data = data || {};
    const d = this._data;
    this._container.innerHTML = `
      <div class="editor-container">
        <h2>Review Expense</h2>
        <div id="editor-error" class="error-message hidden"></div>
        <div id="editor-success" class="success-message hidden"></div>

        <form id="expense-form">
          <div class="form-row">
            <div class="form-group">
              <label for="ed-merchant">Merchant Name *</label>
              <input type="text" id="ed-merchant" value="${this._esc(d.merchantName || '')}" required>
            </div>
            <div class="form-group">
              <label for="ed-date">Date *</label>
              <input type="date" id="ed-date" value="${this._esc(d.date || '')}" required>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="ed-total">Total Amount *</label>
              <input type="number" id="ed-total" step="0.01" value="${d.totalAmount || ''}" required>
            </div>
            <div class="form-group">
              <label for="ed-currency">Currency</label>
              <input type="text" id="ed-currency" value="${this._esc(d.currency || 'USD')}">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="ed-tax">Tax Amount</label>
              <input type="number" id="ed-tax" step="0.01" value="${d.taxAmount || ''}">
            </div>
            <div class="form-group">
              <label for="ed-payment">Payment Method</label>
              <input type="text" id="ed-payment" value="${this._esc(d.paymentMethod || '')}">
            </div>
          </div>

          <div class="form-group">
            <label for="ed-category">Category</label>
            <input type="text" id="ed-category" value="${this._esc(d.category || '')}">
          </div>

          <h3>Line Items</h3>
          <div id="line-items-container"></div>
          <button type="button" id="add-line-item" class="btn-secondary">+ Add Line Item</button>

          <div class="form-actions">
            <button type="submit" id="accept-btn" class="btn-primary">Accept Expense</button>
            <button type="button" id="back-btn" class="btn-secondary">Back to Upload</button>
          </div>
        </form>
      </div>
    `;

    this._renderLineItems(d.lineItems || []);
    this._bindEvents();
  },

  _renderLineItems(items) {
    const container = document.getElementById('line-items-container');
    if (!items.length) items = [{ description: '', quantity: 1, unitPrice: 0 }];

    container.innerHTML = items.map((item, i) => `
      <div class="line-item" data-index="${i}">
        <div class="form-row">
          <div class="form-group flex-2">
            <label>Description</label>
            <input type="text" class="li-desc" value="${this._esc(item.description || '')}">
          </div>
          <div class="form-group">
            <label>Qty</label>
            <input type="number" class="li-qty" step="1" min="0" value="${item.quantity || 1}">
          </div>
          <div class="form-group">
            <label>Unit Price</label>
            <input type="number" class="li-price" step="0.01" min="0" value="${item.unitPrice || 0}">
          </div>
          <button type="button" class="remove-li btn-danger" title="Remove">&times;</button>
        </div>
      </div>
    `).join('');
  },

  _bindEvents() {
    const form = document.getElementById('expense-form');
    const container = document.getElementById('line-items-container');

    // Recalculate total on line item changes
    container.addEventListener('input', (e) => {
      if (e.target.classList.contains('li-qty') || e.target.classList.contains('li-price')) {
        this.recalculateTotal();
      }
    });

    // Remove line item
    container.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-li')) {
        const item = e.target.closest('.line-item');
        if (container.children.length > 1) {
          item.remove();
          this.recalculateTotal();
        }
      }
    });

    // Add line item
    document.getElementById('add-line-item').addEventListener('click', () => {
      const items = this._getLineItems();
      items.push({ description: '', quantity: 1, unitPrice: 0 });
      this._renderLineItems(items);
      // Re-bind recalculate since we re-rendered
    });

    // Back
    document.getElementById('back-btn').addEventListener('click', () => {
      Router.navigate('/upload');
    });

    // Submit
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submit();
    });
  },

  recalculateTotal() {
    const items = this._getLineItems();
    const total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    document.getElementById('ed-total').value = total.toFixed(2);
  },

  _getLineItems() {
    const rows = document.querySelectorAll('.line-item');
    return Array.from(rows).map(row => ({
      description: row.querySelector('.li-desc').value,
      quantity: parseFloat(row.querySelector('.li-qty').value) || 0,
      unitPrice: parseFloat(row.querySelector('.li-price').value) || 0
    }));
  },

  validate() {
    const errors = [];
    const merchant = document.getElementById('ed-merchant');
    const date = document.getElementById('ed-date');
    const total = document.getElementById('ed-total');

    [merchant, date, total].forEach(el => el.classList.remove('input-error'));

    if (!merchant.value.trim()) { errors.push('Merchant name is required.'); merchant.classList.add('input-error'); }
    if (!date.value.trim()) { errors.push('Date is required.'); date.classList.add('input-error'); }
    if (!total.value || parseFloat(total.value) === 0) { errors.push('Total amount is required.'); total.classList.add('input-error'); }

    return errors;
  },

  getExpenseData() {
    return {
      merchantName: document.getElementById('ed-merchant').value.trim(),
      date: document.getElementById('ed-date').value,
      totalAmount: parseFloat(document.getElementById('ed-total').value) || 0,
      currency: document.getElementById('ed-currency').value.trim() || 'USD',
      taxAmount: parseFloat(document.getElementById('ed-tax').value) || 0,
      paymentMethod: document.getElementById('ed-payment').value.trim(),
      category: document.getElementById('ed-category').value.trim(),
      lineItems: this._getLineItems(),
      status: 'accepted'
    };
  },

  async submit() {
    const errors = this.validate();
    if (errors.length) {
      this._showError(errors.join(' '));
      return;
    }

    const btn = document.getElementById('accept-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    this._hideError();

    try {
      await ApiClient.post('/expenses', this.getExpenseData());
      this._showSuccess('Expense saved successfully!');
      setTimeout(() => Router.navigate('/expenses'), 1000);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Accept Expense';
      this._showError(err.message || 'Failed to save expense. Please try again.');
    }
  },

  _showError(msg) {
    const el = document.getElementById('editor-error');
    el.textContent = msg;
    el.classList.remove('hidden');
    document.getElementById('editor-success').classList.add('hidden');
  },

  _hideError() {
    document.getElementById('editor-error').classList.add('hidden');
  },

  _showSuccess(msg) {
    const el = document.getElementById('editor-success');
    el.textContent = msg;
    el.classList.remove('hidden');
    document.getElementById('editor-error').classList.add('hidden');
  },

  _esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
