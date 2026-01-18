/**
 * Smoke Tests: Infrastructure Modules Import
 * Goal: Increase coverage by ensuring all modules can be imported
 */

/* eslint-disable @typescript-eslint/no-require-imports */

import { describe, it, expect } from '@jest/globals';

describe('Infrastructure: Alerts', () => {
  it('should import EmailAlertService', () => {
    const alertModule = require('@/infrastructure/alerts/AlertService');
    expect(alertModule).toBeDefined();
    expect(alertModule.EmailAlertService).toBeDefined();
    expect(alertModule.createEmailAlertService).toBeDefined();
  });

  it('should import IncidentAlertService', () => {
    const incidentModule = require('@/infrastructure/alerts/IncidentAlertService');
    expect(incidentModule).toBeDefined();
    expect(incidentModule.IncidentAlertService).toBeDefined();
    expect(incidentModule.createIncidentAlertService).toBeDefined();
  });
});

describe('Infrastructure: Config', () => {
  it('should import env config', () => {
    const envModule = require('@/infrastructure/config/env');
    expect(envModule).toBeDefined();
  });
});

describe('Infrastructure: DB', () => {
  it('should import migrate', () => {
    const migrateModule = require('@/infrastructure/db/migrate');
    expect(migrateModule).toBeDefined();
  });

  it('should import pool', () => {
    const poolModule = require('@/infrastructure/db/pool');
    expect(poolModule).toBeDefined();
  });
});

// Note: Email module uses alerts/AlertService.ts for email functionality
// Note: LLM modules (LlmGateway, LlmProviders, LlmPolicyEngine) planned for LOT 15

describe('Infrastructure: Storage', () => {
  it('should import ExportStorage functions', () => {
    const storageModule = require('@/infrastructure/storage/ExportStorage');
    expect(storageModule).toBeDefined();
    expect(storageModule.storeExportMetadata).toBeDefined();
    expect(storageModule.getExportMetadata).toBeDefined();
    expect(storageModule.deleteExportMetadata).toBeDefined();
  });
});
