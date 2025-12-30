/**
 * Tests for Validation Schemas
 * LOT 5.3 - API Layer
 *
 * Coverage targets for lib/validation.ts
 */

import {
  UUIDSchema,
  EmailSchema,
  PasswordSchema,
  DisplayNameSchema,
  SlugSchema,
  ScopeSchema,
  RoleSchema,
  ConsentPurposeSchema,
  AiJobStatusSchema,
  RgpdRequestTypeSchema,
  PaginationSchema,
  DateRangeSchema,
  LoginRequestSchema,
  CreateTenantSchema,
  GrantConsentSchema,
  AiInvokeSchema,
  validateBody,
  validateQuery,
} from '@/lib/validation';

describe('Primitive Schemas', () => {
  describe('UUIDSchema', () => {
    test('accepts valid UUID', () => {
      const result = UUIDSchema.safeParse('550e8400-e29b-41d4-a716-446655440000');
      expect(result.success).toBe(true);
    });

    test('rejects invalid UUID', () => {
      const result = UUIDSchema.safeParse('not-a-uuid');
      expect(result.success).toBe(false);
    });
  });

  describe('EmailSchema', () => {
    test('accepts valid email', () => {
      const result = EmailSchema.safeParse('test@example.com');
      expect(result.success).toBe(true);
    });

    test('rejects invalid email', () => {
      const result = EmailSchema.safeParse('invalid-email');
      expect(result.success).toBe(false);
    });
  });

  describe('PasswordSchema', () => {
    test('accepts valid password', () => {
      const result = PasswordSchema.safeParse('SecurePass123');
      expect(result.success).toBe(true);
    });

    test('rejects too short password', () => {
      const result = PasswordSchema.safeParse('short');
      expect(result.success).toBe(false);
    });

    test('rejects too long password', () => {
      const result = PasswordSchema.safeParse('a'.repeat(129));
      expect(result.success).toBe(false);
    });
  });

  describe('DisplayNameSchema', () => {
    test('accepts valid display name', () => {
      const result = DisplayNameSchema.safeParse('John Doe');
      expect(result.success).toBe(true);
    });

    test('rejects empty display name', () => {
      const result = DisplayNameSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    test('rejects too long display name', () => {
      const result = DisplayNameSchema.safeParse('a'.repeat(256));
      expect(result.success).toBe(false);
    });
  });

  describe('SlugSchema', () => {
    test('accepts valid slug', () => {
      const result = SlugSchema.safeParse('my-tenant-slug');
      expect(result.success).toBe(true);
    });

    test('rejects slug with uppercase', () => {
      const result = SlugSchema.safeParse('My-Tenant');
      expect(result.success).toBe(false);
    });

    test('rejects too short slug', () => {
      const result = SlugSchema.safeParse('ab');
      expect(result.success).toBe(false);
    });

    test('rejects slug with invalid characters', () => {
      const result = SlugSchema.safeParse('my_tenant');
      expect(result.success).toBe(false);
    });
  });
});

describe('Enum Schemas', () => {
  describe('ScopeSchema', () => {
    test('accepts PLATFORM', () => {
      expect(ScopeSchema.safeParse('PLATFORM').success).toBe(true);
    });

    test('accepts TENANT', () => {
      expect(ScopeSchema.safeParse('TENANT').success).toBe(true);
    });

    test('rejects invalid scope', () => {
      expect(ScopeSchema.safeParse('INVALID').success).toBe(false);
    });
  });

  describe('RoleSchema', () => {
    test('accepts any non-empty role', () => {
      expect(RoleSchema.safeParse('admin').success).toBe(true);
    });

    test('rejects empty role', () => {
      expect(RoleSchema.safeParse('').success).toBe(false);
    });
  });

  describe('ConsentPurposeSchema', () => {
    test('accepts valid purposes', () => {
      expect(ConsentPurposeSchema.safeParse('analytics').success).toBe(true);
      expect(ConsentPurposeSchema.safeParse('ai_processing').success).toBe(true);
      expect(ConsentPurposeSchema.safeParse('marketing').success).toBe(true);
      expect(ConsentPurposeSchema.safeParse('personalization').success).toBe(true);
    });

    test('rejects invalid purpose', () => {
      expect(ConsentPurposeSchema.safeParse('invalid').success).toBe(false);
    });
  });

  describe('AiJobStatusSchema', () => {
    test('accepts valid statuses', () => {
      expect(AiJobStatusSchema.safeParse('PENDING').success).toBe(true);
      expect(AiJobStatusSchema.safeParse('RUNNING').success).toBe(true);
      expect(AiJobStatusSchema.safeParse('COMPLETED').success).toBe(true);
      expect(AiJobStatusSchema.safeParse('FAILED').success).toBe(true);
    });
  });

  describe('RgpdRequestTypeSchema', () => {
    test('accepts EXPORT and DELETE', () => {
      expect(RgpdRequestTypeSchema.safeParse('EXPORT').success).toBe(true);
      expect(RgpdRequestTypeSchema.safeParse('DELETE').success).toBe(true);
    });
  });
});

describe('Pagination & DateRange Schemas', () => {
  describe('PaginationSchema', () => {
    test('uses defaults when not provided', () => {
      const result = PaginationSchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    test('accepts custom values', () => {
      const result = PaginationSchema.parse({ limit: '50', offset: '10' });
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(10);
    });

    test('rejects limit > 100', () => {
      const result = PaginationSchema.safeParse({ limit: '101' });
      expect(result.success).toBe(false);
    });

    test('rejects negative offset', () => {
      const result = PaginationSchema.safeParse({ offset: '-1' });
      expect(result.success).toBe(false);
    });
  });

  describe('DateRangeSchema', () => {
    test('accepts empty object', () => {
      const result = DateRangeSchema.parse({});
      expect(result.startDate).toBeUndefined();
      expect(result.endDate).toBeUndefined();
    });

    test('accepts valid date strings', () => {
      const result = DateRangeSchema.parse({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
    });
  });
});

describe('API Request Schemas', () => {
  describe('LoginRequestSchema', () => {
    test('accepts valid login data', () => {
      const result = LoginRequestSchema.safeParse({
        email: 'test@example.com',
        password: 'SecurePass123',
      });
      expect(result.success).toBe(true);
    });

    test('rejects missing email', () => {
      const result = LoginRequestSchema.safeParse({
        password: 'SecurePass123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('CreateTenantSchema', () => {
    test('accepts valid tenant data', () => {
      const result = CreateTenantSchema.safeParse({
        name: 'My Tenant',
        slug: 'my-tenant',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('GrantConsentSchema', () => {
    test('accepts valid consent purpose', () => {
      const result = GrantConsentSchema.safeParse({
        purpose: 'ai_processing',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('AiInvokeSchema', () => {
    test('accepts valid AI invocation', () => {
      const result = AiInvokeSchema.safeParse({
        prompt: 'Summarize this text',
        purpose: 'ai_processing',
      });
      expect(result.success).toBe(true);
    });

    test('accepts optional modelRef', () => {
      const result = AiInvokeSchema.safeParse({
        prompt: 'Summarize this text',
        purpose: 'ai_processing',
        modelRef: 'ollama/tinyllama',
      });
      expect(result.success).toBe(true);
    });

    test('rejects empty prompt', () => {
      const result = AiInvokeSchema.safeParse({
        prompt: '',
        purpose: 'ai_processing',
      });
      expect(result.success).toBe(false);
    });

    test('rejects too long prompt', () => {
      const result = AiInvokeSchema.safeParse({
        prompt: 'a'.repeat(10001),
        purpose: 'ai_processing',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Helper Functions', () => {
  describe('validateBody', () => {
    test('parses and validates request body', async () => {
      const mockRequest = {
        json: async () => ({ email: 'test@example.com', password: 'SecurePass123' }),
      } as Request;

      const result = await validateBody(mockRequest, LoginRequestSchema);
      expect(result.email).toBe('test@example.com');
    });

    test('throws on invalid body', async () => {
      const mockRequest = {
        json: async () => ({ email: 'invalid' }),
      } as Request;

      await expect(validateBody(mockRequest, LoginRequestSchema)).rejects.toThrow();
    });
  });

  describe('validateQuery', () => {
    test('parses and validates query params', () => {
      const params = new URLSearchParams('limit=50&offset=10');
      const result = validateQuery(params, PaginationSchema);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(10);
    });
  });
});
