import { describe, expect, it } from "vitest";
import {
  decideAccountLink,
  sameExternalIdentity,
  type ExternalIdentityLink,
  type PlayerId
} from "./index";

describe("CP-30 guest to linked account domain", () => {
  const playerId = "player-guest" as PlayerId;
  const otherPlayerId = "player-other" as PlayerId;
  const identity = {
    provider: "google",
    subject: "google-sub-123"
  } as const;
  const linkedAt = "2026-09-24T12:30:00.000Z";

  it("links a new external identity without replacing the guest player", () => {
    const result = decideAccountLink({
      playerId,
      identity,
      linkedAt,
      existingIdentityLink: null,
      existingPlayerLinks: []
    });

    expect(result).toEqual({
      ok: true,
      status: "linked",
      link: {
        playerId,
        identity,
        linkedAt
      }
    });
  });

  it("treats an already linked identity on the same player as idempotent", () => {
    const existing: ExternalIdentityLink = {
      playerId,
      identity,
      linkedAt: "2026-09-24T12:00:00.000Z"
    };

    const result = decideAccountLink({
      playerId,
      identity,
      linkedAt,
      existingIdentityLink: existing,
      existingPlayerLinks: [existing]
    });

    expect(result).toEqual({
      ok: true,
      status: "already_linked",
      link: existing
    });
  });

  it("rejects an identity already owned by another player", () => {
    const result = decideAccountLink({
      playerId,
      identity,
      linkedAt,
      existingIdentityLink: {
        playerId: otherPlayerId,
        identity,
        linkedAt: "2026-09-24T11:00:00.000Z"
      },
      existingPlayerLinks: []
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "external_identity_conflict",
        identity,
        existingPlayerId: otherPlayerId
      }
    });
  });

  it("rejects linking another subject from the same provider to one player", () => {
    const existing: ExternalIdentityLink = {
      playerId,
      identity: {
        provider: "google",
        subject: "google-sub-existing"
      },
      linkedAt: "2026-09-24T11:00:00.000Z"
    };

    const result = decideAccountLink({
      playerId,
      identity,
      linkedAt,
      existingIdentityLink: null,
      existingPlayerLinks: [existing]
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "provider_link_conflict",
        provider: "google",
        existingSubject: "google-sub-existing"
      }
    });
  });

  it("compares identity by provider namespace and stable subject", () => {
    expect(sameExternalIdentity(identity, { ...identity })).toBe(true);
    expect(
      sameExternalIdentity(identity, {
        provider: "google",
        subject: "another-subject"
      })
    ).toBe(false);
    expect(
      sameExternalIdentity(identity, {
        provider: "another-provider",
        subject: identity.subject
      })
    ).toBe(false);
  });

  it("rejects blank provider or subject identifiers", () => {
    expect(() =>
      decideAccountLink({
        playerId,
        identity: { provider: "", subject: identity.subject },
        linkedAt,
        existingIdentityLink: null,
        existingPlayerLinks: []
      })
    ).toThrow(RangeError);

    expect(() =>
      decideAccountLink({
        playerId,
        identity: { provider: "google", subject: " " },
        linkedAt,
        existingIdentityLink: null,
        existingPlayerLinks: []
      })
    ).toThrow(RangeError);
  });
});
