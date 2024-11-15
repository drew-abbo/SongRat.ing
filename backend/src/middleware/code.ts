import crypto from "crypto";
import { Request, Response, NextFunction, RequestHandler } from "express";
import Joi from "joi";

/** The characters that are allowed to appear in a generated code. */
export const codeCharacterPool =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** The length of any code. */
export const codeLength = 16;

/**
 * The possible kinds of codes.
 * All kinds must be represented by a single letter (with the exception of
 * `ANY`).
 */
export enum Kind {
  ADMIN = "A",
  PLAYER = "P",
  INVITE = "I",
  ANY = "",
}

/**
 * Generates a code string.
 *
 * @param kind The kind of code to generate.
 * @returns The generated code string.
 *
 * @example
 * // `s` would be something like "PzP4Ajhrp1NTmYs1"
 * const s = generate(Kind.PLAYER);
 */
export function generate(kind: Kind): string {
  const bytes = crypto.randomBytes(codeLength - 1);

  let ret: string = kind;
  for (let i = 0; i < bytes.length; i++) {
    ret += codeCharacterPool[bytes[i] % codeCharacterPool.length];
  }

  return ret;
}

/**
 * Generates a regex to match a kind of code.
 *
 * @param kind The kind of code to match.
 * @returns The generated regex.
 *
 * @example
 * // `r` would be /^$P[a-zA-Z0-9]{15}$/
 * const r = regexForCode(Kind.PLAYER);
 */
export function regexForCode(kind: Kind): RegExp {
  const prefix =
    kind !== Kind.ANY ? (kind as string) : `[${Object.values(Kind).join("")}]`;

  return new RegExp(`^${prefix}[a-zA-Z0-9]{${codeLength - 1}}$`);
}

const memoizationForCreateValidatorMiddleware = new Map<Kind, RequestHandler>();

/**
 * Returns a middleware function that checks whether a request has a valid code
 * parameter. This is a factory function that returns a newly created function.
 * This function is memoized.
 *
 * @example
 * // `v` is now a middleware function that validates a code.
 * // The code needs to be called 'player_code'.
 * // The code needs to start with 'P'.
 * const v = createValidator(Kind.PLAYER);
 */
export function createValidatorMiddleware(kind: Kind): RequestHandler {
  if (memoizationForCreateValidatorMiddleware.has(kind)) {
    return memoizationForCreateValidatorMiddleware.get(kind)!;
  }

  let codeKindName: string;
  switch (kind) {
    case Kind.ADMIN:
      codeKindName = "admin_code";
      break;
    case Kind.PLAYER:
      codeKindName = "player_code";
      break;
    case Kind.INVITE:
      codeKindName = "invite_code";
      break;
    case Kind.ANY:
      codeKindName = "code";
      break;
    default: // compile error if this switch doesn't cover all cases
      const exhaustiveCheck: never = kind;
  }

  // the result function is a closure that captures `codeKindName` and `kind`
  const ret = (req: Request, res: Response, next: NextFunction) => {
    const codeSchema = Joi.string().pattern(regexForCode(kind)).required();

    const { error, value } = codeSchema.validate(req.params[codeKindName]);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    next();
  };

  memoizationForCreateValidatorMiddleware.set(kind, ret);
  return ret;
}
