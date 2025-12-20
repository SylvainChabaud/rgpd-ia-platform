import type { BootstrapStateRepo } from "@/app/ports/BootstrapStateRepo";

export class GetBootstrapStatusUseCase {
  constructor(private readonly bootstrapState: BootstrapStateRepo) {}

  async execute(): Promise<{ bootstrapped: boolean }> {
    const bootstrapped = await this.bootstrapState.isBootstrapped();
    return { bootstrapped };
  }
}
