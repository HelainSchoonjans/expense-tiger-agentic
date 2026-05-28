const ReceiptUploader = {
  _container: null,
  _file: null,

  init(container) {
    this._container = container;
    this._file = null;
    this._render();
  },

  _render() {
    this._container.innerHTML = `
      <div class="uploader-container">
        <h2>Upload Receipt</h2>
        <div id="upload-error" class="error-message hidden"></div>

        <div id="drop-zone" class="drop-zone">
          <p>Drag & drop a receipt image here</p>
          <p>or</p>
          <label for="file-input" class="file-label">Choose File</label>
          <input type="file" id="file-input" accept="image/jpeg,image/png,image/webp" class="hidden">
          <p class="hint">JPEG, PNG, or WebP — max 5 MB</p>
        </div>

        <div id="preview-area" class="hidden">
          <img id="preview-img" alt="Receipt preview">
          <div class="preview-actions">
            <button id="upload-btn" class="btn-primary">Upload & Extract</button>
            <button id="clear-btn" class="btn-secondary">Clear</button>
          </div>
        </div>

        <div id="upload-loading" class="loading hidden">
          <div class="spinner"></div>
          <p>Uploading and extracting receipt details...</p>
        </div>
      </div>
    `;

    this._bindEvents();
  },

  _bindEvents() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) this._handleFile(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) this._handleFile(e.target.files[0]);
    });

    document.getElementById('upload-btn').addEventListener('click', () => this._upload());
    document.getElementById('clear-btn').addEventListener('click', () => this._clear());
  },

  _handleFile(file) {
    const error = this.validateFile(file);
    if (error) {
      this._showError(error);
      return;
    }
    this._file = file;
    this._hideError();
    this._showPreview(file);
  },

  validateFile(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;
    const errors = [];

    if (!validTypes.includes(file.type)) {
      errors.push('Unsupported file type. Please use JPEG, PNG, or WebP.');
    }
    if (file.size > maxSize) {
      errors.push('File exceeds 5 MB limit.');
    }
    return errors.length ? errors.join(' ') : null;
  },

  _showPreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('preview-img').src = e.target.result;
      document.getElementById('drop-zone').classList.add('hidden');
      document.getElementById('preview-area').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  },

  _clear() {
    this._file = null;
    document.getElementById('preview-area').classList.add('hidden');
    document.getElementById('drop-zone').classList.remove('hidden');
    document.getElementById('file-input').value = '';
    this._hideError();
  },

  async _upload() {
    if (!this._file) return;

    this._showLoading();
    this._hideError();

    try {
      const base64 = await this._encodeBase64(this._file);
      const response = await ApiClient.post('/expenses/extract', {
        image: base64,
        contentType: this._file.type
      });
      this._hideLoading();
      // Response is { data: { merchantName, date, ... } } — pass the inner data to editor
      Router.navigate('/edit', response.data || response);
    } catch (err) {
      this._hideLoading();
      this._showError(err.message || 'Upload failed. Please try again.');
    }
  },

  _encodeBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  },

  _showLoading() {
    document.getElementById('upload-loading').classList.remove('hidden');
    document.getElementById('upload-btn').disabled = true;
  },

  _hideLoading() {
    document.getElementById('upload-loading').classList.add('hidden');
    document.getElementById('upload-btn').disabled = false;
  },

  _showError(msg) {
    const el = document.getElementById('upload-error');
    el.textContent = msg;
    el.classList.remove('hidden');
  },

  _hideError() {
    document.getElementById('upload-error').classList.add('hidden');
  }
};
