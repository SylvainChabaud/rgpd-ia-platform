/**
 * LOT 6.0 BLOCKER TESTS: Docker Ports Exposure Validation
 *
 * Requirements (from TASKS.md LOT 6.0):
 * - Check ports exposés
 * - Aucun port interne exposé (DB, Ollama, App direct)
 * - Seul reverse-proxy expose 80/443
 *
 * CRITICAL SECURITY:
 * - Database port 5432 NEVER exposed
 * - Ollama port 11434 NEVER exposed
 * - App port 3000 NEVER exposed (only via reverse-proxy)
 * - Only reverse-proxy ports 80/443 exposed
 *
 * EPIC 2 + EPIC 6 compliance
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const DOCKER_COMPOSE_PATH = join(process.cwd(), "docker-compose.yml");
const DOCKERFILE_PATH = join(process.cwd(), "Dockerfile");

interface DockerComposeConfig {
  services: Record<string, any>;
}

function loadDockerCompose(): DockerComposeConfig {
  const content = readFileSync(DOCKER_COMPOSE_PATH, "utf8");
  return parseYaml(content);
}

function loadDockerfile(): string {
  return readFileSync(DOCKERFILE_PATH, "utf8");
}

describe("LOT 6.0 BLOCKER: Docker Ports Exposure", () => {
  let config: DockerComposeConfig;

  beforeAll(() => {
    config = loadDockerCompose();
  });

  test("BLOCKER: database port 5432 is NOT exposed to host", () => {
    const dbService = config.services.db;

    expect(dbService).toBeDefined();

    // CRITICAL: DB must NOT have ports section
    expect(dbService.ports).toBeUndefined();

    // Verify NO service exposes 5432
    for (const service of Object.values(config.services)) {
      if (service.ports) {
        const ports = Array.isArray(service.ports)
          ? service.ports
          : [service.ports];

        for (const port of ports) {
          const portStr = String(port);
          expect(portStr).not.toContain("5432");
        }
      }
    }
  });

  test("BLOCKER: Ollama port 11434 is NOT exposed to host", () => {
    const ollamaService = config.services.ollama;

    expect(ollamaService).toBeDefined();

    // CRITICAL: Ollama must NOT have ports section
    expect(ollamaService.ports).toBeUndefined();

    // Verify NO service exposes 11434
    for (const service of Object.values(config.services)) {
      if (service.ports) {
        const ports = Array.isArray(service.ports)
          ? service.ports
          : [service.ports];

        for (const port of ports) {
          const portStr = String(port);
          expect(portStr).not.toContain("11434");
        }
      }
    }
  });

  test("BLOCKER: app port 3000 is NOT exposed to host", () => {
    const appService = config.services.app;

    expect(appService).toBeDefined();

    // CRITICAL: App must NOT have ports section
    expect(appService.ports).toBeUndefined();

    // Verify NO service exposes 3000
    for (const service of Object.values(config.services)) {
      if (service.ports) {
        const ports = Array.isArray(service.ports)
          ? service.ports
          : [service.ports];

        for (const port of ports) {
          const portStr = String(port);
          expect(portStr).not.toContain("3000");
        }
      }
    }
  });

  test("BLOCKER: ONLY reverse-proxy exposes ports (80 + 443)", () => {
    const proxyService = config.services["reverse-proxy"];

    expect(proxyService).toBeDefined();
    expect(proxyService.ports).toBeDefined();

    const exposedPorts = Array.isArray(proxyService.ports)
      ? proxyService.ports
      : [proxyService.ports];

    // Must expose exactly 2 ports
    expect(exposedPorts.length).toBe(2);
    expect(exposedPorts).toContain("80:80");
    expect(exposedPorts).toContain("443:443");

    // Verify NO other service has ports
    for (const [serviceName, service] of Object.entries(config.services)) {
      if (serviceName !== "reverse-proxy") {
        expect(service.ports).toBeUndefined();
      }
    }
  });

  test("BLOCKER: no common dangerous ports exposed", () => {
    const dangerousPorts = [
      "22", // SSH
      "23", // Telnet
      "3306", // MySQL
      "5432", // PostgreSQL
      "6379", // Redis
      "8080", // HTTP alt
      "8443", // HTTPS alt
      "9000", // PHP-FPM
      "27017", // MongoDB
      "11434", // Ollama
    ];

    for (const service of Object.values(config.services)) {
      if (service.ports) {
        const ports = Array.isArray(service.ports)
          ? service.ports
          : [service.ports];

        for (const port of ports) {
          const portStr = String(port);

          for (const dangerousPort of dangerousPorts) {
            expect(portStr).not.toContain(dangerousPort);
          }
        }
      }
    }
  });

  test("BLOCKER: total exposed ports count is exactly 2", () => {
    let totalPorts = 0;

    for (const service of Object.values(config.services)) {
      if (service.ports) {
        const ports = Array.isArray(service.ports)
          ? service.ports
          : [service.ports];

        totalPorts += ports.length;
      }
    }

    // CRITICAL: Only 2 ports total (80 + 443)
    expect(totalPorts).toBe(2);
  });

  test("BLOCKER: port mappings are explicit (host:container format)", () => {
    const proxyService = config.services["reverse-proxy"];

    if (proxyService.ports) {
      const ports = Array.isArray(proxyService.ports)
        ? proxyService.ports
        : [proxyService.ports];

      for (const port of ports) {
        const portStr = String(port);

        // Must use "host:container" format (not just "port")
        expect(portStr).toMatch(/^\d+:\d+$/);

        // Host and container ports should match (no port mapping)
        const [hostPort, containerPort] = portStr.split(":");
        expect(hostPort).toBe(containerPort);
      }
    }
  });

  test("BLOCKER: services use EXPOSE in Dockerfile (not ports)", () => {
    const dockerfile = loadDockerfile();

    // Dockerfile should use EXPOSE (internal), not publish ports
    expect(dockerfile).toContain("EXPOSE 3000");

    // Verify NO port publishing in Dockerfile
    expect(dockerfile).not.toContain("--publish");
    expect(dockerfile).not.toContain("-p ");
  });

  test("BLOCKER: reverse-proxy depends on app (healthcheck)", () => {
    const proxyService = config.services["reverse-proxy"];

    expect(proxyService.depends_on).toBeDefined();
    expect(proxyService.depends_on.app).toBeDefined();
    expect(proxyService.depends_on.app.condition).toBe("service_healthy");

    // Proxy should NOT start before app is healthy
  });
});

describe("LOT 6.0 SECURITY: Port Binding & Network Access", () => {
  let config: DockerComposeConfig;

  beforeAll(() => {
    config = loadDockerCompose();
  });

  test("SECURITY: services bind to internal IPs only (not 0.0.0.0)", () => {
    // Services should NOT bind to 0.0.0.0 (all interfaces)
    // Internal services should use container networking

    for (const service of Object.values(config.services)) {
      if (service.ports) {
        const ports = Array.isArray(service.ports)
          ? service.ports
          : [service.ports];

        for (const port of ports) {
          const portStr = String(port);

          // Should NOT bind to 0.0.0.0 explicitly
          // Format: "80:80" is OK (Docker handles)
          // Format: "0.0.0.0:80:80" is BAD (explicit bind)
          expect(portStr).not.toMatch(/^0\.0\.0\.0:/);
          expect(portStr).not.toMatch(/^127\.0\.0\.1:/);
        }
      }
    }
  });

  test("SECURITY: no UDP ports exposed (attack surface reduction)", () => {
    for (const service of Object.values(config.services)) {
      if (service.ports) {
        const ports = Array.isArray(service.ports)
          ? service.ports
          : [service.ports];

        for (const port of ports) {
          const portStr = String(port);

          // Should NOT expose UDP ports (format: "53:53/udp")
          expect(portStr).not.toContain("/udp");
        }
      }
    }
  });

  test("SECURITY: all internal services have NO ports section", () => {
    const internalServices = ["db", "ollama", "app"];

    for (const serviceName of internalServices) {
      const service = config.services[serviceName];

      expect(service).toBeDefined();
      expect(service.ports).toBeUndefined();
    }
  });

  test("SECURITY: reverse-proxy ports are standard (80/443 only)", () => {
    const proxyService = config.services["reverse-proxy"];

    const ports = Array.isArray(proxyService.ports)
      ? proxyService.ports
      : [proxyService.ports];

    // ONLY standard HTTP/HTTPS ports
    expect(ports).toHaveLength(2);
    expect(ports).toContain("80:80");
    expect(ports).toContain("443:443");

    // NO non-standard ports (8080, 8443, etc.)
    for (const port of ports) {
      const portStr = String(port);
      const hostPort = portStr.split(":")[0];

      expect(["80", "443"]).toContain(hostPort);
    }
  });

  test("SECURITY: healthchecks use internal URLs (not exposed ports)", () => {
    // App healthcheck should use localhost:3000 (internal)
    const appService = config.services.app;

    expect(appService.healthcheck).toBeDefined();
    expect(appService.healthcheck.test).toBeDefined();

    const healthcheckCmd = appService.healthcheck.test.join(" ");

    // Should use localhost (internal), not external IP
    expect(healthcheckCmd).toContain("localhost:3000");
    expect(healthcheckCmd).not.toContain("0.0.0.0");

    // Proxy healthcheck should use internal localhost
    const proxyService = config.services["reverse-proxy"];
    const proxyHealthcheck = proxyService.healthcheck.test.join(" ");

    expect(proxyHealthcheck).toContain("localhost");
  });
});

describe("LOT 6.0 PRODUCTION READINESS: Port Configuration", () => {
  let config: DockerComposeConfig;

  beforeAll(() => {
    config = loadDockerCompose();
  });

  test("PRODUCTION: no development ports exposed (3000, 5173, etc.)", () => {
    const devPorts = [
      "3000", // Next.js dev
      "5173", // Vite
      "8080", // Common dev server
      "9229", // Node.js debugger
      "9230", // Node.js debugger alt
    ];

    for (const service of Object.values(config.services)) {
      if (service.ports) {
        const ports = Array.isArray(service.ports)
          ? service.ports
          : [service.ports];

        for (const port of ports) {
          const portStr = String(port);

          for (const devPort of devPorts) {
            expect(portStr).not.toContain(devPort);
          }
        }
      }
    }
  });

  test("PRODUCTION: services use production ports internally", () => {
    // App should use port 3000 INTERNALLY (EXPOSE), not externally
    const appService = config.services.app;

    expect(appService.environment).toBeDefined();

    const env = appService.environment;
    if (typeof env === "object" && !Array.isArray(env)) {
      expect(env.PORT).toBe(3000);
    }

    // But ports section should be undefined (not exposed)
    expect(appService.ports).toBeUndefined();
  });

  test("PRODUCTION: reverse-proxy uses standard SSL port (443)", () => {
    const proxyService = config.services["reverse-proxy"];

    const ports = Array.isArray(proxyService.ports)
      ? proxyService.ports
      : [proxyService.ports];

    // Must include 443 for HTTPS
    expect(ports).toContain("443:443");

    // SSL certificates volume should be mounted
    expect(proxyService.volumes).toBeDefined();

    const volumes = Array.isArray(proxyService.volumes)
      ? proxyService.volumes
      : Object.keys(proxyService.volumes);

    const hasSSLVolume = volumes.some((v: unknown) => String(v).includes("ssl"));
    expect(hasSSLVolume).toBe(true);
  });
});
