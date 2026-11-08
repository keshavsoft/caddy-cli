import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import {
  inspectRoutesFromFile,
  getPortMappingsFromFile,
  findRouteByHostFromFile,
  extractHostsFromFile,
  addRouteToFile
} from "./index.js";

/**
 * Get current package version from package.json
 * @returns {string}
 */
export function getVersion() {
  try {
    const pkgUrl = new URL("../../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync(pkgUrl, "utf8"));
    return pkg.version || "1.3.0";
  } catch {
    return "1.3.0";
  }
}

/**
 * Resolve caddy.json path: checks custom argument, then ./caddy.json, then /etc/caddy/caddy.json
 * @param {string|null} customPath
 * @returns {string}
 */
export function resolveDefaultCaddyPath(customPath) {
  if (customPath) return resolve(process.cwd(), customPath);
  const localPath = resolve(process.cwd(), "./caddy.json");
  if (existsSync(localPath)) return localPath;
  const vpsPath = "/etc/caddy/caddy.json";
  if (existsSync(vpsPath)) return vpsPath;
  return localPath;
}

/**
 * Print CLI help message
 */
export function printHelp() {
  console.log(`
caddy-cli (v${getVersion()})
Fast Caddy JSON inspection and route management CLI for subdomains and upstream ports.

Usage:
  npx caddy-cli [options] [path/to/caddy.json]
  npx caddy-cli [domain] [path/to/caddy.json]
  npx caddy-cli add <template> <domain> <port/target> [configPath] [options]

Commands:
  add, insert           Programmatically add a new route to caddy.json using a blueprint template
                        Templates: proxy, ws-split, static, multi-host

Options:
  -h, --help            Show this help message
  -v, --version         Show version number
  -u, --unique          Print only unique hostnames (one per line)
  -p, --ports           Display port and upstream dial target mappings
  -d, --domain <host>   Inspect the complete configuration route for a specific subdomain
  --json                Output results as formatted JSON

Add Command Options:
  --reload              Automatically execute 'caddy reload' after saving
  --force               Add route even if domain already exists in configuration
  --no-backup           Skip creating a timestamped backup file before modifying

Examples:
  npx caddy-cli
  npx caddy-cli -p
  npx caddy-cli add proxy appointment.keshavsoft.com 3000 --reload
  npx caddy-cli add ws-split quotation.keshavsoft.com 9011 8080
  npx caddy-cli add static doc.keshavsoft.com /usr/share/caddy
  npx caddy-cli -d appointment.keshavsoft.com
`);
}

/**
 * Print help specific to the 'add' subcommand
 */
export function printAddHelp() {
  console.log(`
caddy-cli add — Programmatically add a new route to Caddy JSON

Usage:
  npx caddy-cli add [template] <domain> <port/targets...> [configPath] [flags]

Templates:
  proxy <domain> <port>               Unified reverse proxy (HTTP & WebSocket on single port)
  ws-split <domain> <httpPort> <ws>   Split reverse proxy (WebSockets on wsPort, HTTP on httpPort)
  static <domain> <rootPath>          Static file server with document root
  multi-host <domain1,domain2> <port> Multiple domain aliases to single upstream

Flags:
  --reload        Trigger 'caddy reload' after writing the file
  --force         Bypass duplicate domain check
  --no-backup     Do not create timestamped backup (.bak.<timestamp>)
  --json          Output result as JSON

Examples:
  npx caddy-cli add proxy appointment.keshavsoft.com 3000
  npx caddy-cli add proxy appointment.keshavsoft.com 3000 --reload
  npx caddy-cli add ws-split quotation.keshavsoft.com 9011 8080
  npx caddy-cli add static doc.keshavsoft.com /usr/share/doc /etc/caddy/caddy.json
`);
}

/**
 * Handle 'add' subcommand
 * @param {string[]} addArgs
 */
export function handleAddCommand(addArgs) {
  let template = "proxy";
  let domain = null;
  let port = null;
  let wsPort = null;
  let httpPort = null;
  let root = null;
  let filePath = null;
  let reload = false;
  let force = false;
  let noBackup = false;
  let jsonMode = false;

  const positional = [];

  for (let i = 0; i < addArgs.length; i++) {
    const a = addArgs[i];
    if (a === "-h" || a === "--help") {
      printAddHelp();
      return;
    }
    if (a === "--reload") {
      reload = true;
      continue;
    }
    if (a === "--force") {
      force = true;
      continue;
    }
    if (a === "--no-backup") {
      noBackup = true;
      continue;
    }
    if (a === "--json") {
      jsonMode = true;
      continue;
    }
    if (!a.startsWith("-")) {
      positional.push(a);
    } else {
      console.error(`Unknown option for add: ${a}`);
      printAddHelp();
      process.exit(1);
    }
  }

  const KNOWN_TEMPLATES = ["proxy", "ws-split", "split", "static", "multi-host"];

  if (positional.length === 0) {
    printAddHelp();
    process.exit(1);
  }

  let argIdx = 0;
  if (KNOWN_TEMPLATES.includes(positional[0].toLowerCase())) {
    template = positional[0].toLowerCase();
    argIdx = 1;
  }

  domain = positional[argIdx++];
  if (!domain) {
    console.error("\nError: Domain is required.\nExample: npx caddy-cli add proxy appointment.keshavsoft.com 3000\n");
    process.exit(1);
  }

  if (template === "static") {
    root = positional[argIdx++];
    if (!root) {
      console.error("\nError: Root directory path required for static template.\nExample: npx caddy-cli add static doc.keshavsoft.com /usr/share/caddy\n");
      process.exit(1);
    }
  } else if (template === "ws-split" || template === "split") {
    httpPort = positional[argIdx++];
    wsPort = positional[argIdx++];
    if (!httpPort || !wsPort) {
      console.error("\nError: Both HTTP port and WebSocket port required for ws-split template.\nExample: npx caddy-cli add ws-split quote.keshavsoft.com 9011 8080\n");
      process.exit(1);
    }
  } else {
    port = positional[argIdx++];
    if (!port) {
      console.error("\nError: Port required for proxy template.\nExample: npx caddy-cli add proxy appointment.keshavsoft.com 3000\n");
      process.exit(1);
    }
  }

  const remaining = positional[argIdx];
  if (remaining) {
    filePath = remaining;
  }

  const targetPath = resolveDefaultCaddyPath(filePath);
  if (!existsSync(targetPath)) {
    console.error(`\nError: Caddy JSON file not found at: ${targetPath}`);
    console.error("Please specify a valid path to caddy.json or run from a folder containing caddy.json\n");
    process.exit(1);
  }

  try {
    const result = addRouteToFile(targetPath, {
      template,
      domain,
      port,
      wsPort,
      httpPort,
      root,
      force,
      backup: !noBackup
    });

    let reloadSuccess = false;
    let reloadError = null;
    if (reload) {
      try {
        execSync(`caddy reload --config "${targetPath}"`, { stdio: "pipe" });
        reloadSuccess = true;
      } catch (err) {
        reloadError = err.message;
      }
    }

    if (jsonMode) {
      console.log(JSON.stringify({
        status: "success",
        routeIndex: result.routeIndex,
        backupFile: result.backupFile,
        filePath: result.filePath,
        reloaded: reload ? reloadSuccess : undefined,
        reloadError: reloadError || undefined,
        newRoute: result.newRoute
      }, null, 2));
      return;
    }

    console.log(`\n======================================================`);
    console.log(`✅ Route successfully added to Caddy configuration!`);
    console.log(`======================================================`);
    console.log(`Config file : ${result.filePath}`);
    if (result.backupFile) {
      console.log(`Backup saved: ${result.backupFile}`);
    }
    console.log(`Route index : ${result.routeIndex}`);
    console.log(`Domain(s)   : ${Array.isArray(domain) ? domain.join(", ") : domain}`);
    console.log(`Template    : ${template}`);
    if (port) console.log(`Target port : localhost:${port}`);
    if (httpPort) console.log(`HTTP port   : localhost:${httpPort}`);
    if (wsPort) console.log(`WS port     : localhost:${wsPort}`);
    if (root) console.log(`Document root: ${root}`);

    if (reload) {
      if (reloadSuccess) {
        console.log(`\n🔄 Caddy reloaded successfully in-memory with zero downtime!`);
      } else {
        console.warn(`\n⚠️  Warning: Caddy reload failed: ${reloadError}`);
      }
    } else {
      console.log(`\nTip: Run 'caddy reload --config "${result.filePath}"' or re-run with '--reload' to apply live.`);
    }

    // Print updated route summary table
    const updatedRoutes = inspectRoutesFromFile(result.filePath);
    const overviewRows = [];
    updatedRoutes.forEach((r) => {
      r.hosts.forEach((host) => {
        if (r.targets.length === 0) {
          overviewRows.push({
            Host: host,
            Type: "(no handler)",
            "Upstream / Target": "-",
            Path: "*"
          });
        } else {
          r.targets.forEach((t) => {
            overviewRows.push({
              Host: host,
              Type: t.type,
              "Upstream / Target": t.dials.length ? t.dials.join(", ") : t.root || "(default)",
              Path: t.path
            });
          });
        }
      });
    });

    console.log(`\nActive Subdomains & Reverse Proxy Routes (${overviewRows.length} mappings):\n`);
    console.table(overviewRows);
  } catch (err) {
    console.error(`\nError: ${err.message}\n`);
    process.exit(1);
  }
}

/**
 * Main CLI runner
 * @param {string[]} args
 */
export function run(args = process.argv.slice(2)) {
  // Check if subcommand is 'add' or 'insert'
  if (args[0] === "add" || args[0] === "insert") {
    handleAddCommand(args.slice(1));
    return;
  }

  let filePath = null;
  let targetDomain = null;
  let jsonMode = false;
  let uniqueOnly = false;
  let portsMode = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      printHelp();
      return;
    }
    if (arg === "-v" || arg === "--version") {
      console.log(getVersion());
      return;
    }
    if (arg === "--json") {
      jsonMode = true;
      continue;
    }
    if (arg === "-u" || arg === "--unique") {
      uniqueOnly = true;
      continue;
    }
    if (arg === "-p" || arg === "--ports") {
      portsMode = true;
      continue;
    }
    if (arg === "-d" || arg === "--domain" || arg === "--host") {
      i++;
      if (i < args.length) {
        targetDomain = args[i];
      } else {
        console.error("Error: --domain requires a host argument (e.g. -d sub.domain.com)");
        process.exit(1);
      }
      continue;
    }

    if (!arg.startsWith("-")) {
      if (arg.endsWith(".json") || arg.includes("/") || arg.includes("\\") || existsSync(resolve(process.cwd(), arg))) {
        filePath = arg;
      } else if (!targetDomain) {
        targetDomain = arg;
      } else if (!filePath) {
        filePath = arg;
      }
    } else {
      console.error(`Unknown option: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  const resolvedPath = resolveDefaultCaddyPath(filePath);

  if (!existsSync(resolvedPath)) {
    console.error(`\nError: Caddy JSON file not found at: ${resolvedPath}\n`);
    console.error("Please provide a valid caddy.json path:");
    console.error("  npx caddy-cli [options] [path/to/caddy.json]\n");
    process.exit(1);
  }

  try {
    // Mode 1: Unique Hostnames only (-u / --unique)
    if (uniqueOnly) {
      const result = extractHostsFromFile(resolvedPath);
      if (jsonMode) {
        console.log(JSON.stringify(result.uniqueHosts, null, 2));
      } else {
        result.uniqueHosts.forEach((host) => console.log(host));
      }
      return;
    }

    // Mode 2: Specific Domain Inspection (-d / --domain <host>)
    if (targetDomain) {
      const match = findRouteByHostFromFile(resolvedPath, targetDomain);

      if (!match) {
        const allRoutes = inspectRoutesFromFile(resolvedPath);
        const available = [...new Set(allRoutes.flatMap((r) => r.hosts))];
        console.error(`\nError: Domain '${targetDomain}' was not found in Caddy configuration.`);
        console.error(`\nAvailable subdomains (${available.length}):`);
        available.forEach((h) => console.error(`  - ${h}`));
        console.error("");
        process.exit(1);
      }

      if (jsonMode) {
        console.log(JSON.stringify(match.rawRoute, null, 2));
        return;
      }

      console.log(`\n======================================================`);
      console.log(` Caddy Route Configuration: ${targetDomain}`);
      console.log(` Server: ${match.server} | Route Index: ${match.routeIndex}`);
      console.log(` Hostnames: ${match.hosts.join(", ")}`);
      console.log(`======================================================\n`);

      const summaryTable = match.targets.map((t) => ({
        Type: t.type,
        Path: t.path,
        Target: t.dials.length ? t.dials.join(", ") : t.root || "(default)"
      }));
      console.table(summaryTable);

      console.log("\nRaw Route JSON Definition:\n");
      console.log(JSON.stringify(match.rawRoute, null, 2));
      return;
    }

    // Mode 3: Port and Upstream Dial Mappings (-p / --ports)
    if (portsMode) {
      const mappings = getPortMappingsFromFile(resolvedPath);

      if (jsonMode) {
        console.log(JSON.stringify(mappings, null, 2));
        return;
      }

      console.log(`\nCaddy Upstream Ports & Reverse Proxy Mappings (${mappings.length}):\n`);
      const table = mappings.map((m) => ({
        Port: m.port,
        "Dial Target": m.dial,
        Type: m.type,
        Path: m.path,
        "Host(s)": m.hosts.join(", ")
      }));
      console.table(table);
      return;
    }

    // Mode 4: Default Overview (Subdomains + Target Ports + Handlers)
    const routes = inspectRoutesFromFile(resolvedPath);

    if (jsonMode) {
      console.log(JSON.stringify(routes, null, 2));
      return;
    }

    const overviewRows = [];
    routes.forEach((r) => {
      r.hosts.forEach((host) => {
        if (r.targets.length === 0) {
          overviewRows.push({
            Host: host,
            Type: "(no handler)",
            "Upstream / Target": "-",
            Path: "*"
          });
        } else {
          r.targets.forEach((t) => {
            overviewRows.push({
              Host: host,
              Type: t.type,
              "Upstream / Target": t.dials.length ? t.dials.join(", ") : t.root || "(default)",
              Path: t.path
            });
          });
        }
      });
    });

    const uniqueCount = new Set(routes.flatMap((r) => r.hosts)).size;

    console.log(`\nCaddy Subdomains & Reverse Proxy Routes (${uniqueCount} unique domains):\n`);
    console.table(overviewRows);

    console.log(`\nTip: Run 'npx caddy-cli -p' for port mappings, or 'npx caddy-cli -d <subdomain>' to inspect a specific route.\n`);
  } catch (error) {
    console.error(`\nError: ${error.message}\n`);
    process.exit(1);
  }
}

export default run;
