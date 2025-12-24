# Security Hardening — Production Deployment Checklist

**Version** : 1.0
**LOT** : 2.0 (EPIC 2 — Durcissement serveur & réseau)
**Date** : 2025-12-24
**Statut** : NORMATIF (obligatoire avant production)

---

## Objectif

Ce document fournit une **checklist exploitable** pour sécuriser le déploiement production de la plateforme RGPD-IA-Platform (backend Next.js).

**Périmètre** :
- Configuration système (OS, réseau, SSH, firewall)
- PostgreSQL hardening
- Next.js hardening
- Gestion des secrets
- Monitoring et alertes
- Tests de conformité

**Prérequis** : LOT 1 100% terminé (architecture sécurisée, multi-tenant, auth/authz, audit RGPD-safe, bootstrap CLI).

---

## 1. Prérequis EPIC 1 (Architecture applicative)

### ✅ Validations acquises (LOT 1.0–1.5)

Les points suivants sont **déjà implémentés** et **testés** :

- [ ] **Isolation tenant** : Middleware `tenantGuard` (header `X-Tenant-Id` obligatoire)
  - Tests : [`tests/http.tenant-guard.test.ts`](../../tests/http.tenant-guard.test.ts)
  - Référence : [`src/app/http/tenantGuard.ts`](../../src/app/http/tenantGuard.ts)

