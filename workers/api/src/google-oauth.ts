export interface GoogleOAuthTokenSet {
  readonly accessToken: string;
  readonly refreshToken: string | null;
  readonly idToken: string | null;
  readonly scope: string;
  readonly expiresIn: number;
}

interface GoogleTokenResponse {
  readonly access_token?: string;
  readonly refresh_token?: string;
  readonly id_token?: string;
  readonly scope?: string;
  readonly expires_in?: number;
}

export class GoogleOAuthExchangeError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

export class GoogleOAuthClient {
  constructor(private readonly request: typeof fetch = (input, init) =>
    globalThis.fetch(input, init)) {}

  async exchangeCode(input: {
    readonly code: string;
    readonly clientId: string;
    readonly clientSecret: string;
    readonly redirectUri: string;
  }): Promise<GoogleOAuthTokenSet> {
    return this.tokenRequest(new URLSearchParams({
      code: input.code,
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code"
    }));
  }

  async refreshAccessToken(input: {
    readonly refreshToken: string;
    readonly clientId: string;
    readonly clientSecret: string;
  }): Promise<GoogleOAuthTokenSet> {
    return this.tokenRequest(new URLSearchParams({
      refresh_token: input.refreshToken,
      client_id: input.clientId,
      client_secret: input.clientSecret,
      grant_type: "refresh_token"
    }));
  }

  private async tokenRequest(
    body: URLSearchParams
  ): Promise<GoogleOAuthTokenSet> {
    const response = await this.request(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        },
        body
      }
    );

    if (!response.ok) {
      throw new GoogleOAuthExchangeError(
        `google_token_http_${response.status}`
      );
    }

    const payload = (await response.json()) as GoogleTokenResponse;
    if (
      !payload.access_token ||
      typeof payload.expires_in !== "number"
    ) {
      throw new GoogleOAuthExchangeError(
        "google_token_response_invalid"
      );
    }

    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token ?? null,
      idToken: payload.id_token ?? null,
      scope: payload.scope ?? "",
      expiresIn: payload.expires_in
    };
  }
}
