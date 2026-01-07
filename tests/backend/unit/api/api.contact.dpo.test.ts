/**
 * API Endpoint Tests: /api/contact/dpo
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('fs/promises', () => {
  const mockAppendFile = jest.fn();
  const mockMkdir = jest.fn();
  return {
    appendFile: mockAppendFile,
    mkdir: mockMkdir,
    __mocks: {
      mockAppendFile,
      mockMkdir,
    },
  };
});

jest.mock('@/infrastructure/audit/PgAuditEventWriter', () => {
  const mockWrite = jest.fn();
  return {
    PgAuditEventWriter: class {
      write = mockWrite;
    },
    __mocks: {
      mockWrite,
    },
  };
});

const { __mocks: fsMocks } = jest.requireMock('fs/promises') as {
  __mocks: {
    mockAppendFile: jest.Mock;
    mockMkdir: jest.Mock;
  };
};

const { __mocks: auditMocks } = jest.requireMock(
  '@/infrastructure/audit/PgAuditEventWriter'
) as {
  __mocks: {
    mockWrite: jest.Mock;
  };
};

const { mockAppendFile, mockMkdir } = fsMocks;
const { mockWrite } = auditMocks;

import { POST } from '@app/api/contact/dpo/route';

describe('API: /api/contact/dpo', () => {
  beforeEach(() => {
    mockAppendFile.mockReset().mockResolvedValue(undefined);
    mockMkdir.mockReset().mockResolvedValue(undefined);
    mockWrite.mockReset().mockResolvedValue(undefined);
  });

  it('accepts a valid DPO contact request', async () => {
    const request = new Request('http://localhost/api/contact/dpo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'access',
        email: 'user@example.com',
        message: 'I would like to request access to my data.',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(202);
    expect(data.requestId).toBeTruthy();
    expect(data.receivedAt).toBeTruthy();
    expect(mockMkdir).toHaveBeenCalled();
    expect(mockAppendFile).toHaveBeenCalled();
    expect(mockWrite).toHaveBeenCalled();
  });

  it('rejects invalid requests', async () => {
    const request = new Request('http://localhost/api/contact/dpo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'access',
        email: 'user@example.com',
        message: 'Too short',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 500 when storage fails', async () => {
    mockAppendFile.mockRejectedValue(new Error('disk error'));

    const request = new Request('http://localhost/api/contact/dpo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'access',
        email: 'user@example.com',
        message: 'This message is long enough for validation.',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
