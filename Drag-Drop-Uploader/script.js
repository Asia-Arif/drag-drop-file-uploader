/* =========================================================
   CloudDrop — Drag & Drop Uploader
   Vanilla JavaScript — no frameworks, no libraries.

   Structure (modular, single-responsibility sections):
   1. Config & constants
   2. DOM references
   3. Utility helpers
   4. Toast notifications
   5. Theme (dark/light) module
   6. Storage module (localStorage persistence)
   7. Gallery rendering
   8. Preview modal
   9. Upload queue / simulated progress
   10. File validation
   11. Drag & drop + browse events
   12. Init
   ========================================================= */

(function () {
  'use strict';

  /* ---------------------------------------------------------
     1. CONFIG & CONSTANTS
  --------------------------------------------------------- */
  const CONFIG = {
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
    ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'gif'],
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    STORAGE_KEY: 'clouddrop_images',
    THEME_KEY: 'clouddrop_theme',
    TOAST_DURATION: 4000,
    UPLOAD_TICK_MS: 120 // interval between simulated progress ticks
  };

  /* ---------------------------------------------------------
     2. DOM REFERENCES
  --------------------------------------------------------- */
  const dom = {
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    browseBtn: document.getElementById('browseBtn'),
    uploadQueue: document.getElementById('uploadQueue'),
    gallery: document.getElementById('gallery'),
    emptyState: document.getElementById('emptyState'),
    imageCount: document.getElementById('imageCount'),
    clearAllBtn: document.getElementById('clearAllBtn'),
    themeToggle: document.getElementById('themeToggle'),
    toastContainer: document.getElementById('toastContainer'),
    // large "latest upload" preview card
    latestPreviewSection: document.getElementById('latestPreviewSection'),
    previewCardImage: document.getElementById('previewCardImage'),
    previewCardName: document.getElementById('previewCardName'),
    previewCardSize: document.getElementById('previewCardSize'),
    previewCardType: document.getElementById('previewCardType'),
    previewCardResolution: document.getElementById('previewCardResolution'),
    previewCardDate: document.getElementById('previewCardDate'),
    previewCardDownload: document.getElementById('previewCardDownload'),
    previewCardReplace: document.getElementById('previewCardReplace'),
    previewCardRemove: document.getElementById('previewCardRemove'),
    replaceInput: document.getElementById('replaceInput'),
    // modal
    previewModal: document.getElementById('previewModal'),
    previewImage: document.getElementById('previewImage'),
    previewFileName: document.getElementById('previewFileName'),
    previewFileSize: document.getElementById('previewFileSize'),
    previewFileDimensions: document.getElementById('previewFileDimensions'),
    previewRemoveBtn: document.getElementById('previewRemoveBtn')
  };

  /* ---------------------------------------------------------
     3. UTILITY HELPERS
  --------------------------------------------------------- */
  const utils = {
    /** Generate a reasonably unique id for each stored image */
    generateId() {
      return `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    },

    /** Convert bytes to a human readable string, e.g. 1.4 MB */
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const units = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      const value = bytes / Math.pow(1024, i);
      return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
    },

    /** Get lowercase file extension from a filename */
    getExtension(filename) {
      return filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
    },

    /** Read a File object and resolve with its base64 data URL */
    readFileAsDataURL(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('File could not be read.'));
        reader.readAsDataURL(file);
      });
    },

    /** Resolve the pixel dimensions of an image data URL */
    getImageDimensions(dataUrl) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error('Corrupted image data.'));
        img.src = dataUrl;
      });
    },

    /** Escape text before inserting into innerHTML to avoid markup injection */
    escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    },

    /** Format a timestamp as a readable date & time, e.g. "16 Jul 2026, 3:42 PM" */
    formatDateTime(timestamp) {
      const date = new Date(timestamp);
      const datePart = date.toLocaleDateString(undefined, {
        day: '2-digit', month: 'short', year: 'numeric'
      });
      const timePart = date.toLocaleTimeString(undefined, {
        hour: '2-digit', minute: '2-digit'
      });
      return `${datePart}, ${timePart}`;
    },

    /** Return a friendly label for a MIME type, e.g. "image/jpeg" -> "JPEG" */
    formatFileType(mimeType, filename) {
      if (mimeType && mimeType.includes('/')) {
        return mimeType.split('/')[1].toUpperCase();
      }
      return this.getExtension(filename).toUpperCase();
    },

    /** Trigger a browser download for a stored image record */
    downloadFile(dataUrl, filename) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  /* ---------------------------------------------------------
     4. TOAST NOTIFICATIONS
  --------------------------------------------------------- */
  const toast = {
    icons: { success: '✓', error: '!', info: 'i' },
    titles: { success: 'Success', error: 'Error', info: 'Notice' },

    show(message, type = 'info') {
      const el = document.createElement('div');
      el.className = `toast toast-${type}`;
      el.setAttribute('role', type === 'error' ? 'alert' : 'status');

      el.innerHTML = `
        <span class="toast-icon">${this.icons[type]}</span>
        <div class="toast-body">
          <p class="toast-title">${this.titles[type]}</p>
          <p class="toast-message">${utils.escapeHtml(message)}</p>
        </div>
        <button type="button" class="toast-close" aria-label="Dismiss notification">&times;</button>
      `;

      dom.toastContainer.appendChild(el);

      const remove = () => {
        el.classList.add('toast-exit');
        el.addEventListener('animationend', () => el.remove(), { once: true });
      };

      el.querySelector('.toast-close').addEventListener('click', remove);
      setTimeout(remove, CONFIG.TOAST_DURATION);
    },

    success(msg) { this.show(msg, 'success'); },
    error(msg) { this.show(msg, 'error'); },
    info(msg) { this.show(msg, 'info'); }
  };

  /* ---------------------------------------------------------
     5. THEME MODULE (Light / Dark mode toggle)
  --------------------------------------------------------- */
  const theme = {
    init() {
      const saved = localStorage.getItem(CONFIG.THEME_KEY);
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = saved || (prefersDark ? 'dark' : 'light');
      this.apply(initial);

      dom.themeToggle.addEventListener('click', () => this.toggle());
    },

    apply(mode) {
      document.documentElement.setAttribute('data-theme', mode);
      dom.themeToggle.setAttribute('aria-pressed', String(mode === 'dark'));
      localStorage.setItem(CONFIG.THEME_KEY, mode);
    },

    toggle() {
      const current = document.documentElement.getAttribute('data-theme');
      this.apply(current === 'dark' ? 'light' : 'dark');
    }
  };

  /* ---------------------------------------------------------
     6. STORAGE MODULE (persistence via localStorage)
  --------------------------------------------------------- */
  const storage = {
    /** Read all saved images, oldest first */
    getAll() {
      try {
        const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (err) {
        console.error('Failed to parse stored images:', err);
        return [];
      }
    },

    saveAll(images) {
      try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(images));
        return true;
      } catch (err) {
        // Most likely quota exceeded
        toast.error('Storage is full. Please remove some images and try again.');
        return false;
      }
    },

    add(imageRecord) {
      const images = this.getAll();
      images.push(imageRecord);
      return this.saveAll(images);
    },

    remove(id) {
      const images = this.getAll().filter((img) => img.id !== id);
      this.saveAll(images);
    },

    clear() {
      localStorage.removeItem(CONFIG.STORAGE_KEY);
    }
  };

  /* ---------------------------------------------------------
     7. GALLERY RENDERING
  --------------------------------------------------------- */
  const gallery = {
    render() {
      const images = storage.getAll();
      dom.gallery.innerHTML = '';

      dom.imageCount.textContent = images.length;
      dom.emptyState.style.display = images.length ? 'none' : 'flex';
      dom.clearAllBtn.hidden = images.length === 0;

      images
        .slice()
        .reverse() // show newest first
        .forEach((img) => dom.gallery.appendChild(this.buildCard(img)));
    },

    buildCard(img) {
      const card = document.createElement('div');
      card.className = 'gallery-card';
      card.dataset.id = img.id;
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Preview ${img.name}`);

      card.innerHTML = `
        <div class="gallery-card-thumb">
          <img src="${img.dataUrl}" alt="${utils.escapeHtml(img.name)}" loading="lazy" />
          <button type="button" class="gallery-card-remove" aria-label="Remove ${utils.escapeHtml(img.name)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="gallery-card-info">
          <p class="gallery-card-name">${utils.escapeHtml(img.name)}</p>
          <p class="gallery-card-size">${utils.formatFileSize(img.size)}</p>
          <p class="gallery-card-date">${utils.formatDateTime(img.uploadedAt)}</p>
          <div class="gallery-card-footer">
            <button type="button" class="gallery-card-action download-action" aria-label="Download ${utils.escapeHtml(img.name)}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3V15M12 15L8 11M12 15L16 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M4 17V18C4 19.6569 5.34315 21 7 21H17C18.6569 21 20 19.6569 20 18V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Download
            </button>
            <button type="button" class="gallery-card-action delete-action" aria-label="Delete ${utils.escapeHtml(img.name)}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6H21M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Delete
            </button>
          </div>
        </div>
      `;

      // Open preview modal on click / Enter key (ignore clicks on action buttons)
      const openHandler = (e) => {
        if (e.target.closest('.gallery-card-remove, .gallery-card-action')) return;
        previewModal.open(img.id);
      };
      card.addEventListener('click', openHandler);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openHandler(e);
        }
      });

      // Remove single image (thumbnail corner button)
      card.querySelector('.gallery-card-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        gallery.removeImage(img.id, card);
      });

      // Delete button in footer
      card.querySelector('.delete-action').addEventListener('click', (e) => {
        e.stopPropagation();
        gallery.removeImage(img.id, card);
      });

      // Download button in footer
      card.querySelector('.download-action').addEventListener('click', (e) => {
        e.stopPropagation();
        utils.downloadFile(img.dataUrl, img.name);
        toast.info(`Downloading "${img.name}"...`);
      });

      return card;
    },

    removeImage(id, cardEl) {
      const finish = () => {
        storage.remove(id);
        this.render();
        previewCard.syncAfterChange();
      };

      if (cardEl) {
        cardEl.classList.add('removing');
        cardEl.addEventListener('animationend', finish, { once: true });
      } else {
        finish();
      }
      toast.info('Image removed.');
    },

    clearAll() {
      storage.clear();
      this.render();
      previewCard.syncAfterChange();
      toast.info('All images cleared.');
    }
  };

  /* ---------------------------------------------------------
     8. LATEST UPLOAD — LARGE PREVIEW CARD
  --------------------------------------------------------- */
  const previewCard = {
    currentId: null,

    init() {
      dom.previewCardDownload.addEventListener('click', () => {
        const img = this.getCurrentImage();
        if (!img) return;
        utils.downloadFile(img.dataUrl, img.name);
        toast.info(`Downloading "${img.name}"...`);
      });

      dom.previewCardRemove.addEventListener('click', () => {
        if (!this.currentId) return;
        gallery.removeImage(this.currentId);
      });

      dom.previewCardReplace.addEventListener('click', () => {
        if (!this.currentId) return;
        dom.replaceInput.click();
      });

      dom.replaceInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        dom.replaceInput.value = ''; // allow re-selecting the same file next time
        if (file) this.replaceImage(this.currentId, file);
      });
    },

    getCurrentImage() {
      return storage.getAll().find((i) => i.id === this.currentId) || null;
    },

    /** Show a specific image record in the large preview card, with fade-in */
    show(record) {
      this.currentId = record.id;

      dom.previewCardImage.src = record.dataUrl;
      dom.previewCardImage.alt = record.name;
      dom.previewCardName.textContent = record.name;
      dom.previewCardSize.textContent = utils.formatFileSize(record.size);
      dom.previewCardType.textContent = utils.formatFileType(record.type, record.name);
      dom.previewCardResolution.textContent = record.width && record.height
        ? `${record.width} × ${record.height}px`
        : '—';
      dom.previewCardDate.textContent = utils.formatDateTime(record.uploadedAt);

      dom.latestPreviewSection.hidden = false;
    },

    hide() {
      this.currentId = null;
      dom.latestPreviewSection.hidden = true;
    },

    /** Re-sync the card after a deletion or clear-all — falls back to the newest remaining image */
    syncAfterChange() {
      const images = storage.getAll();
      if (images.length === 0) {
        this.hide();
        return;
      }
      const stillExists = images.find((i) => i.id === this.currentId);
      this.show(stillExists || images[images.length - 1]);
    },

    /** Replace the file behind an existing image record, keeping its id */
    async replaceImage(id, file) {
      const result = validator.validate(file);
      if (!result.valid) {
        toast.error(result.error);
        return;
      }

      let dataUrl;
      try {
        dataUrl = await utils.readFileAsDataURL(file);
      } catch (err) {
        toast.error(`Could not read "${file.name}". The file may be corrupted.`);
        return;
      }

      let dimensions = { width: null, height: null };
      try {
        dimensions = await utils.getImageDimensions(dataUrl);
      } catch (err) {
        toast.error(`"${file.name}" appears to be a corrupted image.`);
        return;
      }

      const images = storage.getAll();
      const index = images.findIndex((i) => i.id === id);
      if (index === -1) return;

      images[index] = {
        ...images[index],
        name: file.name,
        size: file.size,
        type: file.type,
        width: dimensions.width,
        height: dimensions.height,
        dataUrl,
        uploadedAt: Date.now()
      };

      if (!storage.saveAll(images)) return;

      this.show(images[index]);
      gallery.render();
      toast.success(`Image replaced with "${file.name}".`);
    },

    /** On page load, show the most recently uploaded image, if any */
    showLatestOnLoad() {
      const images = storage.getAll();
      if (images.length > 0) {
        this.show(images[images.length - 1]);
      }
    }
  };

  /* ---------------------------------------------------------
     9. PREVIEW MODAL
  --------------------------------------------------------- */
  const previewModal = {
    currentId: null,

    init() {
      dom.previewModal.querySelectorAll('[data-close-modal]').forEach((el) => {
        el.addEventListener('click', () => this.close());
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dom.previewModal.getAttribute('data-open') === 'true') {
          this.close();
        }
      });

      dom.previewRemoveBtn.addEventListener('click', () => {
        if (this.currentId) {
          gallery.removeImage(this.currentId);
          this.close();
        }
      });
    },

    open(id) {
      const img = storage.getAll().find((i) => i.id === id);
      if (!img) return;

      this.currentId = id;
      dom.previewImage.src = img.dataUrl;
      dom.previewImage.alt = img.name;
      dom.previewFileName.textContent = img.name;
      dom.previewFileSize.textContent = utils.formatFileSize(img.size);
      dom.previewFileDimensions.textContent = img.width && img.height
        ? `${img.width} × ${img.height}px`
        : '';

      dom.previewModal.setAttribute('data-open', 'true');
      dom.previewModal.setAttribute('aria-hidden', 'false');
      dom.previewRemoveBtn.focus();
    },

    close() {
      dom.previewModal.setAttribute('data-open', 'false');
      dom.previewModal.setAttribute('aria-hidden', 'true');
      this.currentId = null;
    }
  };

  /* ---------------------------------------------------------
     10. UPLOAD QUEUE / SIMULATED PROGRESS
  --------------------------------------------------------- */
  const uploadQueue = {
    /**
     * Adds a file to the visual queue and simulates an upload.
     * On completion, persists the image and refreshes the gallery.
     */
    process(file) {
      const tempId = utils.generateId();
      const item = this.buildQueueItem(file, tempId);
      dom.uploadQueue.appendChild(item);

      const fillEl = item.querySelector('.progress-fill');
      const percentEl = item.querySelector('.queue-percent');
      const statusEl = item.querySelector('.queue-status');

      let progress = 0;

      const tick = setInterval(async () => {
        // Randomised increment gives a more natural upload feel
        progress = Math.min(100, progress + Math.random() * 18 + 6);
        fillEl.style.width = `${progress}%`;
        percentEl.textContent = `${Math.floor(progress)}%`;

        if (progress >= 100) {
          clearInterval(tick);
          statusEl.textContent = 'Upload Complete';
          item.classList.add('complete');

          try {
            await this.finalizeUpload(file, tempId);
            setTimeout(() => this.removeQueueItem(item), 900);
          } catch (err) {
            statusEl.textContent = 'Upload failed';
            item.classList.add('error');
            toast.error(err.message || 'Upload failed. Please try again.');
            setTimeout(() => this.removeQueueItem(item), 1400);
          }
        }
      }, CONFIG.UPLOAD_TICK_MS);
    },

    buildQueueItem(file, id) {
      const item = document.createElement('div');
      item.className = 'queue-item';
      item.dataset.id = id;

      const objectUrl = URL.createObjectURL(file);

      item.innerHTML = `
        <img class="queue-thumb" src="${objectUrl}" alt="" />
        <div class="queue-info">
          <p class="queue-name">${utils.escapeHtml(file.name)}</p>
          <p class="queue-status">Uploading...</p>
          <div class="progress-track">
            <div class="progress-fill"></div>
          </div>
        </div>
        <span class="queue-percent">0%</span>
        <svg class="queue-check" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;

      return item;
    },

    /** Reads, validates dimensions, and stores the file after "upload" completes */
    async finalizeUpload(file, tempId) {
      let dataUrl;
      try {
        dataUrl = await utils.readFileAsDataURL(file);
      } catch (err) {
        throw new Error(`Could not read "${file.name}". The file may be corrupted.`);
      }

      let dimensions = { width: null, height: null };
      try {
        dimensions = await utils.getImageDimensions(dataUrl);
      } catch (err) {
        throw new Error(`"${file.name}" appears to be a corrupted image.`);
      }

      const record = {
        id: tempId,
        name: file.name,
        size: file.size,
        type: file.type,
        width: dimensions.width,
        height: dimensions.height,
        dataUrl,
        uploadedAt: Date.now()
      };

      const saved = storage.add(record);
      if (!saved) {
        throw new Error(`Could not save "${file.name}" — storage limit reached.`);
      }

      gallery.render();
      previewCard.show(record);
      toast.success(`"${file.name}" uploaded successfully.`);
    },

    removeQueueItem(item) {
      item.classList.add('queue-item-exit');
      item.addEventListener('animationend', () => item.remove(), { once: true });
    }
  };

  /* ---------------------------------------------------------
     11. FILE VALIDATION
  --------------------------------------------------------- */
  const validator = {
    /** Returns { valid: boolean, error?: string } */
    validate(file) {
      const ext = utils.getExtension(file.name);

      if (!CONFIG.ALLOWED_EXTENSIONS.includes(ext) || !CONFIG.ALLOWED_TYPES.includes(file.type)) {
        return {
          valid: false,
          error: `"${file.name}" is not a supported file type. Only JPG, JPEG, PNG and GIF are allowed.`
        };
      }

      if (file.size > CONFIG.MAX_FILE_SIZE) {
        return {
          valid: false,
          error: `"${file.name}" exceeds the 5MB size limit (${utils.formatFileSize(file.size)}).`
        };
      }

      if (file.size === 0) {
        return { valid: false, error: `"${file.name}" appears to be empty or corrupted.` };
      }

      return { valid: true };
    }
  };

  /* ---------------------------------------------------------
     12. DRAG & DROP + BROWSE EVENTS
  --------------------------------------------------------- */
  const uploadController = {
    init() {
      // Browse button + click on drop zone
      dom.browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dom.fileInput.click();
      });
      dom.dropZone.addEventListener('click', () => dom.fileInput.click());
      dom.dropZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          dom.fileInput.click();
        }
      });

      dom.fileInput.addEventListener('change', (e) => {
        this.handleFiles(e.target.files);
        dom.fileInput.value = ''; // allow re-selecting the same file
      });

      // Drag & drop handlers
      let dragCounter = 0; // tracks nested dragenter/dragleave events

      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((evtName) => {
        dom.dropZone.addEventListener(evtName, (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
      });

      dom.dropZone.addEventListener('dragenter', () => {
        dragCounter++;
        dom.dropZone.classList.add('drag-active');
      });

      dom.dropZone.addEventListener('dragleave', () => {
        dragCounter--;
        if (dragCounter <= 0) {
          dragCounter = 0;
          dom.dropZone.classList.remove('drag-active');
        }
      });

      dom.dropZone.addEventListener('drop', (e) => {
        dragCounter = 0;
        dom.dropZone.classList.remove('drag-active');
        this.handleFiles(e.dataTransfer.files);
      });

      // Clear all
      dom.clearAllBtn.addEventListener('click', () => {
        if (confirm('Remove all uploaded images? This cannot be undone.')) {
          gallery.clearAll();
        }
      });
    },

    handleFiles(fileList) {
      if (!fileList || fileList.length === 0) {
        toast.error('No file selected. Please choose an image to upload.');
        return;
      }

      Array.from(fileList).forEach((file) => {
        const result = validator.validate(file);
        if (!result.valid) {
          toast.error(result.error);
          return;
        }
        uploadQueue.process(file);
      });
    }
  };

  /* ---------------------------------------------------------
     13. INIT
  --------------------------------------------------------- */
  function init() {
    theme.init();
    previewCard.init();
    previewModal.init();
    uploadController.init();
    gallery.render();
    previewCard.showLatestOnLoad();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
