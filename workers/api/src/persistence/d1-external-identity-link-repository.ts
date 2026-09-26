import {
  type ExternalIdentity,
  type ExternalIdentityLink,
  type ExternalIdentityLinkRepository,
  type PlayerId
} from "@wanderloom/game-core";

interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

export interface D1IdentityDatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
}

interface IdentityLinkRow {
  readonly provider: string;
  readonly subject: string;
  readonly player_id: string;
  readonly linked_at: string;
}

function toLink(row: IdentityLinkRow): ExternalIdentityLink {
  return {
    playerId: row.player_id as PlayerId,
    identity: {
      provider: row.provider,
      subject: row.subject
    },
    linkedAt: row.linked_at
  };
}

export class D1ExternalIdentityLinkRepository
  implements ExternalIdentityLinkRepository {
  constructor(private readonly db: D1IdentityDatabaseLike) {}

  async findByIdentity(
    identity: ExternalIdentity
  ): Promise<ExternalIdentityLink | null> {
    const row = await this.db
      .prepare(
        `SELECT provider, subject, player_id, linked_at
         FROM external_identity_links
         WHERE provider = ?1
           AND subject = ?2
         LIMIT 1`
      )
      .bind(identity.provider, identity.subject)
      .first<IdentityLinkRow>();

    return row === null ? null : toLink(row);
  }

  async listByPlayerId(
    playerId: PlayerId
  ): Promise<readonly ExternalIdentityLink[]> {
    const result = await this.db
      .prepare(
        `SELECT provider, subject, player_id, linked_at
         FROM external_identity_links
         WHERE player_id = ?1
         ORDER BY provider, subject`
      )
      .bind(playerId)
      .all<IdentityLinkRow>();

    return result.results.map(toLink);
  }

  async insert(link: ExternalIdentityLink): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO external_identity_links (
           provider,
           subject,
           player_id,
           linked_at
         ) VALUES (?1, ?2, ?3, ?4)`
      )
      .bind(
        link.identity.provider,
        link.identity.subject,
        link.playerId,
        link.linkedAt
      )
      .run();
  }
}
