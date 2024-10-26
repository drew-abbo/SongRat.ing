import { Request, Response, NextFunction } from "express";
import Joi from "joi";

/** Joi schemas for every endpoint. */
export const schemas: { [key: string]: Joi.Schema } = Object.freeze({
  "/game/new": Joi.object({
    game_name: Joi.string().min(1).max(255).required(),
    game_description: Joi.string().allow("").required(),
    min_songs_per_playlist: Joi.number().integer().min(1).max(100).default(1),
    max_songs_per_playlist: Joi.number().integer().min(1).max(100).default(100),
    require_playlist_link: Joi.boolean().required(),
  }).custom((value, helpers) => {
    if (value.min_songs_per_playlist > value.max_songs_per_playlist) {
      return helpers.message({
        custom:
          '"min_songs_per_playlist" must be less than or equal to "max_songs_per_playlist"',
      });
    }
    return value;
  }),

  // TODO: add the rest of the schemas
});

/**
 * Ensures the JSON body for a request follows the schema set up for it (defined
 * above in `schemas`). If a route path doesn't have a schema it isn't checked.
 *
 * If the body is invalid a 400 status is returned. The body may be updated
 * (e.g. default values filled in).
 */
export function validateBodyOnSchemaMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const schema: Joi.Schema | undefined = schemas[req.route.path];
  if (!schema) {
    next();
    return;
  }

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details });
  }

  req.body = value;
  next();
}
