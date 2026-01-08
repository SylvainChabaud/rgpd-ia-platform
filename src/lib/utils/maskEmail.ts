/**
 * Masque un email pour affichage RGPD-safe
 *
 * Applique un masquage partiel de l'email pour respecter la minimisation
 * des données (RGPD Art. 5) tout en permettant l'identification basique
 * par le Super Admin.
 *
 * @param email - Email à masquer
 * @returns Email partiellement masqué (ex: j***@e***)
 *
 * @example
 * maskEmail('john.doe@example.com') // 'j***@e***'
 * maskEmail('a@b.co') // 'a***@b***'
 * maskEmail('invalid') // '[INVALID]'
 */
export function maskEmail(email: string): string {
  // Validation basique
  if (!email || typeof email !== 'string') {
    return '[INVALID]'
  }

  // Vérifier présence du @
  if (!email.includes('@')) {
    return '[INVALID]'
  }

  const parts = email.split('@')

  // Email malformé (pas exactement 2 parties)
  if (parts.length !== 2) {
    return '[INVALID]'
  }

  const [local, domain] = parts

  // Vérifier que les deux parties existent
  if (!local || !domain) {
    return '[INVALID]'
  }

  // Masquer la partie locale (avant @)
  const maskedLocal = local.charAt(0) + '***'

  // Masquer le domaine (partie avant le premier point)
  const domainParts = domain.split('.')
  const maskedDomain = domainParts[0].charAt(0) + '***'

  return `${maskedLocal}@${maskedDomain}`
}
