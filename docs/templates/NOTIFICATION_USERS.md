# Template — Notification Utilisateurs (Art. 34 RGPD)

> **Usage** : Ce template est utilisé pour notifier les personnes concernées d'une violation de données à **risque élevé** (Art. 34 RGPD).
>
> **Délai** : Sans délai indu (dans les meilleurs délais après détection)
>
> **Canaux** : Email principal, bannière in-app, communication publique (si > 10 000 personnes)

---

## Template Email — Notification Individuelle

### Objet

`[IMPORTANT] Incident de sécurité affectant vos données personnelles`

### Corps de l'email

```
Objet : [IMPORTANT] Incident de sécurité affectant vos données personnelles

Madame, Monsieur,

Nous vous contactons pour vous informer d'un incident de sécurité qui a affecté certaines de vos données personnelles sur la plateforme [Nom Plateforme].

Conformément au Règlement Général sur la Protection des Données (RGPD), nous vous communiquons les informations suivantes :

---

## Nature de l'incident

Le [DATE], nous avons détecté [DESCRIPTION CLAIRE DE L'INCIDENT].

Exemple :
"Le 25 décembre 2025, nous avons détecté un accès non autorisé à votre compte suite à une vulnérabilité applicative qui a depuis été corrigée."

---

## Données concernées

Les catégories de données suivantes ont été affectées :

- [Liste des données concernées]

Exemple :
"- Votre adresse email
- Votre nom et prénom
- Les métadonnées de vos 10 derniers jobs IA (dates, types d'analyse)

Vos mots de passe sont stockés sous forme hachée (bcrypt) et n'ont PAS été compromis en clair."

---

## Conséquences potentielles pour vous

[DESCRIPTION CLAIRE DES RISQUES]

Exemple :
"Cet incident pourrait entraîner :
- Réception d'emails de phishing ciblés utilisant votre nom
- Tentatives d'accès non autorisé à votre compte
- Usurpation d'identité (risque faible grâce au hachage des mots de passe)"

---

## Mesures que nous avons prises

Nous avons immédiatement mis en place les actions suivantes :

- [Liste des mesures prises]

Exemple :
"- Isolation du périmètre affecté (blocage accès non autorisés) — T+30min
- Correction de la vulnérabilité et déploiement d'un correctif — T+2h
- Révocation de toutes les sessions actives (reconnexion requise) — T+3h
- Notification à la CNIL — [DATE]
- Renforcement de nos tests de sécurité et monitoring"

---

## Mesures que nous vous recommandons

Par précaution, nous vous recommandons de :

1. **Changer votre mot de passe** immédiatement (lien : [URL])
2. **Activer l'authentification à deux facteurs** (2FA) si disponible
3. **Surveiller vos emails** pour détecter toute tentative de phishing
4. **Vérifier l'activité de votre compte** (historique connexions, jobs IA récents)
5. **Ne jamais cliquer sur des liens suspects** prétendant venir de notre plateforme

---

## Contact et assistance

Pour toute question ou demande d'assistance, vous pouvez nous contacter :

**Délégué à la protection des données (DPO)** :
- Email : dpo@example.com
- Téléphone : [À renseigner]
- Formulaire : [URL formulaire contact DPO]

**Horaires** : Lundi-Vendredi, 9h-18h (astreinte 24/7 pour urgences)

---

## Vos droits RGPD

Vous disposez des droits suivants :

- **Droit d'accès** : Obtenir une copie de vos données (Art. 15 RGPD)
- **Droit de rectification** : Corriger vos données (Art. 16 RGPD)
- **Droit à l'effacement** : Supprimer votre compte et vos données (Art. 17 RGPD)
- **Droit d'opposition** : Vous opposer au traitement de vos données (Art. 21 RGPD)
- **Droit de réclamation** : Déposer une réclamation auprès de la CNIL

Pour exercer vos droits : [URL page "Mes données RGPD" ou formulaire contact DPO]

**CNIL** : [https://www.cnil.fr](https://www.cnil.fr) — Tél. : 01 53 73 22 22

---

## Engagement de transparence

Nous prenons cet incident très au sérieux et nous nous engageons à :

- Maintenir la transparence sur cet incident
- Renforcer continuellement nos mesures de sécurité
- Vous tenir informé(e) de tout développement significatif

Nous vous présentons nos excuses pour ce désagrément et vous remercions de votre confiance.

Cordialement,

[Nom DPO]
Délégué à la protection des données
[Organisation]

---

**Références** :
- Runbook incident : [docs/runbooks/incident.md](../runbooks/incident.md)
- Politique de confidentialité : [URL]
- Page "Informations RGPD" : [URL]
```

---

## Template Bannière In-App — Notification Interface

### Design

```
╔══════════════════════════════════════════════════════════════╗
║ ⚠️ ALERTE SÉCURITÉ                                          ║
║                                                              ║
║ Nous avons détecté un incident de sécurité affectant vos   ║
║ données personnelles. Par précaution, veuillez changer      ║
║ votre mot de passe immédiatement.                           ║
║                                                              ║
║ [En savoir plus] [Changer mon mot de passe]    [Fermer ✕]  ║
╚══════════════════════════════════════════════════════════════╝
```

### Code React (exemple)

