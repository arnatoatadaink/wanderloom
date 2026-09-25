function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export interface EncryptedSecret {
  readonly ciphertext: string;
  readonly iv: string;
}

export class AesGcmSecretCipher {
  private keyPromise: Promise<CryptoKey> | null = null;

  constructor(private readonly base64Key: string) {
    if (base64Key.trim().length === 0) {
      throw new RangeError("archive token encryption key must not be empty");
    }
  }

  async encrypt(plaintext: string): Promise<EncryptedSecret> {
    if (plaintext.length === 0) {
      throw new RangeError("secret plaintext must not be empty");
    }

    const key = await this.getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(encoded)
    );

    return {
      ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
      iv: bytesToBase64(iv)
    };
  }

  async decrypt(secret: EncryptedSecret): Promise<string> {
    const key = await this.getKey();
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(base64ToBytes(secret.iv))
      },
      key,
      toArrayBuffer(base64ToBytes(secret.ciphertext))
    );
    return new TextDecoder().decode(plaintext);
  }

  private async getKey(): Promise<CryptoKey> {
    if (this.keyPromise === null) {
      const raw = base64ToBytes(this.base64Key);
      if (raw.byteLength !== 32) {
        throw new RangeError(
          "archive token encryption key must decode to exactly 32 bytes"
        );
      }
      this.keyPromise = crypto.subtle.importKey(
        "raw",
        toArrayBuffer(raw),
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
      );
    }
    return this.keyPromise;
  }
}
