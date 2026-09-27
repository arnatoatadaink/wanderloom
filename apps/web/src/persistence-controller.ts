import type { WanderloomApiClient } from "./api-client";
import {
  initialPersistenceViewState,
  type PersistenceViewState
} from "./persistence-state";
import { loadDrivePersistenceState } from "./persistence-state-loader";

export class PersistenceController {
  private state: PersistenceViewState = initialPersistenceViewState();

  constructor(private readonly api: WanderloomApiClient) {}

  getState(): PersistenceViewState {
    return this.state;
  }

  markGuest(): PersistenceViewState {
    this.state = {
      ...this.state,
      googleAccount: "guest"
    };
    return this.state;
  }

  markGoogleConnected(): PersistenceViewState {
    this.state = {
      ...this.state,
      googleAccount: "connected"
    };
    return this.state;
  }

  async refreshDriveStatus(): Promise<PersistenceViewState> {
    this.state = await loadDrivePersistenceState({
      api: this.api,
      current: this.state
    });
    return this.state;
  }
}
