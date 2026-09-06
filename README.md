# Andika

> *"Andika"* is the Swahili word for **"write"**.

A modern, distraction-free writing studio and screenplay editor for WordPress. Built for screenwriters, authors, playwrights, and creators who need a fast, zero-distraction environment with typography intuition, PDF import/export, community sharing, and a modular companion extension architecture.

---

## Features

- **Distraction-Free Canvas:** Full-viewport writing experience with monospace typography, caret tracking, and a minimal aesthetic.
- **Screenplay & Dialogue Intuition:** Automatic recognition of sluglines, scene headings, character names, parentheticals, and dialogue blocks.
- **Dedicated Script Dashboard:** Manage personal drafts, community contributions, duplicate writings, and custom titles.
- **Context Menu & Shortcuts:** Non-intrusive floating context toolbar on selection, keyboard shortcuts for fast formatting (H#, Bold, Italic, Uppercase, Monospace, Dialogue quotes).
- **PDF Import & Export:** One-click script import from industry PDFs and clean standard screenplay printing/exporting.
- **Modular Companion Extensions:** Extensible engine allowing specialized companion plugins (such as Movie Production) to load without adding overhead when disabled.
- **Full Site Editing (FSE) Block:** Embed writings directly into WordPress pages or posts via the native block editor.

---

## Companion Extensions

### Movie Production & Script Breakdown
An official companion extension that adds:
- Automatic scene breakdown from sluglines (`INT.`, `EXT.`)
- 1/8th page measurements and runtime estimation
- Speaking cast identification and character cue counter
- Production elements extraction (vehicles, weapons, props, SFX)
- Color-coded shooting schedule stripboard

---

## Installation

### From WordPress Admin
1. Download the latest `andika.zip` release.
2. In WordPress Admin, navigate to **Plugins > Add New > Upload Plugin**.
3. Select `andika.zip`, click **Install Now**, and then **Activate**.
4. Access the writing studio at `/?scripts=1`.

### From Git
Clone this repository directly into your WordPress plugins directory:
```bash
cd wp-content/plugins
git clone https://github.com/joel-mwakasege/andika.git
```

---

## Requirements

- WordPress 6.0 or higher
- PHP 7.4, 8.0, 8.1, 8.2, or 8.3

---

## License

GPL v2 or later.
