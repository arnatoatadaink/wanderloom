export interface GoogleCredentialResponse {
  readonly credential: string;
}

interface GoogleAccountsIdApi {
  initialize(config: {
    readonly client_id: string;
    readonly callback: (response: GoogleCredentialResponse) => void;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      readonly type?: "standard" | "icon";
      readonly theme?: "outline" | "filled_blue" | "filled_black";
      readonly size?: "large" | "medium" | "small";
      readonly text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      readonly shape?: "rectangular" | "pill" | "circle" | "square";
      readonly width?: number;
    }
  ): void;
}

interface GoogleCodeResponse {
  readonly code?: string;
  readonly error?: string;
}

interface GoogleCodeClient {
  requestCode(): void;
}

interface GoogleAccountsOAuth2Api {
  initCodeClient(config: {
    readonly client_id: string;
    readonly scope: string;
    readonly ux_mode: "popup";
    readonly callback: (response: GoogleCodeResponse) => void;
    readonly error_callback?: (error: { readonly type?: string }) => void;
  }): GoogleCodeClient;
}

interface GoogleAccountsApi {
  readonly id: GoogleAccountsIdApi;
  readonly oauth2: GoogleAccountsOAuth2Api;
}

interface GoogleApi {
  readonly accounts: GoogleAccountsApi;
}

declare global {
  interface Window {
    google?: GoogleApi;
  }
}

const SCRIPT_ID = "wanderloom-google-identity-services";
const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

export interface GoogleIdentityBridge {
  readonly enabled: boolean;
  render(
    container: HTMLElement,
    mode: "link" | "restore",
    onCredential: (credential: string) => void
  ): Promise<void>;
  requestDriveAuthorization(): Promise<string>;
}

export class BrowserGoogleIdentityBridge implements GoogleIdentityBridge {
  readonly enabled: boolean;

  constructor(private readonly clientId: string | null) {
    this.enabled = clientId !== null && clientId.trim().length > 0;
  }

  async render(
    container: HTMLElement,
    mode: "link" | "restore",
    onCredential: (credential: string) => void
  ): Promise<void> {
    if (!this.enabled || this.clientId === null) {
      return;
    }

    await loadGoogleIdentityScript();
    const google = window.google;
    if (!google) {
      throw new Error("Google Identity Services failed to initialize");
    }

    container.replaceChildren();
    google.accounts.id.initialize({
      client_id: this.clientId,
      callback: (response) => onCredential(response.credential)
    });
    google.accounts.id.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: mode === "restore" ? "signin_with" : "continue_with",
      shape: "rectangular",
      width: Math.min(360, Math.max(240, container.clientWidth || 320))
    });

  async requestDriveAuthorization(): Promise<string> {
    if (!this.enabled || this.clientId === null) {
      throw new Error("Google Identity Services is not configured");
    }

    await loadGoogleIdentityScript();
    const google = window.google;
    if (!google) {
      throw new Error("Google Identity Services failed to initialize");
    }

    return new Promise<string>((resolve, reject) => {
      const client = google.accounts.oauth2.initCodeClient({
        client_id: this.clientId as string,
        scope:
          "openid https://www.googleapis.com/auth/drive.appdata",
        ux_mode: "popup",
        callback: (response) => {
          if (response.error) {
            reject(new Error(`Google Drive authorization failed: ${response.error}`));
            return;
          }
          if (!response.code) {
            reject(new Error("Google Drive authorization returned no code"));
            return;
          }
          resolve(response.code);
        },
        error_callback: (error) => {
          reject(
            new Error(
              `Google Drive authorization popup failed: ${error.type ?? "unknown"}`
            )
          );
        }
      });
      client.requestCode();
    });
  }

  }
}

let scriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  if (window.google) {
    return Promise.resolve();
  }
  if (scriptPromise !== null) {
    return scriptPromise;
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google Identity Services")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Failed to load Google Identity Services")),
      { once: true }
    );
    document.head.append(script);
  });

  return scriptPromise;
}
