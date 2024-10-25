import crypto from "crypto";

// the characters that are allowed to appear in a generated code
const codeCharacterPool =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** The possible kinds of codes that can be generated. */
export enum Kind {
  ADMIN = "M",
  PLAYER = "P",
  INVITE = "I",
}

/**
 * Generates a code string.
 *
 * @param prefix A prefix for the generated code.
 * @param length The length of the generated code (must be a positive integer
 *  greater than the length of `prefix`).
 * @returns The generated code string.
 * @throws If the length is not a positive integer > 1.
 */
export function generate(prefix: Kind, length: number = 16): string {
  if (!Number.isInteger(length) || length <= 1) {
    throw new Error("Generated code length must be an integer > 1.");
  }

  const bytes = crypto.randomBytes(length - 1);

  let ret: string = prefix;
  for (let i = 0; i < bytes.length; i++) {
    ret += codeCharacterPool[bytes[i] % codeCharacterPool.length];
  }

  return ret;
}
