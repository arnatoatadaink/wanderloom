import { describe, expect, it } from "vitest";
import { GoogleOAuthExchangeError } from "./google-oauth";
import { classifyGoogleOAuthFailure } from "./google-oauth-error-classification";

describe("CP-39 Google OAuth failure classification", () => {
  it("classifies invalid_grant as reauthorization required", () => {
    expect(
      classifyGoogleOAuthFailure(
        new GoogleOAuthExchangeError(
          "google_token_http_400",
          400,
          "invalid_grant"
        )
      )
    ).toEqual({
      kind: "reauthorization_required",
      retryable: false,
      code: "invalid_grant"
    });
  });

  it.each([408, 429, 500, 503])(
    "keeps HTTP %i as retryable provider failure",
    (status) => {
      expect(
        classifyGoogleOAuthFailure(
          new GoogleOAuthExchangeError(
            `google_token_http_${status}`,
            status,
            null
          )
        )
      ).toEqual({
        kind: "provider_retryable",
        retryable: true,
        code: `google_token_http_${status}`
      });
    }
  );

  it("does not turn an ordinary OAuth 400 into a consent loop", () => {
    expect(
      classifyGoogleOAuthFailure(
        new GoogleOAuthExchangeError(
          "google_token_http_400",
          400,
          "invalid_request"
        )
      )
    ).toEqual({
      kind: "provider_non_retryable",
      retryable: false,
      code: "google_token_http_400"
    });
  });

  it("treats unknown/network failures as retryable instead of reauthorization", () => {
    expect(classifyGoogleOAuthFailure(new TypeError("network down"))).toEqual({
      kind: "provider_retryable",
      retryable: true,
      code: "google_oauth_network_or_unknown"
    });
  });
});
