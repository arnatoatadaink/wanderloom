import { describe, expect, it } from "vitest";
import { GoogleOAuthClient, GoogleOAuthExchangeError } from "./google-oauth";

describe("GoogleOAuthClient", () => {
  it("exchanges an authorization code with the exact redirect origin", async () => {
    let observedBody = "";
    const client = new GoogleOAuthClient(async (_input, init) => {
      observedBody = String(init?.body ?? "");
      return Response.json({
        access_token: "access-1",
        refresh_token: "refresh-1",
        id_token: "id-1",
        scope: "openid https://www.googleapis.com/auth/drive.appdata",
        expires_in: 3600
      });
    });

    await expect(client.exchangeCode({
      code: "code-1",
      clientId: "client-1",
      clientSecret: "secret-1",
      redirectUri: "http://localhost:5173"
    })).resolves.toEqual({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      idToken: "id-1",
      scope: "openid https://www.googleapis.com/auth/drive.appdata",
      expiresIn: 3600
    });

    expect(observedBody).toContain("grant_type=authorization_code");
    expect(observedBody).toContain("redirect_uri=http%3A%2F%2Flocalhost%3A5173");
  });

  it("refreshes an access token without requiring a new refresh token", async () => {
    const client = new GoogleOAuthClient(async () =>
      Response.json({
        access_token: "access-2",
        scope: "https://www.googleapis.com/auth/drive.appdata",
        expires_in: 3600
      })
    );

    await expect(client.refreshAccessToken({
      refreshToken: "refresh-1",
      clientId: "client-1",
      clientSecret: "secret-1"
    })).resolves.toEqual({
      accessToken: "access-2",
      refreshToken: null,
      idToken: null,
      scope: "https://www.googleapis.com/auth/drive.appdata",
      expiresIn: 3600
    });
  });

  it("maps non-success token responses to a stable exchange error", async () => {
    const client = new GoogleOAuthClient(async () =>
      new Response("", { status: 400 })
    );

    await expect(client.exchangeCode({
      code: "bad-code",
      clientId: "client-1",
      clientSecret: "secret-1",
      redirectUri: "http://localhost:5173"
    })).rejects.toEqual(
      expect.objectContaining({
        code: "google_token_http_400"
      } satisfies Partial<GoogleOAuthExchangeError>)
    );
  });
});
