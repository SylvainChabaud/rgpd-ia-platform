/**
 * Use Case Tests: GetBootstrapStatusUseCase
 * LOT 5.3 - Bootstrap System
 */

import { describe, it, expect } from '@jest/globals';
import { GetBootstrapStatusUseCase } from '@/app/usecases/bootstrap/GetBootstrapStatusUseCase';
import { MemBootstrapState } from '../../helpers/memoryRepos';

describe('UseCase: GetBootstrapStatusUseCase', () => {
  it('returns false when system is not bootstrapped', async () => {
    const bootstrapState = new MemBootstrapState();
    const useCase = new GetBootstrapStatusUseCase(bootstrapState);

    const result = await useCase.execute();

    expect(result.bootstrapped).toBe(false);
  });

  it('returns true when system is bootstrapped', async () => {
    const bootstrapState = new MemBootstrapState();
    await bootstrapState.markBootstrapped();
    const useCase = new GetBootstrapStatusUseCase(bootstrapState);

    const result = await useCase.execute();

    expect(result.bootstrapped).toBe(true);
  });

  it('returns consistent status across multiple calls', async () => {
    const bootstrapState = new MemBootstrapState();
    const useCase = new GetBootstrapStatusUseCase(bootstrapState);

    const result1 = await useCase.execute();
    const result2 = await useCase.execute();

    expect(result1.bootstrapped).toBe(result2.bootstrapped);
  });

  it('reflects changes in bootstrap status', async () => {
    const bootstrapState = new MemBootstrapState();
    const useCase = new GetBootstrapStatusUseCase(bootstrapState);

    const beforeBootstrap = await useCase.execute();
    expect(beforeBootstrap.bootstrapped).toBe(false);

    await bootstrapState.markBootstrapped();

    const afterBootstrap = await useCase.execute();
    expect(afterBootstrap.bootstrapped).toBe(true);
  });
});
