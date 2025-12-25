/**
 * LOT 6.0 BLOCKER TESTS: Docker Network Isolation
 *
 * Requirements (from TASKS.md LOT 6.0):
 * - DB et services internes non exposés
 * - Réseaux internes isolés
 * - Aucun service interne accessible depuis l'extérieur
 *
 * CRITICAL SECURITY:
 * - Backend network (app <-> ollama) must be INTERNAL ONLY
 * - Data network (app <-> db) must be INTERNAL ONLY
 * - Only reverse-proxy exposed to internet (ports 80/443)
 *
 * EPIC 2 + EPIC 6 compliance
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const DOCKER_COMPOSE_PATH = join(process.cwd(), "docker-compose.yml");

interface DockerComposeConfig {
  services: Record<string, any>;
  networks: Record<string, any>;
  volumes?: Record<string, any>;
  secrets?: Record<string, any>;
}

function loadDockerCompose(): DockerComposeConfig {
  const content = readFileSync(DOCKER_COMPOSE_PATH, "utf8");
  return parseYaml(content);
}

describe("LOT 6.0 BLOCKER: Docker Network Isolation", () => {
  let config: DockerComposeConfig;

  beforeAll(() => {
    config = loadDockerCompose();
  });

  test("BLOCKER: backend network is INTERNAL ONLY (no internet access)", () => {
    const backendNetwork = config.networks.rgpd_backend;

    expect(backendNetwork).toBeDefined();
    expect(backendNetwork.internal).toBe(true);
    expect(backendNetwork.driver).toBe("bridge");

    // Internal network must NOT allow external routing
    expect(backendNetwork.internal).not.toBe(false);
  });

  test("BLOCKER: data network is INTERNAL ONLY (no internet access)", () => {
    const dataNetwork = config.networks.rgpd_data;

    expect(dataNetwork).toBeDefined();
    expect(dataNetwork.internal).toBe(true);
    expect(dataNetwork.driver).toBe("bridge");

    // Internal network must NOT allow external routing
    expect(dataNetwork.internal).not.toBe(false);
  });

  test("BLOCKER: frontend network allows internet (reverse-proxy only)", () => {
    const frontendNetwork = config.networks.rgpd_frontend;

    expect(frontendNetwork).toBeDefined();
    expect(frontendNetwork.internal).toBe(false);
    expect(frontendNetwork.driver).toBe("bridge");

    // Frontend network needs internet for reverse-proxy
    // But only reverse-proxy should be on this network + app
  });

  test("BLOCKER: database is ONLY on data network (not exposed)", () => {
    const dbService = config.services.db;

    expect(dbService).toBeDefined();
    expect(dbService.networks).toBeDefined();

    // DB must be ONLY on data network
    const dbNetworks = Array.isArray(dbService.networks)
      ? dbService.networks
      : Object.keys(dbService.networks);

    expect(dbNetworks).toContain("rgpd_data");
    expect(dbNetworks).not.toContain("rgpd_frontend");
    expect(dbNetworks).not.toContain("rgpd_backend");

    // CRITICAL: DB must NOT expose ports to host
    expect(dbService.ports).toBeUndefined();
  });

  test("BLOCKER: ollama is ONLY on backend network (not exposed)", () => {
    const ollamaService = config.services.ollama;

    expect(ollamaService).toBeDefined();
    expect(ollamaService.networks).toBeDefined();

    // Ollama must be ONLY on backend network
    const ollamaNetworks = Array.isArray(ollamaService.networks)
      ? ollamaService.networks
      : Object.keys(ollamaService.networks);

    expect(ollamaNetworks).toContain("rgpd_backend");
    expect(ollamaNetworks).not.toContain("rgpd_frontend");
    expect(ollamaNetworks).not.toContain("rgpd_data");

    // CRITICAL: Ollama must NOT expose ports to host
    expect(ollamaService.ports).toBeUndefined();
  });

  test("BLOCKER: app is on ALL networks (bridge between isolated networks)", () => {
    const appService = config.services.app;

    expect(appService).toBeDefined();
    expect(appService.networks).toBeDefined();

    // App must be on all 3 networks (bridge role)
    const appNetworks = Array.isArray(appService.networks)
      ? appService.networks
      : Object.keys(appService.networks);

    expect(appNetworks).toContain("rgpd_frontend");
    expect(appNetworks).toContain("rgpd_backend");
    expect(appNetworks).toContain("rgpd_data");

    // CRITICAL: App must NOT expose ports directly (only via reverse-proxy)
    expect(appService.ports).toBeUndefined();
  });

  test("BLOCKER: reverse-proxy is ONLY public entry point", () => {
    const proxyService = config.services["reverse-proxy"];

    expect(proxyService).toBeDefined();
    expect(proxyService.networks).toBeDefined();

    // Proxy must be ONLY on frontend network
    const proxyNetworks = Array.isArray(proxyService.networks)
      ? proxyService.networks
      : Object.keys(proxyService.networks);

    expect(proxyNetworks).toContain("rgpd_frontend");
    expect(proxyNetworks).not.toContain("rgpd_backend");
    expect(proxyNetworks).not.toContain("rgpd_data");

    // CRITICAL: Proxy is ONLY service with exposed ports
    expect(proxyService.ports).toBeDefined();
    expect(proxyService.ports).toContain("80:80");
    expect(proxyService.ports).toContain("443:443");
  });

  test("BLOCKER: network subnets are distinct (no overlap)", () => {
    const frontendSubnet = config.networks.rgpd_frontend.ipam.config[0].subnet;
    const backendSubnet = config.networks.rgpd_backend.ipam.config[0].subnet;
    const dataSubnet = config.networks.rgpd_data.ipam.config[0].subnet;

    // Subnets must be different
    expect(frontendSubnet).not.toBe(backendSubnet);
    expect(frontendSubnet).not.toBe(dataSubnet);
    expect(backendSubnet).not.toBe(dataSubnet);

    // Expected subnets (from docker-compose.yml)
    expect(frontendSubnet).toBe("172.20.0.0/24");
    expect(backendSubnet).toBe("172.21.0.0/24");
    expect(dataSubnet).toBe("172.22.0.0/24");
  });

  test("BLOCKER: no service exposes database port 5432", () => {
    // Verify NO service exposes PostgreSQL default port
    for (const [serviceName, service] of Object.entries(config.services)) {
      if (service.ports) {
        const exposedPorts = Array.isArray(service.ports)
          ? service.ports
          : [service.ports];

        for (const port of exposedPorts) {
          const portStr = String(port);

          // CRITICAL: Port 5432 (PostgreSQL) must NEVER be exposed
          expect(portStr).not.toContain("5432");

          // Also check common database ports
          expect(portStr).not.toContain("3306"); // MySQL
          expect(portStr).not.toContain("27017"); // MongoDB
        }
      }
    }
  });

  test("BLOCKER: no service exposes Ollama port 11434", () => {
    // Verify NO service exposes Ollama default port
    for (const [serviceName, service] of Object.entries(config.services)) {
      if (service.ports) {
        const exposedPorts = Array.isArray(service.ports)
          ? service.ports
          : [service.ports];

        for (const port of exposedPorts) {
          const portStr = String(port);

          // CRITICAL: Port 11434 (Ollama) must NEVER be exposed
          expect(portStr).not.toContain("11434");
        }
      }
    }
  });

  test("BLOCKER: all services have restart policy (resilience)", () => {
    for (const [serviceName, service] of Object.entries(config.services)) {
      expect(service.restart).toBeDefined();
      expect(service.restart).toBe("unless-stopped");
    }
  });

  test("BLOCKER: all services have healthchecks (monitoring)", () => {
    for (const [serviceName, service] of Object.entries(config.services)) {
      expect(service.healthcheck).toBeDefined();
      expect(service.healthcheck.test).toBeDefined();
      expect(service.healthcheck.interval).toBeDefined();
      expect(service.healthcheck.timeout).toBeDefined();
      expect(service.healthcheck.retries).toBeDefined();

      // Healthcheck must be reasonable
      expect(service.healthcheck.retries).toBeGreaterThanOrEqual(3);
    }
  });

  test("BLOCKER: services have resource limits (prevent DoS)", () => {
    // Critical services must have resource limits
    const criticalServices = ["db", "ollama", "app"];

    for (const serviceName of criticalServices) {
      const service = config.services[serviceName];

      expect(service.deploy).toBeDefined();
      expect(service.deploy.resources).toBeDefined();
      expect(service.deploy.resources.limits).toBeDefined();
      expect(service.deploy.resources.limits.cpus).toBeDefined();
      expect(service.deploy.resources.limits.memory).toBeDefined();

      // Limits must be defined (no unlimited resources)
      expect(service.deploy.resources.limits.cpus).not.toBe("0");
      expect(service.deploy.resources.limits.memory).not.toBe("0");
    }
  });

  test("BLOCKER: only 2 ports exposed to host (80 + 443)", () => {
    let totalExposedPorts = 0;
    const exposedPorts: string[] = [];

    for (const [serviceName, service] of Object.entries(config.services)) {
      if (service.ports) {
        const ports = Array.isArray(service.ports)
          ? service.ports
          : [service.ports];

        totalExposedPorts += ports.length;
        exposedPorts.push(...ports.map(String));
      }
    }

    // CRITICAL: Only 2 ports exposed (80 + 443)
    expect(totalExposedPorts).toBe(2);
    expect(exposedPorts).toContain("80:80");
    expect(exposedPorts).toContain("443:443");
  });
});

describe("LOT 6.0 SECURITY: Docker Compose Validation", () => {
  let config: DockerComposeConfig;

  beforeAll(() => {
    config = loadDockerCompose();
  });

  test("SECURITY: no hardcoded passwords in environment", () => {
    for (const [serviceName, service] of Object.entries(config.services)) {
      if (service.environment) {
        const env = service.environment;

        // Check if environment is object or array
        const envEntries = Array.isArray(env)
          ? env
          : Object.entries(env).map(([k, v]) => `${k}=${v}`);

        for (const entry of envEntries) {
          const entryStr = String(entry);

          // CRITICAL: No hardcoded passwords
          // Exception: DATABASE_URL uses ${DB_PASSWORD} variable (not hardcoded)
          if (
            entryStr.includes("PASSWORD") &&
            !entryStr.includes("PASSWORD_FILE") &&
            !entryStr.includes("${DB_PASSWORD}") // Variable reference is OK
          ) {
            // Password must use _FILE suffix (Docker secret) OR variable
            expect(entryStr).toContain("_FILE");
          }
        }
      }
    }
  });

  test("SECURITY: database uses Docker secrets (not env vars)", () => {
    const dbService = config.services.db;

    expect(dbService.secrets).toBeDefined();
    expect(dbService.secrets).toContain("db_password");

    // Environment must use PASSWORD_FILE, not PASSWORD
    const env = dbService.environment;
    if (typeof env === "object" && !Array.isArray(env)) {
      expect(env.POSTGRES_PASSWORD_FILE).toBeDefined();
      expect(env.POSTGRES_PASSWORD).toBeUndefined();
    }
  });

  test("SECURITY: app uses Docker secrets for sensitive data", () => {
    const appService = config.services.app;

    expect(appService.secrets).toBeDefined();
    expect(appService.secrets).toContain("session_secret");
    expect(appService.secrets).toContain("jwt_secret");
    expect(appService.secrets).toContain("bootstrap_platform_secret");

    // Environment must use _FILE suffix
    const env = appService.environment;
    if (typeof env === "object" && !Array.isArray(env)) {
      expect(env.SESSION_SECRET_FILE).toBeDefined();
      expect(env.JWT_SECRET_FILE).toBeDefined();
      expect(env.BOOTSTRAP_PLATFORM_SECRET_FILE).toBeDefined();

      // NO secrets in plain env vars
      expect(env.SESSION_SECRET).toBeUndefined();
      expect(env.JWT_SECRET).toBeUndefined();
    }
  });

  test("SECURITY: all secrets use external files (not inline)", () => {
    expect(config.secrets).toBeDefined();

    for (const [secretName, secretConfig] of Object.entries(config.secrets!)) {
      expect(secretConfig.file).toBeDefined();

      // Secret files must be in ./secrets/ directory
      expect(secretConfig.file).toContain("./secrets/");
      expect(secretConfig.file).toContain(".txt");

      // NO inline secrets (external: false)
      expect(secretConfig).not.toHaveProperty("external");
    }
  });

  test("SECURITY: volumes are persistent and isolated", () => {
    expect(config.volumes).toBeDefined();

    const expectedVolumes = [
      "postgres_data",
      "ollama_data",
      "nginx_ssl",
      "nginx_logs",
    ];

    for (const volumeName of expectedVolumes) {
      expect(config.volumes).toHaveProperty(volumeName);
      expect(config.volumes?.[volumeName]?.driver).toBe("local");
    }
  });
});
