import {
  WanderloomApiClient,
  type ClaimResultDto,
  type GoogleDriveConnectionStatusDto
} from "./api-client";
import { runBestEffortArchiveSync } from "./best-effort-archive-sync";
import { initialPersistenceViewState } from "./persistence-state";

export class BestEffortArchiveApiClient extends WanderloomApiClient {
  private driveStatus: GoogleDriveConnectionStatusDto | null = null;

  override async getGoogleDriveConnectionStatus(): Promise<GoogleDriveConnectionStatusDto> {
    const status = await super.getGoogleDriveConnectionStatus();
    this.driveStatus = status;
    return status;
  }

  override async claimExploration(explorationId: string): Promise<ClaimResultDto> {
    const result = await super.claimExploration(explorationId);
    const status = this.driveStatus;
    const persistence = {
      ...initialPersistenceViewState(),
      driveArchive: status?.state ?? "unknown",
      driveGrantedScope: status?.grantedScope ?? null,
      driveAuthorizedAt: status?.authorizedAt ?? null,
      driveUpdatedAt: status?.updatedAt ?? null
    } as const;

    void runBestEffortArchiveSync({
      persistence,
      dependencies: {
        syncArchive: () => super.syncArchive(),
        refreshDriveStatus: async () => {
          await this.getGoogleDriveConnectionStatus();
        }
      }
    });

    return result;
  }
}
