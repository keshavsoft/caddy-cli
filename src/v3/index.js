/**
 * ============================================================================
 * Caddy CLI (v3 Orchestrator)
 * Lightweight orchestrator delegating subdomain tasks to 'caddy-subdomain'.
 * ============================================================================
 */

export {
  readCaddyConfig,
  writeCaddyConfig,
  listSubdomains,
  hasSubdomain,
  buildProbeRoute,
  addProbeSubdomain,
  addProbeSubdomainToFile,
  buildProxyRoute,
  addSubdomain,
  addSubdomainToFile
} from "caddy-subdomain";
