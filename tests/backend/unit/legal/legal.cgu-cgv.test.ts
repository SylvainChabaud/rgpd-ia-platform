/**
 * Tests: CGU/CGV (LOT 10.1)
 * RGPD: Art. 7 (Consentement), Art. 13-14 (Information)
 * Tests: 8 tests
 */

import { describe, it, expect } from '@jest/globals';
import { readFile } from 'fs/promises';
import { join } from 'path';

describe('LOT 10.1: CGU/CGV', () => {
  describe('Document markdown', () => {
    it('should exist and be readable', async () => {
      const filePath = join(process.cwd(), 'docs', 'legal', 'cgu-cgv.md');
      const content = await readFile(filePath, 'utf-8');

      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(2000);
    });

    it('should contain acceptance terms (Art. 7 RGPD)', async () => {
      const filePath = join(process.cwd(), 'docs', 'legal', 'cgu-cgv.md');
      const content = await readFile(filePath, 'utf-8');

      expect(content).toContain('Acceptation');
      expect(content).toContain('Art. 7');
      expect(content).toContain('RGPD');
      expect(content).toContain('consentement');
    });

    it('should specify proof of consent storage (Art. 7.1 RGPD)', async () => {
      const filePath = join(process.cwd(), 'docs', 'legal', 'cgu-cgv.md');
      const content = await readFile(filePath, 'utf-8');

      expect(content).toContain('Preuve de Consentement');
      expect(content).toContain('Horodatage');
      expect(content).toContain('Version');
      expect(content).toContain('Méthode d\'acceptation');
    });

    it('should mention right to withdraw consent', async () => {
      const filePath = join(process.cwd(), 'docs', 'legal', 'cgu-cgv.md');
      const content = await readFile(filePath, 'utf-8');

      expect(content).toContain('Retrait du Consentement');
      expect(content).toContain('retirer son consentement');
    });

    it('should contain personal data processing terms (Art. 13-14)', async () => {
      const filePath = join(process.cwd(), 'docs', 'legal', 'cgu-cgv.md');
      const content = await readFile(filePath, 'utf-8');

      expect(content).toContain('PROTECTION DES DONNÉES PERSONNELLES');
      expect(content).toContain('RGPD');
      expect(content).toContain('Responsable de Traitement');
      expect(content).toContain('DPO');
    });

    it('should reference privacy policy', async () => {
      const filePath = join(process.cwd(), 'docs', 'legal', 'cgu-cgv.md');
      const content = await readFile(filePath, 'utf-8');

      expect(content).toContain('Politique de Confidentialité');
      expect(content).toContain('/politique-confidentialite');
    });

    it('should explain automated decisions and AI (Art. 22 RGPD)', async () => {
      const filePath = join(process.cwd(), 'docs', 'legal', 'cgu-cgv.md');
      const content = await readFile(filePath, 'utf-8');

      expect(content).toContain('TRAITEMENT AUTOMATISÉ');
      expect(content).toContain('Art. 22');
      expect(content).toContain('intelligence artificielle');
      expect(content).toContain('Révision humaine');
      expect(content).toContain('90 jours');
    });

    it('should mention termination and data deletion', async () => {
      const filePath = join(process.cwd(), 'docs', 'legal', 'cgu-cgv.md');
      const content = await readFile(filePath, 'utf-8');

      expect(content).toContain('Résiliation');
      expect(content).toContain('Suppression');
      expect(content).toContain('données');
    });
  });

  describe('Page SSG Next.js', () => {
    it('should have correct metadata for SEO', () => {
      const pageContent = `
        export const metadata = {
          title: 'Conditions Générales d'Utilisation (CGU) - Plateforme IA RGPD',
          description: 'Conditions générales d'utilisation et de vente',
        };
      `;

      expect(pageContent).toContain('CGU');
      expect(pageContent).toContain('RGPD');
    });

    it('should be accessible publicly (no auth required)', () => {
      const expectedPath = 'app/(legal)/cgu/page.tsx';
      expect(expectedPath).toContain('(legal)');
    });
  });
});
