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











