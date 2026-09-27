import { GoogleOAuthExchangeError } from "./google-oauth";

export type GoogleOAuthFailureClassification =
  | {
      readonly kind: "reauthorization_required";
      readonly retryable: false;
      readonly code: "invalid_grant";
    }
  | {
      readonly kind: "provider_retryable";
      readonly retryable: true;
      readonly code: string;
    }
  | {
      readonly kind: "provider_non_retryable";
      readonly retryable: false;
      readonly code: string;
    };

export function classifyGoogleOAuthFailure(
  error: unknown
): GoogleOAuthFailureClassification {
  if (!(error instanceof GoogleOAuthExchangeError)) {
    return {
      kind: "provider_retryable",
      retryable: true,
      code: "google_oauth_network_or_unknown"
    };
  }

  if (error.providerError === "invalid_grant") {
    return {
      kind: "reauthorization_required",
      retryable: false,
      code: "invalid_grant"
    };
  }

  if (
    error.httpStatus === 408 ||
    error.httpStatus === 429 ||
    (error.httpStatus !== null && error.httpStatus >= 500)
  ) {
    return {
      kind: "provider_retryable",
      retryable: true,
      code: error.code
    };
  }

  return {
    kind: "provider_non_retryable",
    retryable: false,
    code: error.code
  };
}
