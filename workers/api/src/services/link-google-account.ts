import {
  decideAccountLink,
  type ExternalIdentityLinkRepository,
  type PlayerId
} from "@wanderloom/game-core";
import type { GoogleIdTokenVerifier } from "../google-oidc";

export interface GoogleAccountLinkResult {
  readonly status: "linked" | "already_linked";
  readonly provider: "google";
  readonly subject: string;
}

export interface GoogleAccountLinkConflict {
  readonly code:
    | "external_identity_conflict"
    | "provider_link_conflict";
  readonly details: Readonly<Record<string, unknown>>;
}

function conflictResult(
  decision: ReturnType<typeof decideAccountLink>
): GoogleAccountLinkResult | GoogleAccountLinkConflict {
  if (!decision.ok) {
    if (decision.error.code === "external_identity_conflict") {
      return {
        code: decision.error.code,
        details: {
          provider: decision.error.identity.provider,
          subject: decision.error.identity.subject,
          existingPlayerId: decision.error.existingPlayerId
        }
      };
    }

    return {
      code: decision.error.code,
      details: {
        provider: decision.error.provider,
        existingSubject: decision.error.existingSubject
      }
    };
  }

  return {
    status: decision.status,
    provider: "google",
    subject: decision.link.identity.subject
  };
}

export async function linkGoogleAccount(input: {
  readonly playerId: PlayerId;
  readonly credential: string;
  readonly clientId: string;
  readonly linkedAt: string;
  readonly verifier: GoogleIdTokenVerifier;
  readonly repository: ExternalIdentityLinkRepository;
}): Promise<GoogleAccountLinkResult | GoogleAccountLinkConflict> {
  const verified = await input.verifier.verify(
    input.credential,
    input.clientId
  );
  const identity = {
    provider: "google",
    subject: verified.subject
  } as const;

  const [existingIdentityLink, existingPlayerLinks] = await Promise.all([
    input.repository.findByIdentity(identity),
    input.repository.listByPlayerId(input.playerId)
  ]);

  const decision = decideAccountLink({
    playerId: input.playerId,
    identity,
    linkedAt: input.linkedAt,
    existingIdentityLink,
    existingPlayerLinks
  });

  if (!decision.ok || decision.status === "already_linked") {
    return conflictResult(decision);
  }

  try {
    await input.repository.insert(decision.link);
    return conflictResult(decision);
  } catch (insertError) {
    // Another request may have won the UNIQUE(provider, subject) or
    // UNIQUE(player_id, provider) race after the reads above. Re-read the
    // authoritative rows and translate that race into the stable domain
    // result instead of leaking a storage exception as HTTP 500.
    const [racedIdentityLink, racedPlayerLinks] = await Promise.all([
      input.repository.findByIdentity(identity),
      input.repository.listByPlayerId(input.playerId)
    ]);

    const racedDecision = decideAccountLink({
      playerId: input.playerId,
      identity,
      linkedAt: input.linkedAt,
      existingIdentityLink: racedIdentityLink,
      existingPlayerLinks: racedPlayerLinks
    });

    if (
      racedIdentityLink !== null ||
      racedPlayerLinks.some(
        (link) => link.identity.provider === identity.provider
      )
    ) {
      return conflictResult(racedDecision);
    }

    throw insertError;
  }
}
