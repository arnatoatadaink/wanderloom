import type { PersistenceViewState } from "./persistence-state";

export interface PersistenceStatusView {
  readonly googleLabel: string;
  readonly driveLabel: string;
  readonly driveMessage: string | null;
  readonly driveActionLabel: string | null;
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

  const driveActionLabel = (() => {
    switch (state.driveArchive) {
      case "reauthorization_required":
        return "Reconnect Google Drive";
      case "connected":
        return "Sync archive";
      case "temporarily_unavailable":
        return "Retry Drive archive";
      case "not_connected":
        return state.googleAccount === "connected"
          ? "Enable Drive archive"
          : null;
      case "unknown":
        return null;
    }
  })();

  return {
    googleLabel,
    driveLabel,
    driveMessage: state.driveMessage,
    driveActionLabel
  };
}
