import type { PlayerId } from "@wanderloom/game-core";
import type { D1ArchiveExportDatabaseLike } from "./d1-archive-export-repository";

interface GoogleDriveAuthorizationRow {
  readonly refresh_token_ciphertext: string;
  readonly refresh_token_iv: string;
  readonly granted_scope: string;
  readonly authorized_at: string;
  readonly updated_at: string;
  readonly reauthorization_required: number;
  readonly reauthorization_reason: string | null;
}

export interface GoogleDriveAuthorization {
  readonly refreshTokenCiphertext: string;
  readonly refreshTokenIv: string;
  readonly grantedScope: string;
  readonly authorizedAt: string;
  readonly updatedAt: string;
  readonly reauthorizationRequired: boolean;
  readonly reauthorizationReason: string | null;
}

export class D1GoogleDriveAuthorizationRepository {
  constructor(private readonly db: D1ArchiveExportDatabaseLike) {}

  async findByPlayerId(
    playerId: PlayerId
  ): Promise<GoogleDriveAuthorization | null> {
    const row = await this.db
      .prepare(
        `SELECT refresh_token_ciphertext,
                refresh_token_iv,
                granted_scope,
                authorized_at,
                updated_at,
                reauthorization_required,
                reauthorization_reason
         FROM google_drive_authorizations
         WHERE player_id = ?1
         LIMIT 1`
      )
      .bind(playerId)
      .first<GoogleDriveAuthorizationRow>();

    if (row === null) return null;

    return {
      refreshTokenCiphertext: row.refresh_token_ciphertext,
      refreshTokenIv: row.refresh_token_iv,
      grantedScope: row.granted_scope,
      authorizedAt: row.authorized_at,
      updatedAt: row.updated_at,
      reauthorizationRequired: row.reauthorization_required !== 0,
      reauthorizationReason: row.reauthorization_reason
    };
  }

  async upsert(input: {
    readonly playerId: PlayerId;
    readonly refreshTokenCiphertext: string;
    readonly refreshTokenIv: string;
    readonly grantedScope: string;
    readonly authorizedAt: string;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO google_drive_authorizations (
           player_id,
           refresh_token_ciphertext,
           refresh_token_iv,
           granted_scope,
           authorized_at,
           updated_at,
           reauthorization_required,
           reauthorization_reason
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?5, 0, NULL)
         ON CONFLICT(player_id) DO UPDATE SET
           refresh_token_ciphertext = excluded.refresh_token_ciphertext,
           refresh_token_iv = excluded.refresh_token_iv,
           granted_scope = excluded.granted_scope,
           updated_at = excluded.updated_at,
           reauthorization_required = 0,
           reauthorization_reason = NULL`
      )
      .bind(
        input.playerId,
        input.refreshTokenCiphertext,
        input.refreshTokenIv,
        input.grantedScope,
        input.authorizedAt
      )
      .run();
  }

  async markReauthorizationRequired(input: {
    readonly playerId: PlayerId;
    readonly reason: string;
    readonly updatedAt: string;
  }): Promise<void> {
    await this.db
      .prepare(
        `UPDATE google_drive_authorizations
         SET reauthorization_required = 1,
             reauthorization_reason = ?2,
             updated_at = ?3
         WHERE player_id = ?1`
      )
      .bind(input.playerId, input.reason, input.updatedAt)
      .run();
  }
}
