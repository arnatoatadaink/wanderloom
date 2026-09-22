import {
  ApiError,
  WanderloomApiClient,
  type ClaimResultDto,
  type ZoneDto
} from "./api-client";
import {
  chooseInitialSelection,
  deriveExplorationPhase,
  initialViewModel,
  remainingSeconds,
  type AppViewModel
} from "./view-model";

const PLAYER_STORAGE_KEY = "wanderloom.playerId";

export class WanderloomApp {
  private state: AppViewModel = initialViewModel();
  private timer: number | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly api: WanderloomApiClient,
    private readonly storage: Storage = localStorage,
    private readonly now: () => number = Date.now
  ) {}

  async start(): Promise<void> {
    this.render();

    try {
      const storedPlayerId = this.storage.getItem(PLAYER_STORAGE_KEY);
      if (storedPlayerId === null) {
        const guest = await this.api.bootstrapGuest();
        this.storage.setItem(PLAYER_STORAGE_KEY, guest.playerId);
      } else {
        this.api.setPlayerId(storedPlayerId);
      }

      const [zones, core, inventory, exploration] = await Promise.all([
        this.api.getZones(),
        this.api.getState(),
        this.api.getInventory(),
        this.api.getCurrentExploration()
      ]);
      const selection = chooseInitialSelection(zones);

      this.state = {
        ...this.state,
        phase: deriveExplorationPhase(exploration, this.now()),
        zones,
        selectedZoneId: exploration?.zoneId ?? selection.zoneId,
        selectedDurationId:
          exploration?.durationId ?? selection.durationId,
        core,
        inventory,
        exploration,
        result: null,
        errorMessage: null
      };
      this.ensureTimer();
      this.render();
    } catch (error) {
      this.fail(error);
    }
  }

  destroy(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private ensureTimer(): void {
    if (this.timer !== null) {
      return;
    }

    this.timer = window.setInterval(() => {
      if (this.state.exploration === null) {
        return;
      }

      const phase = deriveExplorationPhase(
        this.state.exploration,
        this.now()
      );
      if (phase !== this.state.phase) {
        this.state = {
          ...this.state,
          phase
        };
      }
      this.render();
    }, 1000);
  }

  private async startExploration(): Promise<void> {
    const zoneId = this.state.selectedZoneId;
    const durationId = this.state.selectedDurationId;
    if (zoneId === null || durationId === null) {
      return;
    }

    this.state = { ...this.state, busy: true, errorMessage: null };
    this.render();

    try {
      const core = await this.api.startExploration(zoneId, durationId);
      this.state = {
        ...this.state,
        busy: false,
        core,
        exploration: core.activeExploration,
        phase: deriveExplorationPhase(
          core.activeExploration,
          this.now()
        ),
        result: null
      };
      this.ensureTimer();
      this.render();
    } catch (error) {
      this.fail(error);
    }
  }

  private async claim(): Promise<void> {
    const exploration = this.state.exploration;
    if (exploration === null) {
      return;
    }

    this.state = { ...this.state, busy: true, errorMessage: null };
    this.render();

    try {
      const result = await this.api.claimExploration(
        exploration.explorationId
      );
      this.state = {
        ...this.state,
        busy: false,
        phase: "result",
        core: result.core,
        inventory: result.inventory,
        exploration: null,
        result,
        errorMessage: null
      };
      this.render();
    } catch (error) {
      this.fail(error);
    }
  }

  private async equip(itemInstanceId: string): Promise<void> {
    const inventory = this.state.inventory;
    if (inventory === null) {
      return;
    }

    this.state = { ...this.state, busy: true, errorMessage: null };
    this.render();

    try {
      const nextInventory = await this.api.equipItem(
        "charm",
        itemInstanceId,
        inventory.stateVersion
      );
      this.state = {
        ...this.state,
        busy: false,
        inventory: nextInventory,
        errorMessage: null
      };
      this.render();
    } catch (error) {
      this.fail(error);
    }
  }

  private resetToReady(): void {
    this.state = {
      ...this.state,
      phase: "ready",
      result: null,
      exploration: null,
      errorMessage: null
    };
    this.render();
  }

  private fail(error: unknown): void {
    const message =
      error instanceof ApiError
        ? `${error.code} (HTTP ${error.status})`
        : error instanceof Error
          ? error.message
          : "Unknown error";

    this.state = {
      ...this.state,
      busy: false,
      phase: "error",
      errorMessage: message
    };
    this.render();
  }

  private render(): void {
    const { phase, core, exploration, result } = this.state;
    this.root.innerHTML = `
      <main class="app-shell">
        <header class="topbar">
          <div>
            <p class="eyebrow">WANDERLOOM</p>
            <h1>Expedition</h1>
          </div>
          ${core ? `
            <div class="compact-stats" aria-label="Player metrics">
              <span>Lv ${core.progression.level}</span>
              <span>${core.progression.gold} G</span>
              <span>${core.progression.exp} XP</span>
            </div>
          ` : ""}
        </header>

        <section class="panel" aria-live="polite">
          ${phase === "booting" ? this.renderBooting() : ""}
          ${phase === "ready" ? this.renderReady() : ""}
          ${phase === "exploring" || phase === "claimable"
            ? this.renderExploration()
            : ""}
          ${phase === "result" && result
            ? this.renderResult(result)
            : ""}
          ${phase === "error" ? this.renderError() : ""}
        </section>

        ${exploration ? `
          <footer class="status-strip">
            <span>Run ${escapeHtml(exploration.explorationId.slice(0, 8))}</span>
            <span>${phase === "claimable" ? "Ready to claim" : "Exploring"}</span>
          </footer>
        ` : ""}
      </main>
    `;

    this.bindEvents();
  }

  private renderBooting(): string {
    return `
      <div class="center-state">
        <div class="spinner" aria-hidden="true"></div>
        <p>Preparing your route…</p>
      </div>
    `;
  }

  private renderReady(): string {
    const zone = this.selectedZone();
    const duration = zone?.durations.find(
      (entry) => entry.durationId === this.state.selectedDurationId
    );

    return `
      <div class="section-heading">
        <p class="eyebrow">CHOOSE A ROUTE</p>
        <h2>Where next?</h2>
      </div>

      <div class="destination-list">
        ${this.state.zones.map((entry) => `
          <button
            class="destination-card ${entry.zoneId === this.state.selectedZoneId ? "selected" : ""}"
            data-zone-id="${escapeHtml(entry.zoneId)}"
            type="button"
          >
            <span class="destination-mark">◇</span>
            <span>
              <strong>${escapeHtml(entry.name)}</strong>
              <small>${escapeHtml(entry.zoneId)}</small>
            </span>
          </button>
        `).join("")}
      </div>

      <div class="subpanel">
        <label class="field-label" for="duration">Duration</label>
        <select id="duration" class="duration-select">
          ${zone?.durations.map((entry) => `
            <option value="${escapeHtml(entry.durationId)}"
              ${entry.durationId === this.state.selectedDurationId ? "selected" : ""}>
              ${formatDuration(entry.durationMs)}
            </option>
          `).join("") ?? ""}
        </select>
      </div>

      <div class="metrics-grid">
        <div><span>Gold</span><strong>${duration ? formatRange(duration.preview.gold.min, duration.preview.gold.max) : "—"}</strong></div>
        <div><span>EXP</span><strong>${duration ? formatRange(duration.preview.exp.min, duration.preview.exp.max) : "—"}</strong></div>
        <div><span>Drops</span><strong>${duration ? formatRange(duration.preview.drops.minItems, duration.preview.drops.maxItems) : "—"}</strong></div>
      </div>

      ${this.renderInventory()}

      <button
        id="start-expedition"
        class="primary-action"
        type="button"
        ${this.state.busy || !duration ? "disabled" : ""}
      >
        ${this.state.busy ? "Starting…" : "Start expedition"}
      </button>
    `;
  }

  private renderExploration(): string {
    const exploration = this.state.exploration;
    if (exploration === null) {
      return "";
    }

    const remaining = remainingSeconds(exploration.endsAt, this.now());
    const claimable = remaining === 0;

    return `
      <div class="section-heading">
        <p class="eyebrow">${claimable ? "EXPEDITION COMPLETE" : "IN PROGRESS"}</p>
        <h2>${claimable ? "Rewards are ready" : "Out in the wild"}</h2>
      </div>

      <div class="journey-card">
        <div class="journey-icon">⌁</div>
        <div>
          <span class="muted">Destination</span>
          <strong>${escapeHtml(exploration.zoneId)}</strong>
        </div>
        <div class="countdown">
          <span class="muted">Remaining</span>
          <strong>${formatCountdown(remaining)}</strong>
        </div>
      </div>

      <div class="progress-track" aria-hidden="true">
        <div class="progress-fill ${claimable ? "complete" : ""}"></div>
      </div>

      <p class="hint">
        The server owns the end time and result. You can leave this screen and return later.
      </p>

      <button
        id="claim-expedition"
        class="primary-action"
        type="button"
        ${!claimable || this.state.busy ? "disabled" : ""}
      >
        ${this.state.busy ? "Claiming…" : claimable ? "Claim rewards" : "Still exploring"}
      </button>
    `;
  }

  private renderResult(result: ClaimResultDto): string {
    return `
      <div class="section-heading">
        <p class="eyebrow">EXPEDITION RESULT</p>
        <h2>${escapeHtml(result.archiveEntry.result)}</h2>
      </div>

      <div class="reward-grid">
        <div class="reward-card">
          <span>Gold</span>
          <strong>+${result.archiveEntry.rewards.gold}</strong>
        </div>
        <div class="reward-card">
          <span>EXP</span>
          <strong>+${result.archiveEntry.rewards.exp}</strong>
        </div>
        <div class="reward-card">
          <span>Drops</span>
          <strong>${result.archiveEntry.rewards.drops.length}</strong>
        </div>
      </div>

      ${this.renderInventory()}

      <p class="hint">
        This result currently uses the provisional M1 smoke rules.
      </p>

      <button id="explore-again" class="primary-action" type="button">
        Explore again
      </button>
    `;
  }

  private renderInventory(): string {
    const inventory = this.state.inventory;
    if (inventory === null) {
      return "";
    }

    const equipped = inventory.equipment.slots.charm ?? null;
    if (inventory.items.length === 0) {
      return `
        <div class="inventory-panel">
          <div class="inventory-heading">
            <span>Inventory</span>
            <strong>Charm</strong>
          </div>
          <p class="hint">No items yet.</p>
        </div>
      `;
    }

    return `
      <div class="inventory-panel">
        <div class="inventory-heading">
          <span>Inventory</span>
          <strong>Charm slot</strong>
        </div>
        <div class="inventory-list">
          ${inventory.items.map((item) => {
            const isEquipped = equipped === item.itemInstanceId;
            return `
              <div class="inventory-item">
                <div>
                  <strong>${escapeHtml(item.itemDefinitionId)}</strong>
                  <small>${escapeHtml(item.itemInstanceId.slice(0, 12))}</small>
                </div>
                <button
                  class="secondary-action inventory-action"
                  type="button"
                  data-equip-item-id="${escapeHtml(item.itemInstanceId)}"
                  ${this.state.busy || isEquipped ? "disabled" : ""}
                >
                  ${isEquipped ? "Equipped" : "Equip"}
                </button>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }
  private renderError(): string {
    return `
      <div class="center-state">
        <p class="eyebrow">CONNECTION / STATE ERROR</p>
        <h2>Could not continue</h2>
        <p class="error-text">${escapeHtml(this.state.errorMessage ?? "Unknown error")}</p>
        <button id="retry-app" class="secondary-action" type="button">
          Retry
        </button>
      </div>
    `;
  }

  private bindEvents(): void {
    this.root.querySelectorAll<HTMLElement>("[data-zone-id]").forEach(
      (element) => {
        element.addEventListener("click", () => {
          const zoneId = element.dataset.zoneId ?? null;
          const zone = this.state.zones.find(
            (entry) => entry.zoneId === zoneId
          );
          this.state = {
            ...this.state,
            selectedZoneId: zoneId,
            selectedDurationId: zone?.durations[0]?.durationId ?? null
          };
          this.render();
        });
      }
    );

    this.root
      .querySelector<HTMLSelectElement>("#duration")
      ?.addEventListener("change", (event) => {
        this.state = {
          ...this.state,
          selectedDurationId: (event.currentTarget as HTMLSelectElement).value
        };
      });

    this.root
      .querySelector("#start-expedition")
      ?.addEventListener("click", () => void this.startExploration());

    this.root
      .querySelector("#claim-expedition")
      ?.addEventListener("click", () => void this.claim());

    this.root.querySelectorAll<HTMLElement>("[data-equip-item-id]").forEach(
      (element) => {
        element.addEventListener("click", () => {
          const itemInstanceId = element.dataset.equipItemId;
          if (itemInstanceId) {
            void this.equip(itemInstanceId);
          }
        });
      }
    );

    this.root
      .querySelector("#explore-again")
      ?.addEventListener("click", () => this.resetToReady());

    this.root
      .querySelector("#retry-app")
      ?.addEventListener("click", () => void this.start());
  }

  private selectedZone(): ZoneDto | undefined {
    return this.state.zones.find(
      (entry) => entry.zoneId === this.state.selectedZoneId
    );
  }
}

function formatDuration(durationMs: number): string {
  const minutes = Math.round(durationMs / 60_000);
  return `${minutes} min`;
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatRange(min: number, max: number): string {
  return min === max ? String(min) : `${min}–${max}`;
}
