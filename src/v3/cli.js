import { run as runSubdomainCli } from "caddy-subdomain/cli";

export function printHelp() {
  console.log(`
caddy-cli (v3.0.0)
Orchestrator CLI for Caddy JSON configurations & subdomain management.

Usage:
  npx caddy-cli add <domain> <port> [configPath] [options]
  npx caddy-cli list [configPath]
  npx caddy-cli check <domain> [configPath]

Commands:
  add <domain> <port>       Append a new reverse proxy subdomain to Caddy
  list                      List all configured subdomains
  check <domain>            Check if a subdomain is already registered

Options:
  --reload                  Trigger 'caddy reload' after saving
  --force                   Bypass duplicate subdomain check
  --no-backup               Skip timestamped backup file creation
  -h, --help                Show help message
  -v, --version             Show version number

Examples:
  npx caddy-cli add billing.keshavsoft.com 5000
  npx caddy-cli add billing.keshavsoft.com 5000 ./caddy.json --reload
  npx caddy-cli list ./caddy.json
  npx caddy-cli check quotation.keshavsoft.com
`);
}

export function run(args = process.argv.slice(2)) {
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    printHelp();
    return;
  }

  if (args.includes("-v") || args.includes("--version")) {
    console.log("3.0.0");
    return;
  }

  runSubdomainCli(args);
}

export default { run, printHelp };
