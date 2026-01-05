/**
 * Client Component: Formulaire Contact DPO
 *
 * RGPD: Art. 12-22 (Exercice des droits)
 * Classification: P1 (métadonnées demande RGPD)
 *
 * LOT 10.2 — Formulaire Contact DPO
 * - Client Component React (use client)
 * - Validation côté client + serveur
 * - Envoi via API backend (à créer)
 * - Aucune donnée sensible dans les logs
 */

'use client';

import { useState } from 'react';

type RequestType =
  | 'access'
  | 'rectification'
  | 'erasure'
  | 'limitation'
  | 'portability'
  | 'opposition'
  | 'human_review'
  | 'question'
  | 'complaint';

export default function DpoContactForm() {
  const [requestType, setRequestType] = useState<RequestType>('question');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const requestTypeLabels: Record<RequestType, string> = {
    access: 'Accès à mes données (Art. 15)',
    rectification: 'Rectification (Art. 16)',
    erasure: 'Effacement / Droit à l&apos;oubli (Art. 17)',
    limitation: 'Limitation du traitement (Art. 18)',
    portability: 'Portabilité (Art. 20)',
    opposition: 'Opposition à un traitement (Art. 21)',
    human_review: 'Révision humaine / Contestation IA (Art. 22)',
    question: 'Question générale RGPD',
    complaint: 'Réclamation',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation côté client
    if (!email || !email.includes('@')) {
      setErrorMessage('Veuillez fournir une adresse email valide');
      setSubmitStatus('error');
      return;
    }

    if (!message || message.trim().length < 20) {
      setErrorMessage('Votre message doit contenir au moins 20 caractères');
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact/dpo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType,
          email,
          message,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to send request');
      }

      setSubmitStatus('success');
      setEmail('');
      setMessage('');
      setRequestType('question');
    } catch {
      setErrorMessage('Une erreur est survenue. Veuillez réessayer ou contacter directement dpo@votre-plateforme.fr');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Type de demande */}
      <div>
        <label htmlFor="requestType" className="block text-sm font-medium text-gray-700 mb-2">
          Objet de votre demande <span className="text-red-500">*</span>
        </label>
        <select
          id="requestType"
          value={requestType}
          onChange={(e) => setRequestType(e.target.value as RequestType)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        >
          {Object.entries(requestTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Votre adresse email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="exemple@email.com"
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
        <p className="mt-1 text-sm text-gray-500">
          Nous utiliserons cet email pour vous répondre uniquement
        </p>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
          Votre message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Décrivez votre demande en détail (minimum 20 caractères)..."
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
          minLength={20}
        />
        <p className="mt-1 text-sm text-gray-500">
          {message.length}/2000 caractères {message.length < 20 && '(minimum 20)'}
        </p>
      </div>

      {/* Confidentialité */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-gray-700">
            <strong>Confidentialité :</strong> Vos données sont traitées de manière confidentielle conformément à notre{' '}
            <a href="/legal/privacy-policy" className="text-blue-600 hover:underline">
              Politique de Confidentialité
            </a>
            . Elles ne sont jamais partagées avec des tiers et sont conservées uniquement le temps nécessaire au traitement de votre demande (3 ans maximum pour audit RGPD).
          </p>
        </div>
      </div>

      {/* Status Messages */}
      {submitStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-green-800 mb-1">
                Demande envoyée avec succès
              </h4>
              <p className="text-sm text-green-700">
                Notre DPO va traiter votre demande dans les meilleurs délais (délai maximum : 1 mois conformément à l&apos;Art. 12.3 RGPD). Vous recevrez une réponse par email.
              </p>
            </div>
          </div>
        </div>
      )}

      {submitStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-red-800 mb-1">
                Erreur lors de l&apos;envoi
              </h4>
              <p className="text-sm text-red-700">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          <span className="text-red-500">*</span> Champs obligatoires
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Envoi en cours...
            </span>
          ) : (
            'Envoyer ma demande'
          )}
        </button>
      </div>

      {/* Alternative Contact */}
      <div className="pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600 text-center">
          Vous préférez nous contacter par email ?{' '}
          <a href="mailto:dpo@votre-plateforme.fr" className="text-blue-600 hover:underline font-medium">
            dpo@votre-plateforme.fr
          </a>
        </p>
      </div>
    </form>
  );
}
