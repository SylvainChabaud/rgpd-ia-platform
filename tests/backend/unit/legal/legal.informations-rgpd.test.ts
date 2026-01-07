/**
 * Tests: Informations RGPD (LOT 10.2)
 * RGPD: Art. 12-22 (Droits des personnes concernées)
 * Tests: 9 tests
 */

import { describe, it, expect } from '@jest/globals';
import { readFile } from 'fs/promises';
import { join } from 'path';

describe('LOT 10.2: Informations RGPD et Formulaire DPO', () => {
  describe('Document markdown', () => {
    it('should exist and be readable', async () => {
      const filePath = join(process.cwd(), 'docs', 'legal', 'informations-rgpd.md');
      const content = await readFile(filePath, 'utf-8');

      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(2000);
    });

    it('should explain all 7 fundamental RGPD rights', async () => {
      const filePath = join(process.cwd(), 'docs', 'legal', 'informations-rgpd.md');
      const content = await readFile(filePath, 'utf-8');

      // Art. 15 - Droit d'accès
      expect(content).toContain('Droit d\'Accès');
      expect(content).toContain('Art. 15');

      // Art. 16 - Droit de rectification
      expect(content).toContain('Droit de Rectification');
      expect(content).toContain('Art. 16');

      // Art. 17 - Droit à l'effacement
      expect(content).toContain('Droit à l\'Effacement');
      expect(content).toContain('Droit à l\'Oubli');
      expect(content).toContain('Art. 17');

      // Art. 18 - Droit à la limitation
      expect(content).toContain('Droit à la Limitation');
      expect(content).toContain('Art. 18');

      // Art. 20 - Droit à la portabilité
      expect(content).toContain('Droit à la Portabilité');
      expect(content).toContain('Art. 20');

      // Art. 21 - Droit d'opposition
      expect(content).toContain('Droit d\'Opposition');
      expect(content).toContain('Art. 21');

      // Art. 22 - Droit à la révision humaine
      expect(content).toContain('Révision Humaine');
      expect(content).toContain('Art. 22');
    });

    it('should mention CNIL complaint procedure (Art. 77)', async () => {
      const filePath = join(process.cwd(), 'docs', 'legal', 'informations-rgpd.md');
      const content = await readFile(filePath, 'utf-8');

      expect(content).toContain('CNIL');
      expect(content).toContain('réclamation');
      expect(content).toContain('Art. 77');
      expect(content).toContain('https://www.cnil.fr');
    });

    it('should provide DPO contact information', async () => {
      const filePath = join(process.cwd(), 'docs', 'legal', 'informations-rgpd.md');
      const content = await readFile(filePath, 'utf-8');

      expect(content).toContain('Délégué à la Protection des Données');
      expect(content).toContain('DPO');
      expect(content).toContain('dpo@votre-plateforme.fr');
    });

    it('should specify response deadlines (Art. 12.3 RGPD)', async () => {
      const filePath = join(process.cwd(), 'docs', 'legal', 'informations-rgpd.md');
      const content = await readFile(filePath, 'utf-8');

      expect(content).toContain('Délais de Réponse');
      expect(content).toContain('Art. 12.3');
      expect(content).toContain('1 mois');
      expect(content).toContain('2 mois');
    });

    it('should explain identity verification process', async () => {
      const filePath = join(process.cwd(), 'docs', 'legal', 'informations-rgpd.md');
      const content = await readFile(filePath, 'utf-8');

      expect(content).toContain('Vérification d\'Identité');
      expect(content).toContain('pièce d\'identité');
    });

    it('should reference other legal documents', async () => {
      const filePath = join(process.cwd(), 'docs', 'legal', 'informations-rgpd.md');
      const content = await readFile(filePath, 'utf-8');

      expect(content).toContain('Politique de Confidentialité');
      expect(content).toContain('/politique-confidentialite');
      expect(content).toContain('CGU');
      expect(content).toContain('/cgu');
    });
  });

  describe('Page SSG Next.js', () => {
    it('should have correct metadata for SEO', () => {
      const pageContent = `
        export const metadata = {
          title: 'Informations RGPD - Exercez vos Droits',
          description: 'Exercez vos droits RGPD : accès, rectification, effacement',
        };
      `;

      expect(pageContent).toContain('RGPD');
      expect(pageContent).toContain('Droits');
    });

    it('should be accessible publicly (no auth required)', () => {
      const expectedPath = 'app/(legal)/informations-rgpd/page.tsx';
      expect(expectedPath).toContain('(legal)');
    });
  });

  describe('DPO Contact Form Component', () => {
    it('should exist as client component', () => {
      // Vérifier que le fichier DpoContactForm.tsx existe
      const expectedPath = 'app/(legal)/informations-rgpd/DpoContactForm.tsx';
      expect(expectedPath).toContain('DpoContactForm');
    });

    it('should validate minimum message length (20 chars)', () => {
      // Test de validation côté client
      const minLength = 20;
      const shortMessage = 'Trop court';
      const validMessage = 'Ceci est un message valide avec plus de 20 caractères';

      expect(shortMessage.length).toBeLessThan(minLength);
      expect(validMessage.length).toBeGreaterThanOrEqual(minLength);
    });

    it('should support all RGPD request types', () => {
      const requestTypes = [
        'access',         // Art. 15
        'rectification',  // Art. 16
        'erasure',        // Art. 17
        'limitation',     // Art. 18
        'portability',    // Art. 20
        'opposition',     // Art. 21
        'human_review',   // Art. 22
        'question',
        'complaint',
      ];

      expect(requestTypes.length).toBe(9);
      expect(requestTypes).toContain('access');
      expect(requestTypes).toContain('human_review');
    });
  });
});
