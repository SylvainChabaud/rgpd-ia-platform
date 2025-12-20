export interface BootstrapStateRepo {
  isBootstrapped(): Promise<boolean>;
  markBootstrapped(): Promise<void>;
}
