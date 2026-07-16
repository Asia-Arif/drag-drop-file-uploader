# CloudDrop — Drag & Drop File Uploader

A modern, responsive image uploader built with **pure HTML, CSS and vanilla JavaScript** — no frameworks, no libraries. Features a glassmorphism UI, blue/purple gradient theme, drag & drop, simulated upload progress, image previews, and persistent storage via `localStorage`.



## ✨ Features

- **Drag & drop** upload with animated drop-zone highlighting
- **Browse File** button as an alternative to dragging
- **File type validation** — only JPG, JPEG, PNG, GIF accepted
- **File size validation** — 5MB max per file
- **Simulated upload progress** with animated progress bar and percentage
- **Large "Recently Uploaded" preview card** shown after each upload reaches 100% — glassmorphism card with animated gradient border, file name, size, type, resolution, upload date & time, a success badge, and Download / Replace / Remove actions
- **Responsive image gallery grid** — each card shows a thumbnail, file name, size, upload date, and Download / Delete buttons, plus a click-to-preview modal
- **Persistent storage** — images survive a page refresh via `localStorage`, including the large preview card (shows the most recently uploaded image)
- **Delete individual images**, **replace** an image in place, or **Clear All** at once
- **Toast notifications** for success, error, and info states
- **Light / Dark mode** toggle (persisted across sessions)
- **Fully responsive** — desktop, tablet, and mobile
- **Accessible** — keyboard navigable, semantic HTML, ARIA labels, visible focus states, respects `prefers-reduced-motion`



## 📁 Project Structure

```
Drag-Drop-Uploader/
│── index.html          # App markup
│── style.css            # Glassmorphism styling, gradients, animations, responsive rules
│── script.js             # Modular vanilla JS (validation, drag & drop, storage, UI)
│── assets/
│     ├── icons/          # SVG icons used across the app
│     └── images/         # (reserved for any static images)
└── README.md
```



## 🚀 Getting Started

No build tools, no `npm install` — this is a static site.

1. **Download / unzip** the project folder.
2. Open **`index.html`** directly in any modern browser (Chrome, Edge, Firefox, Safari).

That's it. Everything runs client-side.

### Optional: run via a local server
Some browsers restrict certain APIs on the `file://` protocol. If you notice any quirks, serve the folder locally instead:

```bash
# Using Python 3
python -m http.server 8000

# Using Node (http-server package)
npx http-server .
```

Then visit `http://localhost:8000` in your browser.



## 🖱️ How to Use

1. **Drag an image** onto the drop zone, or click **Browse File** to pick one from your device.
2. Only `.jpg`, `.jpeg`, `.png`, and `.gif` files under 5MB are accepted — anything else triggers an error toast.
3. Watch the **animated progress bar** as the (simulated) upload completes.
4. Once done, the image appears in the **gallery** below.
5. **Click any thumbnail** to open a full preview with file name, size, and dimensions.
6. Use the **✕ button** on a thumbnail (or inside the preview modal) to remove a single image.
7. Use **Clear All** to wipe the entire gallery.
8. Toggle the **sun/moon icon** in the header to switch between light and dark mode.

Refresh the page — your uploaded images will still be there, loaded automatically from `localStorage`.



## 🧠 Code Overview

`script.js` is organized into clearly separated modules (each with a single responsibility):

| Module | Responsibility |
|---|---|
| `CONFIG` | Central constants (allowed types, size limits, storage keys) |
| `utils` | Reusable helpers (file size formatting, base64 reading, image dimension lookup) |
| `toast` | Success/error/info notification system |
| `theme` | Light/dark mode persistence and toggling |
| `storage` | Reading/writing images to `localStorage` |
| `gallery` | Rendering the image grid and handling removal/download |
| `previewCard` | The large post-upload preview card (show/replace/remove/download, restores on page load) |
| `previewModal` | Full-size image preview dialog (opened by clicking a gallery thumbnail) |
| `uploadQueue` | Simulated upload progress and finalizing storage |
| `validator` | File type/size validation rules |
| `uploadController` | Wires up drag & drop, browse button, and file input events |

This keeps the code easy to navigate, free of duplication, and simple to extend (e.g. swapping the simulated upload for a real API call inside `uploadQueue.finalizeUpload`).



## 🎨 Design

- **Palette:** Indigo `#6366f1` → Violet `#8b5cf6` gradient, with a cyan `#06b6d4` accent
- **Style:** Glassmorphism cards (blurred, translucent surfaces) over an animated gradient backdrop with soft floating blobs
- **Typography:** System UI font stack for fast loading and native feel
- **Motion:** Subtle entrance/exit animations, hover lifts, and a pulsing border while dragging a file over the drop zone



## 🔧 Customization

- **Change accepted file types:** edit `CONFIG.ALLOWED_TYPES` / `CONFIG.ALLOWED_EXTENSIONS` in `script.js`
- **Change max file size:** edit `CONFIG.MAX_FILE_SIZE`
- **Connect to a real backend:** replace the `setInterval` simulation in `uploadQueue.process()` with actual `fetch`/`XMLHttpRequest` upload progress events



## 📄 License

Free to use for personal portfolios, learning, and internship submissions.
