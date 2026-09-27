import type { PersistenceViewState } from "./persistence-state";

export interface PersistenceStatusView {
  readonly googleLabel: string;
  readonly driveLabel: string;
  readonly driveMessage: string | null;
}

export function toPersistenceStatusView(
  state: PersistenceViewState
): PersistenceStatusView {
  const googleLabel =
    state.googleAccount === "connected"
      ? "Connected"
      : state.googleAccount === "guest"
        ? "Guest"
        : "Unknown";

  const driveLabel = (() => {
    switch (state.driveArchive) {
      case "connected":
        return "Connected";
      case "not_connected":
        return "Not connected";
      case "reauthorization_required":
        return "Reconnect required";
      case "temporarily_unavailable":
        return "Temporarily unavailable";
      case "unknown":
        return "Unknown";
    }
  })();

  return {
    googleLabel,
    driveLabel,
    driveMessage: state.driveMessage
  };
}
