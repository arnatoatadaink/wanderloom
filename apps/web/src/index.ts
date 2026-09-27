import "./styles.css";

import { BestEffortArchiveApiClient } from "./best-effort-archive-api-client";
import { WanderloomApp } from "./app";
import { BrowserGoogleIdentityBridge } from "./google-identity";

export const WEB_WORKSPACE_READY = true;

if (typeof document !== "undefined") {
  const root = document.querySelector<HTMLElement>("#app");

  if (root !== null) {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || null;
    const app = new WanderloomApp(
      root,
      new BestEffortArchiveApiClient(),
      localStorage,
      Date.now,
      new BrowserGoogleIdentityBridge(googleClientId)
    );
    void app.start();
  }
}
