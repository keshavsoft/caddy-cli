import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { extractHostsFromFile } from "./index.js";

/**
 * Get current package version from package.json
 * @returns {string}
 */
export function getVersion() {
  try {
    const pkgUrl = new URL("../../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync(pkgUrl, "utf8"));
    return pkg.version || "1.0.0";
  } catch {
    return "1.0.0";
  }
}

/**
 * Print CLI help message
 */
export function printHelp() {
  console.log(`
caddy-cli (v${getVersion()})
Extract hostnames and paths from Caddy JSON configurations.

Usage:
  npx caddy-cli [options] [path/to/caddy.json]

Options:
  -h, --help       Show this help message
  -v, --version    Show version number
  -u, --unique     Print only unique hostnames (one per line)
  --json           Output unique hostnames as JSON array

Arguments:
  [path]           Path to caddy.json (defaults to ./caddy.json in current directory)

Examples:
  npx caddy-cli
  npx caddy-cli ./caddy.json
  npx caddy-cli /etc/caddy/caddy.json
  npx caddy-cli --unique
  npx caddy-cli --json
`);
}

/**
 * Main CLI runner
 * @param {string[]} args
 */
export function run(args = process.argv.slice(2)) {
  let filePath = null;
  let jsonMode = false;
  let uniqueOnly = false;

  for (const arg of args) {
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
    } else if (arg === "-u" || arg === "--unique") {
      uniqueOnly = true;
    } else if (!arg.startsWith("-")) {
      filePath = arg;
    } else {
      console.error(`Unknown option: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  const targetPath = filePath || "./caddy.json";
  const resolvedPath = resolve(process.cwd(), targetPath);

  if (!existsSync(resolvedPath)) {
    console.error(`\nError: Caddy JSON file not found at: ${resolvedPath}\n`);
    console.error("Please provide a valid caddy.json path:");
    console.error("  npx caddy-cli [path/to/caddy.json]\n");
    process.exit(1);
  }

  try {
    const result = extractHostsFromFile(resolvedPath);

    if (jsonMode) {
      console.log(JSON.stringify(result.uniqueHosts, null, 2));
      return;
    }

    if (uniqueOnly) {
      result.uniqueHosts.forEach((host) => console.log(host));
      return;
    }

    console.log("\nHostnames and their paths:\n");
    console.table(result.tableData);

    console.log("\nUnique hostnames:\n");
    console.log(result.uniqueHosts);
  } catch (error) {
    console.error(`\nError: ${error.message}\n`);
    process.exit(1);
  }
}

export default run;

