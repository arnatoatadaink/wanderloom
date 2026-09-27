import type { PersistenceViewState } from "./persistence-state";
import { PersistenceController } from "./persistence-controller";

export class PersistenceCoordinator {
  constructor(private readonly controller: PersistenceController) {}

  getState(): PersistenceViewState {
    return this.controller.getState();
  }

  async afterGuestLoad(): Promise<PersistenceViewState> {
    this.controller.markGuest();
    return this.controller.refreshDriveStatus();
  }

  async afterStoredPlayerLoad(): Promise<PersistenceViewState> {
    return this.controller.refreshDriveStatus();
  }

  async afterGoogleLink(): Promise<PersistenceViewState> {
    this.controller.markGoogleConnected();
    return this.controller.refreshDriveStatus();
  }

  async afterGoogleRestore(): Promise<PersistenceViewState> {
    this.controller.markGoogleConnected();
    return this.controller.refreshDriveStatus();
  }

  async afterDriveAuthorization(): Promise<PersistenceViewState> {
    return this.controller.refreshDriveStatus();
  }
}
