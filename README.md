# caddy-cli

> Fast and lightweight CLI tool to extract and inspect hostnames and their JSON paths from Caddy JSON configurations.

## Quick Run with npx

Run directly without installing:

```bash
# Reads ./caddy.json in current directory
npx caddy-cli

# Or specify a custom caddy.json path
npx caddy-cli ./path/to/caddy.json
npx caddy-cli /etc/caddy/caddy.json
```

## CLI Options

```text
Usage:
  npx caddy-cli [options] [path/to/caddy.json]

Options:
  -h, --help       Show help message
  -v, --version    Show version number
  -u, --unique     Print only unique hostnames (one per line)
  --json           Output unique hostnames as a JSON array
```

### Examples

```bash
# Print formatted table and unique hostnames
npx caddy-cli

# Print only unique hostnames
npx caddy-cli -u

# Output unique hostnames as JSON array (great for piping into jq or scripts)
npx caddy-cli --json

# Check version
npx caddy-cli --version
```

## Programmatic Usage (`src/`)

You can also import it in your Node.js ES Module projects:

```javascript
import { extractHosts, extractHostsFromFile } from "caddy-cli";

// 1. From a file
const { hosts, hostPaths, uniqueHosts, tableData } = extractHostsFromFile("./caddy.json");

// 2. From an in-memory parsed Caddy configuration
const result = extractHosts(caddyConfig);
console.log(result.uniqueHosts);
```

## License

ISC