- [ ] **RBAC/ABAC centralisé** : `policyEngine` appliqué (pas d'autorisation hardcodée)
  - Tests : [`tests/rgpd.policy-engine.test.ts`](../../tests/rgpd.policy-engine.test.ts)
  - Référence : [`src/app/auth/policyEngine.ts`](../../src/app/auth/policyEngine.ts)

- [ ] **Gateway LLM obligatoire** : Point d'entrée unique pour toute IA
  - Tests : [`tests/rgpd.no-llm-bypass.test.ts`](../../tests/rgpd.no-llm-bypass.test.ts)
  - Référence : [`src/ai/gateway/invokeLLM.ts`](../../src/ai/gateway/invokeLLM.ts)

- [ ] **Audit events RGPD-safe** : Logs événementiels uniquement (pas de payloads)
  - Tests : [`tests/rgpd.audit-events-no-payload.test.ts`](../../tests/rgpd.audit-events-no-payload.test.ts)
  - Référence : [`src/app/audit/AuditEvent.ts`](../../src/app/audit/AuditEvent.ts)

- [ ] **Bootstrap sécurisé** : Exécutable une seule fois, secrets via env, logs RGPD-safe
  - Runbook : [`docs/runbooks/bootstrap.md`](bootstrap.md)
  - Tests : [`tests/rgpd.bootstrap.usecase.test.ts`](../../tests/rgpd.bootstrap.usecase.test.ts)

**Référence normative** : [BOUNDARIES.md](../architecture/BOUNDARIES.md)

---

## 2. Configuration système (OS & réseau)

### 2.1 SSH Hardening

- [ ] **Clé SSH uniquement** : `PasswordAuthentication no` dans `/etc/ssh/sshd_config`
- [ ] **Pas de login root** : `PermitRootLogin no`
- [ ] **SSH v2 uniquement** : `Protocol 2`
- [ ] **Désactiver X11 forwarding** : `X11Forwarding no`
- [ ] **Timeout connexion** : `ClientAliveInterval 300`, `ClientAliveCountMax 2`

**Vérification** :
```bash
sudo sshd -T | grep -E "passwordauthentication|permitrootlogin|protocol"
```

---

### 2.2 Firewall (iptables / ufw)

- [ ] **Ports minimaux exposés** :
  - HTTPS (443) uniquement (public)
  - SSH (22) depuis IPs admin uniquement (optionnel : changer port par défaut)
  - PostgreSQL (5432) **NON exposé publiquement** (127.0.0.1 ou réseau interne Docker)

- [ ] **Deny by default** :
  ```bash
  sudo ufw default deny incoming
  sudo ufw default allow outgoing
  sudo ufw allow 443/tcp
  sudo ufw allow from <ADMIN_IP> to any port 22
  sudo ufw enable
  ```

**Vérification** :
```bash
sudo ufw status verbose
sudo netstat -tuln | grep -E "443|5432"
```

---

### 2.3 Utilisateur système

- [ ] **Application run as non-root** : Créer utilisateur dédié `rgpd-platform`
  ```bash
  sudo useradd -r -s /bin/false -m -d /opt/rgpd-platform rgpd-platform
  ```

- [ ] **Permissions minimales** :
  - Lecture/écriture `/opt/rgpd-platform/` uniquement
  - Pas de sudo

---

### 2.4 Updates automatiques

- [ ] **Mises à jour sécurité activées** :
  ```bash
  sudo apt install unattended-upgrades
  sudo dpkg-reconfigure --priority=low unattended-upgrades
  ```

- [ ] **Kernel & OS updates** : Planifier redémarrages mensuels si nécessaire

---

## 3. PostgreSQL Hardening

### 3.1 Isolation réseau

- [ ] **Listen address interne** : `listen_addresses = 'localhost'` (si local) ou IP réseau interne Docker
- [ ] **Port non-standard** (optionnel) : Changer `5432` → `54321` (obscurcissement basique)

**Configuration** : `/etc/postgresql/<version>/main/postgresql.conf`

---

### 3.2 Connexions TLS uniquement

- [ ] **SSL obligatoire** : `ssl = on` dans `postgresql.conf`
- [ ] **Client SSL obligatoire** : `hostssl all all 0.0.0.0/0 md5` dans `pg_hba.conf`
- [ ] **Certificat valide** : Utiliser Let's Encrypt ou CA interne

**Vérification** :
```bash
sudo -u postgres psql -c "SHOW ssl;"
# Résultat attendu : on
```

**Variable d'environnement** :
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname?sslmode=require
```

---

### 3.3 Chiffrement au repos

**Options** (choisir selon infrastructure) :

- [ ] **Option 1 : LUKS (disk encryption)** — Chiffrement du volume entier
  ```bash
  sudo cryptsetup luksFormat /dev/sdb
  sudo cryptsetup open /dev/sdb postgres_encrypted
  sudo mkfs.ext4 /dev/mapper/postgres_encrypted
  sudo mount /dev/mapper/postgres_encrypted /var/lib/postgresql
  ```

- [ ] **Option 2 : pgcrypto (column-level)** — Chiffrement sélectif via PostgreSQL extension
  ```sql
  CREATE EXTENSION pgcrypto;
  -- Chiffrer colonne sensible
  UPDATE users SET email_hash = crypt(email, gen_salt('bf', 8));
  ```

- [ ] **Option 3 : Transparent Data Encryption (TDE)** — Si PostgreSQL 15+ ou distribution commerciale (EnterpriseDB)

**Recommandation projet** : LUKS (volume complet) + `email_hash` au lieu de `email` en clair (déjà appliqué dans migration 001).

---

### 3.4 Utilisateur minimal privileges

- [ ] **Pas de superuser applicatif** : Créer utilisateur dédié sans privilèges admin
  ```sql
  CREATE USER rgpd_app WITH PASSWORD 'strong_password';
  GRANT CONNECT ON DATABASE rgpd_platform TO rgpd_app;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rgpd_app;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rgpd_app;
  ```

- [ ] **Révocation superuser** : `ALTER USER rgpd_app NOSUPERUSER NOCREATEDB NOCREATEROLE;`

---

### 3.5 Audit logging

- [ ] **Activer logging connexions** :
  ```conf
  log_connections = on
  log_disconnections = on
  log_duration = on
  log_statement = 'ddl'  # DDL uniquement (pas DML pour éviter logs sensibles)
  ```

- [ ] **Log rotation** :
  ```conf
  log_rotation_age = 1d
  log_rotation_size = 100MB
  ```

**Emplacement logs** : `/var/log/postgresql/postgresql-<version>-main.log`

**⚠️ RGPD-safe** : Ne **jamais** logger `log_statement = 'all'` (risque de fuite données métier).

---

## 4. Next.js Hardening

### 4.1 HTTPS obligatoire

- [ ] **Reverse proxy (Nginx/Caddy)** : Termination TLS en amont de Next.js
  ```nginx
  # /etc/nginx/sites-available/rgpd-platform
  server {
      listen 443 ssl http2;
      server_name api.rgpd-platform.example.com;

      ssl_certificate /etc/letsencrypt/live/api.rgpd-platform.example.com/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/api.rgpd-platform.example.com/privkey.pem;
      ssl_protocols TLSv1.2 TLSv1.3;
      ssl_ciphers HIGH:!aNULL:!MD5;

      location / {
          proxy_pass http://127.0.0.1:3000;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
      }
  }

  # Redirection HTTP → HTTPS
  server {
      listen 80;
      server_name api.rgpd-platform.example.com;
      return 301 https://$host$request_uri;
  }
  ```

- [ ] **Next.js trust proxy** : Configurer Next.js pour accepter headers proxy
  ```js
  // next.config.js
  module.exports = {
    experimental: {
      trustHostHeader: true,
    },
  };
  ```

**Vérification** :
```bash
curl -I http://api.rgpd-platform.example.com
# Doit renvoyer 301 → https://
```

---

### 4.2 Headers de sécurité

- [ ] **Content-Security-Policy (CSP)** : Limiter sources scripts/styles
  ```http
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';
  ```

- [ ] **HSTS (Strict-Transport-Security)** : Forcer HTTPS
  ```http
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  ```

- [ ] **X-Frame-Options** : Prévenir clickjacking
  ```http
  X-Frame-Options: DENY
  ```

- [ ] **X-Content-Type-Options** : Empêcher MIME sniffing
  ```http
  X-Content-Type-Options: nosniff
  ```

- [ ] **Referrer-Policy** : Limiter fuite d'informations
  ```http
  Referrer-Policy: strict-origin-when-cross-origin
  ```

**Implémentation** (middleware Next.js) :
```typescript
// src/app/middleware.ts (ou via next.config.js headers)
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return response;
}
```

**Vérification** :
```bash
curl -I https://api.rgpd-platform.example.com | grep -E "X-Frame-Options|Strict-Transport-Security"
```

---

### 4.3 NODE_ENV=production

- [ ] **Variable d'environnement** :
  ```env
  NODE_ENV=production
  ```

- [ ] **Désactiver debug** : Aucun log de stack traces complètes en production
  ```typescript
  // src/shared/logger.ts
  if (process.env.NODE_ENV === "production") {
    // Log error sans stack trace complète
    logger.error({ eventType: "app_error", errorCode: err.code });
  }
  ```

---

### 4.4 Secrets via variables d'environnement

- [ ] **Aucun secret hardcodé** : Vérification via `npm run audit:secrets` (LOT 1.0)
- [ ] **Variables d'environnement uniquement** :
  ```env
  DATABASE_URL=...
  SESSION_SECRET=...
  JWT_SECRET=...
  BOOTSTRAP_PLATFORM_SECRET=...
  ```

- [ ] **Génération secrets sécurisés** :
  ```bash
  openssl rand -hex 32  # Générer SESSION_SECRET
  openssl rand -hex 32  # Générer JWT_SECRET
  ```

**Référence** : [.env.example](../../.env.example)

---

### 4.5 Rate Limiting

**Options** :

- [ ] **Option 1 : Reverse proxy (Nginx)** — Limite par IP
  ```nginx
  limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

  location / {
      limit_req zone=api_limit burst=20 nodelay;
      proxy_pass http://127.0.0.1:3000;
  }
  ```

- [ ] **Option 2 : Middleware Next.js** — Limite par endpoint/tenant
  ```typescript
  // À implémenter dans LOT 2.1+ (pas bloquant LOT 2.0)
  import rateLimit from "express-rate-limit";
  ```

**Recommandation LOT 2.0** : Documenter, implémenter dans LOT 2.1.

---

## 5. Gestion des secrets

### 5.1 Vault ou gestionnaire secrets

**Options** :

- [ ] **HashiCorp Vault** : Stockage centralisé secrets
- [ ] **AWS Secrets Manager** : Si hébergement AWS
- [ ] **Azure Key Vault** : Si hébergement Azure
- [ ] **Google Secret Manager** : Si hébergement GCP
- [ ] **Docker Secrets** : Si stack Docker Swarm

**Exemple Vault** :
```bash
# Stocker secret
vault kv put secret/rgpd-platform/prod SESSION_SECRET="..."

