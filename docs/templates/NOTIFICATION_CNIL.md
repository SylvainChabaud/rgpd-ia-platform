# Template — Notification CNIL (Art. 33 RGPD)

> **Usage** : Ce template est utilisé pour notifier la CNIL d'une violation de données personnelles dans les 72 heures (Art. 33.1 RGPD).
>
> **Plateforme officielle** : [https://notifications.cnil.fr](https://notifications.cnil.fr)
>
> **Référence** : [docs/runbooks/incident.md](../runbooks/incident.md)

---

## Informations du responsable de traitement

**Nom de l'organisation** : [À renseigner]
**SIREN** : [À renseigner]
**Adresse** : [À renseigner]
**Pays** : France

**Contact principal** :
- **Nom** : [À renseigner]
- **Fonction** : Responsable RGPD / DPO
- **Email** : dpo@example.com
- **Téléphone** : [À renseigner]

**Délégué à la protection des données (DPO)** :
- **Nom** : [À renseigner]
- **Email** : dpo@example.com
- **Téléphone** : [À renseigner]

---

## Description de la violation (Art. 33.3.a)

### Nature de la violation

**Type de violation** : [Sélectionner]
- [ ] Violation de confidentialité (accès non autorisé, fuite de données)
- [ ] Violation d'intégrité (modification non autorisée, corruption de données)
- [ ] Violation de disponibilité (perte de données, destruction)

**Date et heure de découverte** : [YYYY-MM-DD HH:MM UTC]

**Date et heure estimée de la violation** : [YYYY-MM-DD HH:MM UTC]

**Durée de la violation** : [X heures/jours]

**Circonstances détaillées** :

[Décrire précisément comment la violation s'est produite. Exemples :
- Accès cross-tenant détecté suite à bug applicatif (commit SHA: xxx)
- Export massif accidentel par admin tenant (X records, Y personnes)
- Exfiltration DB suite à vulnérabilité SQL injection (CVE-XXXX-XXXX)
- Ransomware ayant chiffré les backups (vecteur: phishing admin)
]

**Vecteur d'attaque** :

[Décrire le vecteur utilisé. Exemples :
- Bug applicatif (isolation tenant défaillante)
- Vulnérabilité applicative (SQL injection, XSS, IDOR)
- Compromission credentials (phishing, brute force)
- Attaque infrastructure (DDoS, ransomware)
- Erreur humaine (mauvaise configuration, export accidentel)
]

---

## Catégories de personnes concernées (Art. 33.3.a)

**Nombre estimé de personnes concernées** : [X personnes]

**Catégories de personnes** :
- [ ] Membres tenants (utilisateurs finaux)
- [ ] Administrateurs tenants
- [ ] Super administrateurs plateforme
- [ ] Tiers mentionnés dans documents (clients, patients, salariés)

**Détails** :

[Préciser les catégories. Exemple :
- 500 membres du tenant "Avocat X"
- 10 administrateurs tenants
- 3 tiers mentionnés dans documents uploadés (clients du cabinet)
]

---

## Catégories de données concernées (Art. 33.3.b)

**Catégories de données affectées** :

- [ ] **P0 (Identifiants techniques)** : user_id, tenant_id, job_id
- [ ] **P1 (Identité basique)** : email, nom, prénom, hashed_password
- [ ] **P2 (Métadonnées)** : IP address, metadata jobs IA, timestamps
- [ ] **P3 (Données sensibles)** : santé, opinions politiques, données biométriques

**Volume de données** : [X enregistrements]

**Détails** :

[Lister précisément les données. Exemple :
- P1 : 500 emails, 500 noms, 500 hashed_passwords
- P2 : 2000 métadonnées jobs IA (purpose, status, latency)
- P0 : IDs techniques (non sensibles)
- P3 : Aucune (classification stricte empêche stockage P3)
]

---

## Conséquences probables pour les droits et libertés (Art. 33.3.c)

**Évaluation du risque** : [Faible / Moyen / Élevé / Critique]

**Conséquences potentielles** :

[Décrire les risques pour les personnes. Exemples :
- Risque usurpation d'identité (emails + noms exposés)
- Risque discrimination (données sensibles P3 exposées)
- Risque financier (données bancaires exposées) — N/A pour cette plateforme
- Risque réputation (données professionnelles exposées)
- Risque sécurité physique (adresses, localisations) — N/A pour cette plateforme
]

**Justification de l'évaluation** :

[Expliquer le niveau de risque. Exemple :
Risque ÉLEVÉ car :
- Données P1 (emails + noms) exposées à un tiers externe
- Volume important (500 personnes)
- Isolation tenant contournée (mesure de sécurité compromise)
- Risque d'usurpation d'identité et de phishing ciblé
]

---

## Mesures prises ou envisagées (Art. 33.3.d)

### Mesures immédiates (containment)

**Date et heure de containment** : [YYYY-MM-DD HH:MM UTC]

**Actions effectuées** :

- [ ] Isolation du périmètre affecté (blocage IP, désactivation compte, fermeture endpoint)
- [ ] Préservation des preuves (snapshot DB, logs, dumps réseau)
- [ ] Arrêt de la fuite (rotation secrets, révocation tokens JWT)
- [ ] Blocage vecteur d'attaque (patch vulnérabilité, règle WAF)
- [ ] Restauration depuis backup (si perte de données)

**Détails** :

[Décrire les actions immédiates. Exemple :
- T+30min : Isolation tenant affecté (désactivation compte admin compromis)
- T+1h : Révocation tous tokens JWT du tenant
- T+2h : Déploiement hotfix (commit SHA: xxx) corrigeant bug isolation
- T+3h : Restauration DB depuis backup (PITR à T-1h)
- T+4h : Vérification intégrité données restaurées (checksums OK)
]

### Mesures correctives (remédiation)

**Actions effectuées ou planifiées** :

- [ ] Correction bug applicatif (commit SHA: [xxx], déployé le [DATE])
- [ ] Patch vulnérabilité (CVE-XXXX-XXXX, déployé le [DATE])
- [ ] Renforcement tests (tests régression ajoutés, CI/CD)
- [ ] Amélioration monitoring (nouvelles alertes configurées)
- [ ] Formation équipe (si erreur humaine)
- [ ] Audit externe (pentest planifié le [DATE])

**Détails** :

[Décrire les corrections. Exemple :
- Hotfix déployé : correction bug isolation tenant (commit SHA: abc123)
- Tests régression ajoutés : tests/rgpd/cross-tenant-fix.test.ts
- Alerte configurée : "cross_tenant_access" (seuil: ANY, escalade: DPO)
- Pentest externe planifié : 2025-03-15 (audit vulnérabilités)
]

### Mesures d'atténuation pour les personnes concernées

**Actions effectuées ou planifiées** :

- [ ] Notification individuelle par email (Art. 34, si risque élevé)
- [ ] Assistance proposée (hotline, FAQ, accompagnement)
- [ ] Mesures de protection recommandées (changement password, surveillance comptes)
- [ ] Indemnisation (si préjudice avéré)

**Détails** :

[Décrire les mesures pour les personnes. Exemple :
- Email envoyé le [DATE] aux 500 personnes concernées
- Recommandations : changer password, activer 2FA, surveiller emails suspects
- Hotline DPO activée : dpo@example.com, +33 X XX XX XX XX
- FAQ publiée : [URL]
]

---

## Justification du délai de notification (si > 72h)

**Notification dans les 72h** : [Oui / Non]

**Si Non, justification** :

[Expliquer le retard. Exemples conformes Art. 33.1 :
- Découverte tardive de la violation (logs archivés, détection manuelle)
- Investigation complexe (durée nécessaire pour établir périmètre exact)
- Indisponibilité DPO (congés, maladie, force majeure)
]

**Date de notification CNIL** : [YYYY-MM-DD HH:MM UTC]

---

## Documents joints

- [ ] Rapport technique incident (logs anonymisés, chronologie détaillée)
- [ ] Capture d'écran / preuves techniques (bug, vulnérabilité)
- [ ] Rapport post-mortem (RCA, 5 Why's)
- [ ] Preuve notification personnes concernées (email envoyé, liste anonymisée)
- [ ] Preuve containment (commits Git, config alertes)

---

## Coordonnées pour suivi

**Contact privilégié pour suivi CNIL** :

**Nom** : [Nom DPO]
**Fonction** : Délégué à la protection des données
**Email** : dpo@example.com
**Téléphone** : [À renseigner]
**Disponibilité** : [Horaires, astreinte 24/7]

---

## Déclaration

Je soussigné(e) [Nom DPO], agissant en qualité de Délégué à la protection des données pour [Organisation], certifie l'exactitude des informations fournies dans cette notification.

**Date** : [YYYY-MM-DD]
**Signature** : [Signature électronique ou manuscrite]

---

## Informations complémentaires

### Enregistrement interne

**Numéro incident interne** : [ID incident dans table `data_breaches`]
**Lien registre violations** : [URL interface Back Office]

### Mesures de sécurité en place

[Lister les mesures de sécurité qui n'ont PAS été contournées, pour démontrer efforts conformité. Exemple :
- Chiffrement au repos AES-256-GCM (clés non compromises)
- Chiffrement en transit TLS 1.3 (OK)
- Backups quotidiens chiffrés (OK, restauration réussie)
- Audit trail complet (logs préservés, investigation possible)
- Scan secrets automatisé (0 secret détecté en CI/CD)
- Tests automatisés isolation tenant (1 test défaillant identifié et corrigé)
]

### Amélioration continue

**Leçons apprises** :

[Résumé des leçons. Exemple :
1. Renforcer tests isolation tenant (ajouter cas edge: admin multi-tenants)
2. Activer alerting temps réel cross-tenant (pas seulement CI/CD)
3. Former admins tenants sur bonnes pratiques export données
4. Planifier pentest trimestriel (au lieu d'annuel)
]

---

**Fin de la notification CNIL**

---

## Références

- **Guide CNIL violations** : [https://www.cnil.fr/fr/violations-de-donnees-personnelles](https://www.cnil.fr/fr/violations-de-donnees-personnelles)
- **Plateforme notification** : [https://notifications.cnil.fr](https://notifications.cnil.fr)
- **Runbook incident** : [docs/runbooks/incident.md](../runbooks/incident.md)
- **Registre violations** : Table `data_breaches` (Art. 33.5)
