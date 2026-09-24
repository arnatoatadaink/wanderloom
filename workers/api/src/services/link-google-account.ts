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

  if (!decision.ok) {
    if (decision.error.code === "external_identity_conflict") {
      return {
        code: decision.error.code,
        details: {
          provider: identity.provider,
          subject: identity.subject,
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

  if (decision.status === "linked") {
    await input.repository.insert(decision.link);
  }

  return {
    status: decision.status,
    provider: "google",
    subject: decision.link.identity.subject
  };
}