# Récupérer au démarrage
export SESSION_SECRET=$(vault kv get -field=SESSION_SECRET secret/rgpd-platform/prod)
```

---

### 5.2 Rotation régulière

- [ ] **Rotation JWT_SECRET** : Tous les 90 jours (ou selon politique)
- [ ] **Rotation SESSION_SECRET** : Tous les 90 jours
- [ ] **Rotation DB password** : Tous les 180 jours

**Procédure** :
1. Générer nouveau secret
2. Déployer nouvelle version avec double-support (ancien + nouveau)
3. Invalider ancien secret après transition (grace period 24h)

---

### 5.3 Pas de secrets dans logs/audit

- [ ] **Logger guards activés** : `src/shared/logger.ts` bloque clés interdites
  - Clés bloquées : `password`, `token`, `secret`, `api_key`, `email`, `prompt`, `content`, etc.
  - Test : [`tests/rgpd.no-sensitive-logs.test.ts`](../../tests/rgpd.no-sensitive-logs.test.ts)

- [ ] **Audit events sans payloads** : Uniquement IDs et événements
  - Référence : [`src/app/audit/AuditEvent.ts`](../../src/app/audit/AuditEvent.ts)
  - Test : [`tests/rgpd.audit-events-no-payload.test.ts`](../../tests/rgpd.audit-events-no-payload.test.ts)

**Conformité** : [DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md) (P0-P3)

---

### 5.4 Pas de secrets dans repo Git

- [ ] **Scan automatique** : `scripts/audit/scan-secrets.sh` (exécuté en CI/CD)
- [ ] **Pre-commit hook** : Bloquer commits contenant secrets (optionnel)
  ```bash
  # .git/hooks/pre-commit
  bash scripts/audit/scan-secrets.sh
  ```

**Vérification** :
```bash
npm run audit:secrets
# Résultat attendu : ✅ OK: No hardcoded secrets detected
```

---

## 6. Monitoring & Alertes

### 6.1 Logs centralisés

- [ ] **Format structuré JSON** : `src/shared/logger.ts` produit JSON sur stdout/stderr
  ```json
  {"level":"info","eventType":"tenant_created","tenantId":"uuid","timestamp":"2025-12-24T10:00:00Z"}
  ```

- [ ] **Collecteur logs** : ELK Stack, Datadog, CloudWatch, Loki, etc.
  ```bash
  # Exemple Docker Compose avec Loki
  docker logs rgpd-platform-app | promtail → Loki → Grafana
  ```

- [ ] **Rétention logs** : 30 jours (conformité P1, cf. DATA_CLASSIFICATION.md)

---

### 6.2 Alertes critiques

- [ ] **Échec bootstrap** : Alert si `bootstrap:superadmin` ou `bootstrap:tenant` échoue
- [ ] **Tentatives cross-tenant** : Alert si rejection par `policyEngine` (ABAC violation)
- [ ] **Erreurs Gateway LLM** : Alert si `invokeLLM()` échoue de manière répétée
- [ ] **Échecs authentification** : Alert si > 10 erreurs 401/403 par minute

**Exemple config Grafana** :
```yaml
alerts:
  - name: cross_tenant_violation
    expr: rate(audit_events{event_type="permission_denied",reason~=".*cross-tenant.*"}[5m]) > 0
    severity: critical
