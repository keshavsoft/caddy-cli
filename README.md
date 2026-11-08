# caddy-cli

> Fast and lightweight CLI tool to extract, inspect, and map hostnames, reverse proxy upstream ports, and route configurations from Caddy JSON configurations.

## Quick Run with npx

Run directly on any VPS or machine without installing:

```bash
# Auto-detects ./caddy.json in current directory (e.g. in /etc/caddy)
npx caddy-cli

# Or specify a custom caddy.json path
npx caddy-cli ./path/to/caddy.json
npx caddy-cli /etc/caddy/caddy.json
```

## CLI Options

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
```

### Examples

#### 1. Default Overview (Subdomains & Targets)
Displays a formatted table mapping all subdomains to their reverse proxy upstreams, ports, and static paths:
```bash
npx caddy-cli
```

#### 2. Port & Upstream Dial Mappings (`-p`)
Quickly find which backend port each subdomain forwards to, or check if a port is in use:
```bash
npx caddy-cli -p
# or
npx caddy-cli --ports
```

#### 3. Inspect a Single Subdomain (`-d` or domain argument)
Drill down into a specific domain's routing configuration:
```bash
npx caddy-cli -d quotation.keshavsoft.com
# or directly by domain shorthand:
npx caddy-cli cc9.keshavsoft.com

# Output raw route JSON (ideal for piping or scripting):
npx caddy-cli cc9.keshavsoft.com --json
```

#### 4. Unique Hostnames List (`-u`)
```bash
npx caddy-cli -u
# or as JSON array
npx caddy-cli -u --json
```

## Programmatic Usage (ESM)

Import directly in your Node.js ES Module projects:

```javascript
import {
  inspectRoutes,
  inspectRoutesFromFile,
  getPortMappings,
  findRouteByHost,
  extractHosts
} from "caddy-cli";

// 1. Inspect all routes with handlers & dial targets
const routes = inspectRoutesFromFile("./caddy.json");

// 2. Port and upstream mappings
const ports = getPortMappings(caddyConfig);

// 3. Find specific domain route
const match = findRouteByHost(caddyConfig, "quotation.keshavsoft.com");
console.log(match.rawRoute);
```

You can also target specific version modules:
```javascript
import * as v1 from "caddy-cli/v1";
import * as v2 from "caddy-cli/v2";
```

## Architecture

```text
src/
├── v1/       # Legacy host & path extractor
├── v2/       # Upstream ports, routes inspector & domain drill-down
├── cli.js    # Re-exports latest CLI runner
└── index.js  # Re-exports latest API
```

## License

ISC
