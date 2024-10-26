import crypto from "crypto";
import { Request, Response, NextFunction, RequestHandler } from "express";
import Joi from "joi";

/** The characters that are allowed to appear in a generated code. */
const codeCharacterPool =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** The length of any code. */
const codeLength = 16;

/**
 * The possible kinds of codes.
 * All kinds must be represented by a single letter.
 */
export enum Kind {
  ADMIN = "M",
  PLAYER = "P",
  INVITE = "I",
}

/**
 * Generates a code string.
 *
 * @param kind A prefix for the generated code.
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
 * Returns a middleware function that checks whether a request has a valid code
 * parameter. This is a factory function that returns a newly created function.
 *
 * @example
 * // `v` is now a middleware function that validates a code.
 * // The code needs to be called 'player_code'.
 * // The code needs to start with 'P'.
 * const v = createValidator(Kind.PLAYER);
 */
export function createValidatorMiddleware(kind: Kind): RequestHandler {
  let codeKindName: string;
  switch (kind) {
    case Kind.ADMIN:
      codeKindName = "master_code";
      break;
    case Kind.PLAYER:
      codeKindName = "player_code";
      break;
    case Kind.INVITE:
      codeKindName = "invite_code";
      break;
    default: // compile error if this switch doesn't cover all cases
      const exhaustiveCheck: never = kind;
  }

  // the result function is a closure that captures `codeKindName` and `kind`
  return (req: Request, res: Response, next: NextFunction) => {
    const codeSchema = Joi.string()
      .pattern(new RegExp(`^${kind as string}[a-zA-Z0-9]{${codeLength - 1}}$`))
      .required();

    const { error, value } = codeSchema.validate(req.params[codeKindName]);
    if (error) {
      return res.status(400).json({ message: error.details });
    }

    next();
  };
}