```

---

### 6.3 Métriques sans labels sensibles

- [ ] **Labels autorisés** : `tenantId` (UUID opaque), `actorScope`, `eventType`
- [ ] **Labels interdits** : `email`, `displayName`, `prompt`, `content`

**Exemple Prometheus** :
```
http_requests_total{method="POST",endpoint="/api/tenants",tenant_id="uuid",status="200"} 42
```

**Conformité** : [DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md) (métriques = P1 max)

---

## 7. Tests de conformité

### 7.1 Tests RGPD obligatoires

- [ ] **Tests isolation tenant** : [`tests/db.cross-tenant-isolation.test.ts`](../../tests/db.cross-tenant-isolation.test.ts)
- [ ] **Tests RBAC/ABAC** : [`tests/rgpd.policy-engine.test.ts`](../../tests/rgpd.policy-engine.test.ts)
- [ ] **Tests no LLM bypass** : [`tests/rgpd.no-llm-bypass.test.ts`](../../tests/rgpd.no-llm-bypass.test.ts)
- [ ] **Tests no sensitive logs** : [`tests/rgpd.no-sensitive-logs.test.ts`](../../tests/rgpd.no-sensitive-logs.test.ts)
- [ ] **Tests audit events** : [`tests/rgpd.audit-events-no-payload.test.ts`](../../tests/rgpd.audit-events-no-payload.test.ts)
- [ ] **Tests bootstrap** : [`tests/rgpd.bootstrap.usecase.test.ts`](../../tests/rgpd.bootstrap.usecase.test.ts)

**Référence normative** : [RGPD_TESTING.md](../testing/RGPD_TESTING.md)

**Commandes** :
```bash
npm test                    # Tous tests (49+)
npm run test:rgpd          # Tests RGPD uniquement
```

---

### 7.2 Commandes de vérification

- [ ] **Lint** : `npm run lint` (aucune erreur)
- [ ] **Typecheck** : `npm run typecheck` (aucune erreur TypeScript)
- [ ] **Tests unitaires** : `npm test` (100% passants)
- [ ] **Scan secrets** : `npm run audit:secrets` (0 secret détecté)

---

### 7.3 Checklist pré-déploiement

- [ ] Tous les tests CI/CD passent (lint, typecheck, tests, audit:secrets)
- [ ] `.env.example` vérifié sans secrets réels
- [ ] Variable `NODE_ENV=production` configurée
- [ ] Secrets générés et stockés dans Vault (ou équivalent)
- [ ] PostgreSQL configuré avec TLS + chiffrement au repos
- [ ] Reverse proxy HTTPS configuré (certificat Let's Encrypt valide)
- [ ] Firewall activé (ports minimaux)
- [ ] Utilisateur non-root créé pour l'application
- [ ] SSH hardened (clé uniquement, pas root login)
- [ ] Monitoring configuré (logs centralisés, alertes critiques)
- [ ] Backup policy implémentée (cf. [backup-policy.md](backup-policy.md))

---

## 8. Références normatives

| Document | Rôle | Lien |
|----------|------|------|
| **BOUNDARIES.md** | Frontières d'architecture | [docs/architecture/BOUNDARIES.md](../architecture/BOUNDARIES.md) |
| **DATA_CLASSIFICATION.md** | Classification P0-P3 | [docs/data/DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md) |
| **RGPD_TESTING.md** | Stratégie de tests RGPD | [docs/testing/RGPD_TESTING.md](../testing/RGPD_TESTING.md) |
| **LLM_USAGE_POLICY.md** | Politique usage IA | [docs/ai/LLM_USAGE_POLICY.md](../ai/LLM_USAGE_POLICY.md) |
| **CLAUDE.md** | Règles développement IA | [CLAUDE.md](../../CLAUDE.md) |
| **TASKS.md** | Roadmap EPIC 1–7 | [TASKS.md](../../TASKS.md) |
| **bootstrap.md** | Bootstrap CLI | [docs/runbooks/bootstrap.md](bootstrap.md) |
| **backup-policy.md** | Politique sauvegardes | [docs/runbooks/backup-policy.md](backup-policy.md) |

---

## 9. Standards de référence (externes)

- **OWASP Top 10** : https://owasp.org/www-project-top-ten/
- **CIS Benchmarks** : https://www.cisecurity.org/cis-benchmarks/
- **ANSSI (France)** : https://www.ssi.gouv.fr/
- **PostgreSQL Security** : https://www.postgresql.org/docs/current/security.html
- **Next.js Security** : https://nextjs.org/docs/app/building-your-application/configuring/security

---

**Document maintenu par** : Équipe Ops/Sec & DPO
**Dernière mise à jour** : 2025-12-24
**Version** : 1.0 (LOT 2.0)
