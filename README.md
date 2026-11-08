# caddy-cli

[![npm version](https://img.shields.io/npm/v/caddy-cli.svg?color=amber&style=flat-square)](https://www.npmjs.com/package/caddy-cli)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=flat-square)](https://opensource.org/licenses/ISC)
[![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages-emerald.svg?style=flat-square)](https://keshavsoft.github.io/caddy-cli/)
[![GitHub](https://img.shields.io/badge/github-keshavsoft%2Fcaddy--cli-zinc.svg?style=flat-square&logo=github)](https://github.com/keshavsoft/caddy-cli)

> **Fast, zero-friction CLI to inspect, map, and observe subdomains, upstream ports, and reverse-proxy routes from Caddy JSON configurations.**

---

## 🌐 Live Interactive Documentation & Playground

Visit the official documentation portal on GitHub Pages:
**👉 [https://keshavsoft.github.io/caddy-cli/](https://keshavsoft.github.io/caddy-cli/)**

- **Interactive Playground**: Paste any Caddy JSON or test with sample configs directly in your browser.
- **Version Deep Dives**: Detailed specs for [v1](https://keshavsoft.github.io/caddy-cli/v1/) and [v2](https://keshavsoft.github.io/caddy-cli/v2/).
- **Architecture Insights**: Complete breakdown of the JSONPath engine and modular repository design.

---

## 💡 Why We Defined `caddy-cli`

### The Problem
[Caddy](https://caddyserver.com) is an exceptional modern web server featuring automated TLS and a high-performance native JSON configuration engine. However, as VPS servers grow to host multiple microservices, Node.js applications, WebSocket servers, and static sites, `/etc/caddy/caddy.json` quickly turns into **hundreds of lines of deeply-nested JSON arrays**:

```text
apps ➔ http ➔ servers ➔ srv0 ➔ routes[0] ➔ handle[0] ➔ routes[1] ➔ handle[0] ➔ upstreams[0] ➔ dial: "localhost:9011"
```

Whenever you connect to a server over SSH, answering basic operational questions is painful:
1. *Which subdomains are currently live?*
2. *Which local port or upstream dial target does each subdomain forward to?* (e.g., Is port `3001` free? Which service runs on `9328`?)
3. *What does the exact routing block look like for a specific domain?*

Wrestling with 300+ lines of raw JSON or constructing fragile `jq` queries over SSH is slow and error-prone.

### The Solution
`caddy-cli` provides **instant zero-install observability**. Run `npx caddy-cli` anywhere and immediately receive clean ASCII tables, port mappings, and domain route definitions in milliseconds.

---

## 🚀 Quick Run with `npx`

No installation required. Run directly in any directory containing `caddy.json` (such as `/etc/caddy#` on your VPS):

```bash
# Auto-detects ./caddy.json in current directory (e.g. inside /etc/caddy)
npx caddy-cli

# Or specify an explicit path
npx caddy-cli /etc/caddy/caddy.json
npx caddy-cli ./path/to/caddy.json
```

---

## ⚙️ CLI Options & Flags

```text
Usage:
  npx caddy-cli [options] [path/to/caddy.json]
  npx caddy-cli [domain] [path/to/caddy.json]

Options:
  -h, --help            Show help message
  -v, --version         Show version number
  -u, --unique          Print only unique hostnames (one per line)
  -p, --ports           Display port and upstream dial target mappings
  -d, --domain <host>   Inspect the complete configuration route for a specific subdomain
  --json                Output results as formatted JSON

Arguments:
  [path]                Path to caddy.json (defaults to ./caddy.json)
  [domain]              Direct subdomain lookup (shorthand for -d <domain>)
```

---

## 📖 Command Examples

### 1. Default Overview: Subdomains & Reverse Proxy Routes
Displays every subdomain mapped to its backend reverse proxy dial target, port, and matched paths:

```bash
npx caddy-cli
```

```text
Caddy Subdomains & Reverse Proxy Routes (9 unique domains):

┌─────────┬────────────────────────────┬─────────────────┬─────────────────────────────────┬────────┐
│ (index) │ Host                       │ Type            │ Upstream / Target               │ Path   │
├─────────┼────────────────────────────┼─────────────────┼─────────────────────────────────┼────────┤
│ 0       │ 'quotation.keshavsoft.com' │ 'reverse_proxy' │ 'localhost:8080'                │ '/ws*' │
│ 1       │ 'quotation.keshavsoft.com' │ 'reverse_proxy' │ 'localhost:9011'                │ '*'    │
│ 2       │ 'washtex5.keshavsoft.com'  │ 'reverse_proxy' │ 'localhost:9328'                │ '*'    │
│ 3       │ 'mani3.keshavsoft.com'     │ 'reverse_proxy' │ 'localhost:3025'                │ '*'    │
│ 4       │ 'lab14.keshavsoft.com'     │ 'reverse_proxy' │ 'localhost:9012'                │ '*'    │
│ 5       │ 'rk2.keshavsoft.com'       │ 'reverse_proxy' │ 'localhost:9010'                │ '*'    │
│ 6       │ 'keshavsoft.com'           │ 'reverse_proxy' │ 'localhost:9328'                │ '*'    │
│ 7       │ 'www.keshavsoft.com'       │ 'reverse_proxy' │ 'localhost:9328'                │ '*'    │
│ 8       │ 'cli.keshavsoft.com'       │ 'file_server'   │ '/usr/share/cli.keshavsoft.com' │ '*'    │
│ 9       │ 'cc9.keshavsoft.com'       │ 'reverse_proxy' │ 'localhost:3001'                │ '*'    │
└─────────┴────────────────────────────┴─────────────────┴─────────────────────────────────┴────────┘
```

### 2. Port & Dial Target Lookup (`-p` / `--ports`)
Instantly view all upstream ports to find free ports or verify port bindings:

```bash
npx caddy-cli -p
```

```text
┌─────────┬──────────┬─────────────────────────────────┬─────────────────┬────────┬──────────────────────────────────────┐
│ (index) │ Port     │ Dial Target                     │ Type            │ Path   │ Host(s)                              │
├─────────┼──────────┼─────────────────────────────────┼─────────────────┼────────┼──────────────────────────────────────┤
│ 0       │ '8080'   │ 'localhost:8080'                │ 'reverse_proxy' │ '/ws*' │ 'quotation.keshavsoft.com'           │
│ 1       │ '9011'   │ 'localhost:9011'                │ 'reverse_proxy' │ '*'    │ 'quotation.keshavsoft.com'           │
│ 2       │ '9328'   │ 'localhost:9328'                │ 'reverse_proxy' │ '*'    │ 'washtex5.keshavsoft.com'            │
│ 3       │ '3025'   │ 'localhost:3025'                │ 'reverse_proxy' │ '*'    │ 'mani3.keshavsoft.com'               │
│ 4       │ '9012'   │ 'localhost:9012'                │ 'reverse_proxy' │ '*'    │ 'lab14.keshavsoft.com'               │
│ 5       │ '9010'   │ 'localhost:9010'                │ 'reverse_proxy' │ '*'    │ 'rk2.keshavsoft.com'                 │
│ 6       │ '9328'   │ 'localhost:9328'                │ 'reverse_proxy' │ '*'    │ 'keshavsoft.com, www.keshavsoft.com' │
│ 7       │ 'static' │ '/usr/share/cli.keshavsoft.com' │ 'file_server'   │ '*'    │ 'cli.keshavsoft.com'                 │
│ 8       │ '3001'   │ 'localhost:3001'                │ 'reverse_proxy' │ '*'    │ 'cc9.keshavsoft.com'                 │
└─────────┴──────────┴─────────────────────────────────┴─────────────────┴────────┴──────────────────────────────────────┘
```

### 3. Subdomain Configuration Inspection (`-d` or shorthand)
Drill down into a specific subdomain route block:

```bash
npx caddy-cli -d quotation.keshavsoft.com
# or directly by domain shorthand:
npx caddy-cli cc9.keshavsoft.com
```

Output raw JSON for scripting or piping:

```bash
npx caddy-cli cc9.keshavsoft.com --json
```

```json
{
  "match": [
    {
      "host": [
        "cc9.keshavsoft.com"
      ]
    }
  ],
  "handle": [
    {
      "handler": "subroute",
      "routes": [
        {
          "handle": [
            {
              "handler": "reverse_proxy",
              "upstreams": [
                {
                  "dial": "localhost:3001"
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "terminal": true
}
```

### 4. Unique Hostnames List (`-u` / `--unique`)
```bash
npx caddy-cli -u
# or as JSON array
npx caddy-cli -u --json
```

---

## 🏛️ Architecture & Thought Process

### 1. The JSONPath Engine (`jsonpathly`)
Instead of hardcoding brittle recursive loops that break whenever Caddy adds a new wrapper or nesting level, `caddy-cli` leverages `jsonpathly` with the universal JSONPath expression:

```javascript
export const HOST_EXPRESSION = "$..host[*]";
```

This immediately traverses the entire document tree and retrieves all host declarations along with their exact structural JSON paths.

### 2. Recursive Handler Parser
To resolve backend dial targets, `caddy-cli` recursively inspects the `route.handle` pipeline:
- **`subroute`**: Evaluates nested route matchers (`match[].path`) and recurses into child handlers.
- **`reverse_proxy`**: Extracts `upstreams[].dial` targets (e.g. `localhost:8080`, `localhost:9011`).
- **`file_server`**: Resolves static roots defined by preceding `vars` handlers.

### 3. Modular Version Repository Pattern
Following the KeshavSoft architectural standard (inspired by `monaco-ide`), functionality is encapsulated in version directories:

```text
caddy-cli/
├── bin/
│   └── index.js             # CLI executable entry point
├── docs/                    # GitHub Pages portal
│   ├── index.html           # Main showcase & interactive playground
│   ├── v1/index.html        # Version 1 specification
│   ├── v2/index.html        # Version 2 specification
│   └── sample.json          # Live test dataset
├── src/
│   ├── v1/                  # V1: Hostname & JSONPath extractor
│   │   ├── cli.js
│   │   └── index.js
│   ├── v2/                  # V2: Upstream ports, dial targets & route inspector
│   │   ├── cli.js
│   │   └── index.js
│   ├── cli.js               # Re-exports active CLI runner (v2)
│   └── index.js             # Re-exports active ESM API (v2)
├── test/                    # Automated Node.js native test suite
│   ├── fixtures/
│   ├── index.test.js
│   └── v2.test.js
└── package.json             # ESM exports mapping (., ./v1, ./v2)
```

---

## 📦 Programmatic Usage (ESM)

Import and use directly in your Node.js ES Module projects:

```javascript
import {
  inspectRoutes,
  inspectRoutesFromFile,
  getPortMappings,
  getPortMappingsFromFile,
  findRouteByHost,
  findRouteByHostFromFile,
  extractHosts
} from "caddy-cli";

// 1. Inspect all routes from a Caddy JSON file:
const routes = inspectRoutesFromFile("/etc/caddy/caddy.json");

// 2. Extract port and dial target mappings:
const ports = getPortMappingsFromFile("/etc/caddy/caddy.json");

// 3. Find and inspect a specific domain's configuration:
const match = findRouteByHostFromFile("/etc/caddy/caddy.json", "cc9.keshavsoft.com");
console.log(match.rawRoute);
```

### Targeting Specific Versions

You can also import from specific version modules:

```javascript
import * as v1 from "caddy-cli/v1";
import * as v2 from "caddy-cli/v2";
```

---

## 🧭 Evolution Timeline & Roadmap

| Version | Milestone | Key Capabilities |
| :--- | :--- | :--- |
| **`v1`** | **Genesis** | `$..host[*]` querying via `jsonpathly`, JSON path resolution, unique hostname list (`-u`). |
| **`v2`** (Current) | **Observability** | Recursive handler analysis, upstream port mapping (`-p`), single-domain inspection (`-d`), formatted raw JSON dumps (`--json`). |
| **`v3`** (Roadmap) | **Mutation & Ops** | Add subdomains (`caddy-cli add`), remove routes (`caddy-cli rm`), and zero-downtime service reload (`caddy-cli reload` via Caddy Admin API / systemctl). |

---

## 🧪 Testing

`caddy-cli` uses the native Node.js test runner (`node:test`):

```bash
npm test
```

All 9 test suites verify:
- `HOST_EXPRESSION` definition
- In-memory route & port extraction
- Case-insensitive domain lookups
- Sample fixture parsing
- Export parity across version modules

---

## 📄 License

[ISC](LICENSE) &copy; [KeshavSoft](https://github.com/keshavsoft)
