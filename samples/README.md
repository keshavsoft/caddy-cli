# Caddy V3 Samples — Interactive Command Guide

All samples in this folder are **strictly tailored for V3**. There is no legacy bloat or backward-compatibility monkey-patching—only clean, linear, story-driven Node.js execution.

---

## 📂 Step-by-Step V3 Sample Folders

Each folder contains a standalone script demonstrating a single step in the story of working with Caddy subdomains:

| Step | Folder | What It Demonstrates | How to Run |
| :---: | :--- | :--- | :--- |
| **01** | [`v3/01-read-config/`](v3/01-read-config/) | Safely loading & parsing `caddy.json` | `node samples/v3/01-read-config/run.js` |
| **02** | [`v3/02-list-subdomains/`](v3/02-list-subdomains/) | Extracting all registered subdomains | `node samples/v3/02-list-subdomains/run.js` |
| **03** | [`v3/03-check-subdomain/`](v3/03-check-subdomain/) | Guard check: Is a domain already taken? | `node samples/v3/03-check-subdomain/run.js` |
| **04** | [`v3/04-build-route/`](v3/04-build-route/) | Assembling the clean Caddy route JSON block | `node samples/v3/04-build-route/run.js` |
| **05** | [`v3/05-add-subdomain/`](v3/05-add-subdomain/) | Appending a new route in-memory | `node samples/v3/05-add-subdomain/run.js` |
| **06** | [`v3/06-add-to-file/`](v3/06-add-to-file/) | End-to-end: Add to file with auto-backup | `node samples/v3/06-add-to-file/run.js` |

---

## ⚡ How to Run Any Sample

### From Project Root:
```bash
node samples/v3/01-read-config/run.js
node samples/v3/02-list-subdomains/run.js
node samples/v3/03-check-subdomain/run.js
node samples/v3/04-build-route/run.js
node samples/v3/05-add-subdomain/run.js
node samples/v3/06-add-to-file/run.js
```

### Or using Windows `.bat` files directly:
```powershell
.\samples\v3\01-read-config\run.bat
.\samples\v3\05-add-subdomain\run.bat
```
