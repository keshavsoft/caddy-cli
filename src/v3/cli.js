import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import {
  inspectRoutesFromFile,
  getPortMappingsFromFile,
  findRouteByHostFromFile,
  extractHostsFromFile,
  addRouteToFile
} from "../v2/index.js";
import {
  listSubdomains,
  hasSubdomain,
  readCaddyConfig
} from "./index.js";

/**
 * Get current package version from package.json
 * @returns {string}
 */
export function getVersion() {
  try {
    const pkgUrl = new URL("../../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync(pkgUrl, "utf8"));
    return pkg.version || "3.0.0";
  } catch {
    return "3.0.0";
  }
}

/**
 * Resolve caddy.json path:
 * 1. Custom argument if provided
 * 2. ./caddy.json in present working directory (process.cwd())
 * 3. /etc/caddy/caddy.json (standard Linux VPS location)
 * 4. Fallback samples in present path or subfolders
 * @param {string|null} customPath
 * @returns {string}
 */
export function resolveDefaultCaddyPath(customPath) {
  if (customPath) return resolve(process.cwd(), customPath);

  // 1. Present working directory: ./caddy.json
  const localPath = resolve(process.cwd(), "./caddy.json");
  if (existsSync(localPath)) return localPath;

  // 2. Standard Ubuntu VPS location
  const vpsPath = "/etc/caddy/caddy.json";
  if (existsSync(vpsPath)) return vpsPath;

  // 3. Fallbacks in present directory or subfolders
  const sampleLocal = resolve(process.cwd(), "./caddy.sample.json");
  if (existsSync(sampleLocal)) return sampleLocal;

  const sampleDir = resolve(process.cwd(), "./samples/caddy.sample.json");
  if (existsSync(sampleDir)) return sampleDir;

  const workspaceSample = resolve(process.cwd(), "./caddy-cli/samples/caddy.sample.json");
  if (existsSync(workspaceSample)) return workspaceSample;

  const parentSample = resolve(process.cwd(), "../samples/caddy.sample.json");
  if (existsSync(parentSample)) return parentSample;

  return localPath;
}

/**
 * Print CLI help message
 */
export function printHelp() {
  console.log(`
caddy-cli (v${getVersion()})
Orchestrator CLI for Caddy JSON configurations & subdomain management.

Usage:
  npx caddy-cli [options] [path/to/caddy.json]
  npx caddy-cli [domain] [path/to/caddy.json]
  npx caddy-cli add <template> <domain> <port/target> [configPath] [options]
  npx caddy-cli inspect <domain> [configPath]
  npx caddy-cli check <domain> [configPath]
  npx caddy-cli list [configPath]
  npx caddy-cli ports [configPath]

Commands:
  (default)             Display table of all configured subdomains and targets
  inspect <domain>      Inspect the complete configuration route for a specific subdomain (-d)
  check <domain>        Check if a subdomain is registered in Caddy
  list                  List all configured subdomains
  ports                 Display port and upstream dial target mappings (-p)
  add <tpl> <domain>    Add a new route using a blueprint template (proxy, ws-split, static)

Options:
  -d, --domain <host>   Inspect route for a specific subdomain
  -p, --ports           Display port and upstream dial target mappings
  -u, --unique          Print only unique hostnames (one per line)
  --json                Output results as formatted JSON
  -h, --help            Show this help message
  -v, --version         Show version number

Add Command Options:
  --reload              Automatically execute 'caddy reload' after saving
  --force               Add route even if domain already exists in configuration
  --no-backup           Skip creating a timestamped backup file before modifying

Examples:
  npx caddy-cli
  npx caddy-cli -d call.keshavsoft.com
  npx caddy-cli inspect appointment.keshavsoft.com
  npx caddy-cli -p
  npx caddy-cli list
  npx caddy-cli check quotation.keshavsoft.com
  npx caddy-cli add proxy billing.keshavsoft.com 5000 --reload
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
    }
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
  if (args.includes("-h") || args.includes("--help")) {
    printHelp();
    return;
  }

  if (args.includes("-v") || args.includes("--version")) {
    console.log(getVersion());
    return;
  }

  const firstArg = args[0] ? args[0].toLowerCase() : "";

  // 1. Subcommand: add / insert
  if (firstArg === "add" || firstArg === "insert") {
    handleAddCommand(args.slice(1));
    return;
  }

  let filePath = null;
  let targetDomain = null;
  let jsonMode = false;
  let uniqueOnly = false;
  let portsMode = false;
  let listMode = false;
  let checkDomain = null;

  // 2. Subcommands: list, check, inspect, ports
  if (firstArg === "list") {
    listMode = true;
    if (args[1] && !args[1].startsWith("-")) filePath = args[1];
  } else if (firstArg === "check" && args[1]) {
    checkDomain = args[1];
    if (args[2] && !args[2].startsWith("-")) filePath = args[2];
  } else if (firstArg === "inspect" && args[1]) {
    targetDomain = args[1];
    if (args[2] && !args[2].startsWith("-")) filePath = args[2];
  } else if (firstArg === "ports") {
    portsMode = true;
    if (args[1] && !args[1].startsWith("-")) filePath = args[1];
  } else {
    // Standard flag parsing
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

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
  }

  const resolvedPath = resolveDefaultCaddyPath(filePath);

  if (!existsSync(resolvedPath)) {
    console.error(`\nError: Caddy JSON file not found at: ${resolvedPath}`);
    console.error(`(Default checked: present directory ./caddy.json, /etc/caddy/caddy.json, and samples)`);
    console.error("\nPlease provide a valid caddy.json path or run from a folder containing caddy.json:");
    console.error("  npx caddy-cli [options] [path/to/caddy.json]\n");
    process.exit(1);
  }

  try {
    // Mode 1: Subdomain Check
    if (checkDomain) {
      const config = readCaddyConfig(resolvedPath);
      const isPresent = hasSubdomain(config, checkDomain);
      if (jsonMode) {
        console.log(JSON.stringify({ domain: checkDomain, present: isPresent }, null, 2));
      } else {
        console.log(`Subdomain:        ${checkDomain}`);
        console.log(`Present in Caddy: ${isPresent ? "Yes" : "No"}`);
      }
      return;
    }

    // Mode 2: Subdomain List
    if (listMode) {
      const config = readCaddyConfig(resolvedPath);
      const domains = listSubdomains(config);
      if (jsonMode) {
        console.log(JSON.stringify(domains, null, 2));
      } else {
        console.log(`Configured Caddy Subdomains (${domains.length}):\n`);
        domains.forEach((d, i) => console.log(`  ${i + 1}. ${d}`));
      }
      return;
    }

    // Mode 3: Unique Hostnames only (-u / --unique)
    if (uniqueOnly) {
      const result = extractHostsFromFile(resolvedPath);
      if (jsonMode) {
        console.log(JSON.stringify(result.uniqueHosts, null, 2));
      } else {
        result.uniqueHosts.forEach((host) => console.log(host));
      }
      return;
    }

    // Mode 4: Specific Domain Inspection (-d / --domain <host> / inspect <domain>)
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

      const summaryTable = match.targets.length > 0
        ? match.targets.map((t) => ({
            Type: t.type,
            Path: t.path,
            Target: t.dials.length ? t.dials.join(", ") : t.root || "(default)"
          }))
        : [{
            Type: "(no handler)",
            Path: "*",
            Target: "-"
          }];
      console.table(summaryTable);

      console.log("\nRaw Route JSON Definition:\n");
      console.log(JSON.stringify(match.rawRoute, null, 2));
      return;
    }

    // Mode 5: Port and Upstream Dial Mappings (-p / --ports / ports)
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

    // Mode 6: Default Overview (Subdomains + Target Ports + Handlers)
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

    console.log("\nTip: Run 'npx caddy-cli -p' for port mappings, or 'npx caddy-cli -d <subdomain>' to inspect a specific route.");
    if (overviewRows.some(row => row.Type === "(no handler)")) {
      console.log("Tip: For domains with '(no handler)', run 'npx caddy-fileserver init <domain>' to establish a static site, or 'npx caddy-cli add proxy <domain> <port>' for a backend service.");
    }
  } catch (err) {
    console.error(`\nError: ${err.message}\n`);
    process.exit(1);
  }
}

export default { run, printHelp, resolveDefaultCaddyPath };
