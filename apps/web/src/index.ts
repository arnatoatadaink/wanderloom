import "./styles.css";

import { WanderloomApiClient } from "./api-client";
import { WanderloomApp } from "./app";

export const WEB_WORKSPACE_READY = true;

const root = document.querySelector<HTMLElement>("#app");

if (root !== null) {
  const app = new WanderloomApp(root, new WanderloomApiClient());
  void app.start();
}
