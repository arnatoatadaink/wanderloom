import { describe, expect, it } from "vitest";
import { AesGcmSecretCipher } from "./secret-cipher";

function base64Key(): string {
  const bytes = new Uint8Array(32);
  bytes.fill(7);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

describe("AesGcmSecretCipher", () => {
  it("round-trips a refresh token without storing plaintext", async () => {
    const cipher = new AesGcmSecretCipher(base64Key());
    const encrypted = await cipher.encrypt("refresh-token-secret");

    expect(encrypted.ciphertext).not.toContain("refresh-token-secret");
    expect(encrypted.iv.length).toBeGreaterThan(0);
    await expect(cipher.decrypt(encrypted)).resolves.toBe(
      "refresh-token-secret"
    );
  });

  it("uses a fresh IV for repeated encryption", async () => {
    const cipher = new AesGcmSecretCipher(base64Key());
    const first = await cipher.encrypt("same-token");
    const second = await cipher.encrypt("same-token");

    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it("rejects keys that are not exactly 256 bits", async () => {
    const cipher = new AesGcmSecretCipher(btoa("too-short"));

    await expect(cipher.encrypt("secret")).rejects.toThrow(RangeError);
  });
});