```tsx
// src/app/components/SecurityAlertBanner.tsx
import { useState } from 'react';
import Link from 'next/link';

interface SecurityAlertBannerProps {
  incidentId: string;
  severity: 'high' | 'critical';
  message: string;
  detailsUrl: string;
}

export function SecurityAlertBanner({
  incidentId,
  severity,
  message,
  detailsUrl
}: SecurityAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className={`alert alert-${severity} border-l-4 p-4 mb-4`}
      role="alert"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" /* ... */>
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            ⚠️ Alerte Sécurité
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{message}</p>
          </div>
          <div className="mt-4 flex gap-3">
            <Link
              href={detailsUrl}
              className="btn btn-sm btn-primary"
            >
              En savoir plus
            </Link>
            <Link
              href="/settings/security/change-password"
              className="btn btn-sm btn-secondary"
            >
              Changer mon mot de passe
            </Link>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <button
            onClick={() => setDismissed(true)}
            className="text-red-500 hover:text-red-700"
            aria-label="Fermer"
          >
            <svg className="h-5 w-5" /* ... */>
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Usage

```tsx
// src/app/dashboard/page.tsx
import { SecurityAlertBanner } from '@/app/components/SecurityAlertBanner';

export default function DashboardPage() {
  // Fetch incident from API (if active)
  const activeIncident = await getActiveSecurityIncident();

  return (
    <div>
      {activeIncident && (
        <SecurityAlertBanner
          incidentId={activeIncident.id}
          severity={activeIncident.severity}
          message="Nous avons détecté un incident de sécurité affectant vos données personnelles. Par précaution, veuillez changer votre mot de passe immédiatement."
          detailsUrl={`/security/incident/${activeIncident.id}`}
        />
      )}

      {/* Rest of dashboard */}
    </div>
  );
}
```

---

## Template Communication Publique (> 10 000 personnes)

### Page Status / Blog Post

```markdown
# Incident de sécurité — Communication publique

**Date de publication** : [YYYY-MM-DD]
**Dernière mise à jour** : [YYYY-MM-DD HH:MM UTC]

---

## Résumé

Le [DATE], nous avons détecté un incident de sécurité affectant [X personnes] sur la plateforme [Nom Plateforme].

**Statut actuel** : ✅ Résolu (incident contenu, correctif déployé)

---

## Chronologie

| Date/Heure | Événement |
|------------|-----------|
| [DATE] 14:30 UTC | Détection incident (alerte monitoring) |
| [DATE] 15:00 UTC | Isolation périmètre affecté |
| [DATE] 16:30 UTC | Déploiement correctif de sécurité |
| [DATE] 17:00 UTC | Vérification intégrité données |
| [DATE] 18:00 UTC | Notification CNIL |
| [DATE] 19:00 UTC | Notification personnes concernées |

---

## Nature de l'incident

[DESCRIPTION CLAIRE POUR LE GRAND PUBLIC]

Exemple :
"Un bug applicatif a temporairement permis à certains administrateurs d'accéder à des données de tenants autres que le leur. Ce bug a été corrigé dans les 2 heures suivant sa détection."

---

## Données concernées

Les catégories de données suivantes ont été affectées :

- Adresses email
- Noms et prénoms
- Métadonnées jobs IA (dates, types d'analyse)

**Les mots de passe n'ont PAS été compromis** (stockés sous forme hachée).

---

## Mesures prises

Nous avons immédiatement :

1. Isolé le périmètre affecté (T+30min)
2. Corrigé la vulnérabilité (T+2h)
3. Révoqué toutes les sessions actives (T+3h)
4. Notifié la CNIL (T+4h)
5. Notifié les [X] personnes concernées (T+5h)
6. Renforcé nos tests de sécurité et monitoring

---

## Recommandations

Si vous êtes concerné(e), nous vous recommandons de :

- Changer votre mot de passe
- Activer l'authentification à deux facteurs (2FA)
- Surveiller vos emails pour détecter toute tentative de phishing

---

## Contact

**DPO** : dpo@example.com | Tél. : [À renseigner]

**CNIL** : [https://www.cnil.fr](https://www.cnil.fr)

---

## Engagement

Nous prenons cet incident très au sérieux et nous nous engageons à maintenir la transparence et à renforcer continuellement nos mesures de sécurité.

Nous vous présentons nos excuses pour ce désagrément.

[Signature DPO / Direction]
```

---

## Checklist Notification Utilisateurs

### Avant envoi

- [ ] Incident évalué comme **risque élevé** (score ≥ 15/17)
- [ ] CNIL notifiée (ou exemption justifiée Art. 34.3)
- [ ] Template personnalisé avec informations exactes
- [ ] Liste destinataires validée (périmètre exact, pas de doublon)
- [ ] Validation juridique (DPO + Juridique)
- [ ] Validation communication (ton, clarté, empathie)

### Envoi

- [ ] Email envoyé (via service transactionnel sécurisé)
- [ ] Bannière in-app activée (si applicable)
- [ ] Communication publique publiée (si > 10 000 personnes)
- [ ] Hotline DPO activée (astreinte 24/7)
- [ ] FAQ publiée (réponses questions fréquentes)

### Après envoi

- [ ] Enregistrement envoi (logs, liste anonymisée, timestamp)
- [ ] Suivi réponses (emails, appels DPO)
- [ ] Mise à jour registre violations (table `data_breaches`)
- [ ] Retour d'expérience (lessons learned)

---

## Références

- **Art. 34 RGPD** : [Texte officiel](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- **CNIL Guide violations** : [https://www.cnil.fr/fr/violations-de-donnees-personnelles](https://www.cnil.fr/fr/violations-de-donnees-personnelles)
- **Runbook incident** : [docs/runbooks/incident.md](../runbooks/incident.md)
- **Template CNIL** : [NOTIFICATION_CNIL.md](./NOTIFICATION_CNIL.md)
