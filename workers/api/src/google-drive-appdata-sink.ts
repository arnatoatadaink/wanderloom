import {
  serializeArchiveExport,
  type ArchiveExportDeliveryResult,
  type ArchiveExportEnvelope,
  type ArchiveExportSink
} from "@wanderloom/game-core";

export interface GoogleDriveAppDataSinkOptions {
  readonly accessToken: string;
  readonly fetch?: typeof fetch;
}

interface DriveFileListResponse {
  readonly files?: readonly {
    readonly id?: string;
  }[];
}

interface DriveFileCreateResponse {
  readonly id?: string;
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export class GoogleDriveAppDataSink implements ArchiveExportSink {
  private readonly request: typeof fetch;

  constructor(private readonly options: GoogleDriveAppDataSinkOptions) {
    if (options.accessToken.trim().length === 0) {
      throw new RangeError("Google Drive access token must not be empty");
    }
    this.request = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  }

  async deliver(
    envelope: ArchiveExportEnvelope
  ): Promise<ArchiveExportDeliveryResult> {
    const existing = await this.findExisting(envelope.idempotencyKey);
    if (!existing.ok) return existing;
    if (existing.remoteId !== null) {
      return {
        ok: true,
        disposition: "existing",
        remoteId: existing.remoteId
      };
    }

    const created = await this.create(envelope);
    return created;
  }

  private async findExisting(
    idempotencyKey: string
  ): Promise<
    | { readonly ok: true; readonly remoteId: string | null }
    | { readonly ok: false; readonly retryable: boolean; readonly code: string }
  > {
    const q =
      "appProperties has { key='wanderloomArchiveKey' and value='" +
      escapeDriveQueryValue(idempotencyKey) +
      "' }";
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("spaces", "appDataFolder");
    url.searchParams.set("q", q);
    url.searchParams.set("pageSize", "2");
    url.searchParams.set("fields", "files(id)");

    const response = await this.request(url, {
      headers: {
        authorization: `Bearer ${this.options.accessToken}`
      }
    });

    if (!response.ok) {
      return {
        ok: false,
        retryable: retryableStatus(response.status),
        code: `drive_list_http_${response.status}`
      };
    }

    const body = (await response.json()) as DriveFileListResponse;
    const ids = (body.files ?? [])
      .map((file) => file.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    if (ids.length > 1) {
      return {
        ok: false,
        retryable: false,
        code: "drive_duplicate_archive_identity"
      };
    }

    return {
      ok: true,
      remoteId: ids[0] ?? null
    };
  }

  private async create(
    envelope: ArchiveExportEnvelope
  ): Promise<ArchiveExportDeliveryResult> {
    const boundary = "wanderloom_archive_boundary";
    const metadata = {
      name: `${envelope.archiveId}.json`,
      parents: ["appDataFolder"],
      mimeType: "application/json",
      appProperties: {
        wanderloomArchiveKey: envelope.idempotencyKey,
        wanderloomArchiveVersion: String(envelope.exportVersion)
      }
    };
    const body = [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      JSON.stringify(metadata),
      `--${boundary}`,
      "Content-Type: application/json",
      "",
      serializeArchiveExport(envelope),
      `--${boundary}--`,
      ""
    ].join("\r\n");

    const url = new URL(
      "https://www.googleapis.com/upload/drive/v3/files"
    );
    url.searchParams.set("uploadType", "multipart");
    url.searchParams.set("fields", "id");

    const response = await this.request(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.options.accessToken}`,
        "content-type": `multipart/related; boundary=${boundary}`
      },
      body
    });

    if (!response.ok) {
      return {
        ok: false,
        retryable: retryableStatus(response.status),
        code: `drive_create_http_${response.status}`
      };
    }

    const created = (await response.json()) as DriveFileCreateResponse;
    if (!created.id) {
      return {
        ok: false,
        retryable: false,
        code: "drive_create_missing_id"
      };
    }

    return {
      ok: true,
      disposition: "created",
      remoteId: created.id
    };
  }
}
