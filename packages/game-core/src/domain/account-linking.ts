import type { IsoDateTime } from "./core-snapshot";
import type { PlayerId } from "./ids";

export interface ExternalIdentity {
  /**
   * Stable provider namespace such as "google".
   * Provider-specific token/email/profile data must not be stored here.
   */
  readonly provider: string;
  /**
   * Stable provider subject identifier (OIDC "sub"), not an email address.
   */
  readonly subject: string;
}

export interface ExternalIdentityLink {
  readonly playerId: PlayerId;
  readonly identity: ExternalIdentity;
  readonly linkedAt: IsoDateTime;
}

export interface AccountLinkInput {
  readonly playerId: PlayerId;
  readonly identity: ExternalIdentity;
  readonly linkedAt: IsoDateTime;
  /**
   * Existing authoritative owner of this exact provider+subject, if any.
   */
  readonly existingIdentityLink: ExternalIdentityLink | null;
  /**
   * Existing external identities already linked to the current player.
   */
  readonly existingPlayerLinks: readonly ExternalIdentityLink[];
}

export interface AccountLinkCreated {
  readonly ok: true;
  readonly status: "linked";
  readonly link: ExternalIdentityLink;
}

export interface AccountLinkIdempotent {
  readonly ok: true;
  readonly status: "already_linked";
  readonly link: ExternalIdentityLink;
}

export interface ExternalIdentityOwnedByAnotherPlayer {
  readonly ok: false;
  readonly error: {
    readonly code: "external_identity_conflict";
    readonly identity: ExternalIdentity;
    readonly existingPlayerId: PlayerId;
  };
}

export interface ProviderAlreadyLinkedToDifferentSubject {
  readonly ok: false;
  readonly error: {
    readonly code: "provider_link_conflict";
    readonly provider: string;
    readonly existingSubject: string;
  };
}

export type AccountLinkDecision =
  | AccountLinkCreated
  | AccountLinkIdempotent
  | ExternalIdentityOwnedByAnotherPlayer
  | ProviderAlreadyLinkedToDifferentSubject;

function assertIdentity(identity: ExternalIdentity): void {
  if (identity.provider.trim().length === 0) {
    throw new RangeError("external identity provider must not be empty");
  }
  if (identity.subject.trim().length === 0) {
    throw new RangeError("external identity subject must not be empty");
  }
}

export function sameExternalIdentity(
  left: ExternalIdentity,
  right: ExternalIdentity
): boolean {
  return (
    left.provider === right.provider &&
    left.subject === right.subject
  );
}

/**
 * Pure provider-independent account-linking decision.
 *
 * This function never creates a new PlayerId. The current player remains the
 * owner of existing guest gameplay state when a new external identity is linked.
 */
export function decideAccountLink(
  input: AccountLinkInput
): AccountLinkDecision {
  assertIdentity(input.identity);

  if (input.existingIdentityLink !== null) {
    if (input.existingIdentityLink.playerId === input.playerId) {
      return {
        ok: true,
        status: "already_linked",
        link: input.existingIdentityLink
      };
    }

    return {
      ok: false,
      error: {
        code: "external_identity_conflict",
        identity: input.identity,
        existingPlayerId: input.existingIdentityLink.playerId
      }
    };
  }

  const sameProviderLink = input.existingPlayerLinks.find(
    (link) => link.identity.provider === input.identity.provider
  );

  if (sameProviderLink !== undefined) {
    if (sameExternalIdentity(sameProviderLink.identity, input.identity)) {
      return {
        ok: true,
        status: "already_linked",
        link: sameProviderLink
      };
    }

    return {
      ok: false,
      error: {
        code: "provider_link_conflict",
        provider: input.identity.provider,
        existingSubject: sameProviderLink.identity.subject
      }
    };
  }

  return {
    ok: true,
    status: "linked",
    link: {
      playerId: input.playerId,
      identity: input.identity,
      linkedAt: input.linkedAt
    }
  };
}

export interface ExternalIdentityLinkRepository {
  findByIdentity(
    identity: ExternalIdentity
  ): Promise<ExternalIdentityLink | null>;
  listByPlayerId(
    playerId: PlayerId
  ): Promise<readonly ExternalIdentityLink[]>;
  insert(link: ExternalIdentityLink): Promise<void>;
}
