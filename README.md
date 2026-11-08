# caddy-cli

[![npm version](https://img.shields.io/npm/v/caddy-cli.svg?color=amber&style=flat-square)](https://www.npmjs.com/package/caddy-cli)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=flat-square)](https://opensource.org/licenses/ISC)
[![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages-emerald.svg?style=flat-square)](https://keshavsoft.github.io/caddy-cli/)
[![GitHub](https://img.shields.io/badge/github-keshavsoft%2Fcaddy--cli-zinc.svg?style=flat-square&logo=github)](https://github.com/keshavsoft/caddy-cli)
[![Caddy Docs](https://img.shields.io/badge/official-caddyserver.com-00ADD8.svg?style=flat-square)](https://caddyserver.com/docs/)

> **The Human Lens for [Caddy JSON](https://caddyserver.com/docs/json/).**  
> Get the readability of a [Caddyfile](https://caddyserver.com/docs/caddyfile) directly on native, live Caddy JSON. Instant zero-install observability for subdomains, upstream reverse proxies, and port bindings.

---

## 🌐 Live Interactive Playground & Docs

Visit the documentation portal and test your Caddy JSON live in the browser:  
👉 **[https://keshavsoft.github.io/caddy-cli/](https://keshavsoft.github.io/caddy-cli/)**

---

## ⚡ In Place of Caddyfile: Why Native Caddy JSON?

According to the [official Caddy architecture documentation](https://caddyserver.com/docs/getting-started#the-caddyfile-is-an-adapter), **the Caddyfile is only an adapter**.

| | [Caddyfile Adapter](https://caddyserver.com/docs/caddyfile) | [Native Caddy JSON](https://caddyserver.com/docs/json/) |
| :--- | :--- | :--- |
| **Primary Use** | Manual text editing | True source of truth |
| **API Support** | Static, requires file reload | Full zero-downtime [Caddy Admin API](https://caddyserver.com/docs/api) (`:2019`) |
| **Microservices** | Complex to script dynamically | Native, programmable, and automated |
| **Readability** | High | Low (deeply nested JSON arrays) |

**`caddy-cli` bridges the gap:** Keep all the programmable power and zero-downtime API capabilities of native Caddy JSON, while `caddy-cli` provides instant, human-readable visibility into your live reverse proxies.

---

## 🔗 Official Caddy Reference Deep-Links

For detailed explanations of Caddy internals, refer directly to official upstream documentation:

- 📖 **Caddy JSON Structure**: [caddyserver.com/docs/json/](https://caddyserver.com/docs/json/)
- 🔄 **Reverse Proxy & Upstreams (`dial`)**: [caddyserver.com/docs/json/apps/http/servers/routes/handle/reverse_proxy/](https://caddyserver.com/docs/json/apps/http/servers/routes/handle/reverse_proxy/)
- 🔀 **Subroutes & Matchers**: [caddyserver.com/docs/json/apps/http/servers/routes/handle/subroute/](https://caddyserver.com/docs/json/apps/http/servers/routes/handle/subroute/)
- 🎯 **Host Matching**: [caddyserver.com/docs/json/apps/http/servers/routes/match/host/](https://caddyserver.com/docs/json/apps/http/servers/routes/match/host/)
- ⚙️ **Caddy Admin API (`localhost:2019`)**: [caddyserver.com/docs/api](https://caddyserver.com/docs/api)

---

## 🚀 Quick Run with `npx`

Zero installation required. Run directly in any directory containing `caddy.json` (such as `/etc/caddy#` on your server):

```bash
# Auto-resolves ./caddy.json or /etc/caddy/caddy.json
npx caddy-cli

# Or specify a custom path
npx caddy-cli /etc/caddy/caddy.json
```

---

## ⚙️ CLI Options & Flags

```text
Usage:
  npx caddy-cli [options] [path/to/caddy.json]
  npx caddy-cli [domain] [path/to/caddy.json]
  npx caddy-cli add <template> <domain> <port/targets> [configPath] [flags]

Commands:
  add, insert           Programmatically add a new route using a blueprint template
                        Templates: proxy, ws-split, static, multi-host

Options:
  -h, --help            Show help message
  -v, --version         Show version number
  -u, --unique          Print only unique hostnames (one per line)
  -p, --ports           Display port and upstream dial target mappings
  -d, --domain <host>   Inspect the complete configuration route for a specific subdomain
  --json                Output results as formatted JSON

Add Flags:
  --reload              Automatically trigger 'caddy reload' after writing
  --force               Bypass duplicate domain check
  --no-backup           Do not create a timestamped backup
```

---

## 📖 Real Output Examples

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

### 2. Port & Upstream Lookup (`-p` / `--ports`)
Check all active backend ports (find occupied ports or verify reverse proxy bindings):

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

### 3. Inspect a Single Subdomain (`-d` or domain argument)
Drill down into a specific subdomain without scrolling through 300 lines of JSON:

```bash
npx caddy-cli -d quotation.keshavsoft.com
# or domain shorthand:
npx caddy-cli cc9.keshavsoft.com

# Raw JSON dump (perfect for piping to jq or scripts):
npx caddy-cli cc9.keshavsoft.com --json
```

---

### 4. Programmatically Add a Route (`caddy-cli add`)
Add a new subdomain route directly into `caddy.json` using verified `caddy-template` blueprints:

```bash
# Add standard unified proxy (e.g. CareCall appointment-notifier on port 3000):
npx caddy-cli add proxy appointment.keshavsoft.com 3000

# Add and immediately trigger zero-downtime hot reload:
npx caddy-cli add proxy appointment.keshavsoft.com 3000 --reload

# Add split WebSocket + HTTP proxy:
npx caddy-cli add ws-split quotation.keshavsoft.com 9011 8080

# Add static file server:
npx caddy-cli add static doc.keshavsoft.com /usr/share/caddy
```

**What `caddy-cli add` handles automatically:**
1. Checks for existing domain collisions to prevent duplicate routes.
2. Creates an automatic timestamped backup (`caddy.json.bak.<timestamp>`).
3. Inserts the clean, schema-compliant route block from `caddy-template`.
4. Optionally triggers `caddy reload --config <file>` with `--reload`.
5. Prints the updated route table.

---

## 📦 Programmatic Usage (ESM)

Use `caddy-cli` directly in your Node.js scripts:

```javascript
import {
  inspectRoutesFromFile,
  getPortMappingsFromFile,
  findRouteByHostFromFile
} from "caddy-cli";

// 1. Inspect all reverse proxy routes
const routes = inspectRoutesFromFile("./caddy.json");

// 2. Map all occupied ports
const ports = getPortMappingsFromFile("./caddy.json");

// 3. Drill down into a specific domain
const route = findRouteByHostFromFile("./caddy.json", "cc9.keshavsoft.com");
console.log(route.rawRoute);
```

---

## 📄 License

[ISC](LICENSE) &copy; [KeshavSoft](https://github.com/keshavsoft) &bull; Supporting the [Caddy Server](https://caddyserver.com) community.
