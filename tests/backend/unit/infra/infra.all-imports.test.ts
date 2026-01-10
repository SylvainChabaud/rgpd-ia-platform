/**
 * Smoke Tests: Infrastructure Modules Import
 * Goal: Increase coverage by ensuring all modules can be imported
 */

import { describe, it, expect } from '@jest/globals';

describe('Infrastructure: Alerts', () => {
  it('should import AlertService', () => {
    const module = require('@/infrastructure/alerts/AlertService');
    expect(module).toBeDefined();
    expect(module.AlertService).toBeDefined();
  });

  it('should import IncidentAlertService', () => {
    const module = require('@/infrastructure/alerts/IncidentAlertService');
    expect(module).toBeDefined();
    expect(module.IncidentAlertService).toBeDefined();
  });
});

describe('Infrastructure: Config', () => {
  it('should import env config', () => {
    const module = require('@/infrastructure/config/env');
    expect(module).toBeDefined();
  });
});

describe('Infrastructure: DB', () => {
  it('should import migrate', () => {
    const module = require('@/infrastructure/db/migrate');
    expect(module).toBeDefined();
  });

  it('should import pool', () => {
    const module = require('@/infrastructure/db/pool');
    expect(module).toBeDefined();
  });
});

describe('Infrastructure: Email', () => {
  it('should import EmailService', () => {
    const module = require('@/infrastructure/email/EmailService');
    expect(module).toBeDefined();
  });
});

describe('Infrastructure: LLM', () => {
  it('should import LlmGateway', () => {
    const module = require('@/infrastructure/llm/LlmGateway');
    expect(module).toBeDefined();
  });

  it('should import LlmProviders', () => {
    const module = require('@/infrastructure/llm/providers');
    expect(module).toBeDefined();
  });

  it('should import LlmPolicyEngine', () => {
    const module = require('@/infrastructure/llm/LlmPolicyEngine');
    expect(module).toBeDefined();
  });
});

describe('Infrastructure: Storage', () => {
  it('should import FileStorage', () => {
    const module = require('@/infrastructure/storage/FileStorage');
    expect(module).toBeDefined();
  });
});
