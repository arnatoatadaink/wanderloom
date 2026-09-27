import type { WanderloomApiClient } from "./api-client";
import {
  applyDriveConnectionStatus,
  describeDriveError,
  markDriveTemporarilyUnavailable,
  type PersistenceViewState
} from "./persistence-state";

export async function loadDrivePersistenceState(input: {
  readonly api: Pick<WanderloomApiClient, "getGoogleDriveConnectionStatus">;
  readonly current: PersistenceViewState;
}): Promise<PersistenceViewState> {
  try {
    const status = await input.api.getGoogleDriveConnectionStatus();
    return applyDriveConnectionStatus(input.current, status);
  } catch (error) {
    return markDriveTemporarilyUnavailable(
      input.current,
      describeDriveError(error)
    );
  }
}
