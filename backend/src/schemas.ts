import { Request, Response, NextFunction } from "express";
import Joi from "joi";

import * as code from "./code";

// used to ensure extremely large id numbers aren't passed into the database
const INT_MAX = 2147483647;

/** Joi schemas for every endpoint. */
export const schemas: { [key: string]: Joi.Schema | null } = Object.freeze({
  // /game

  "POST/game/new": Joi.object({
    game_name: Joi.string().min(1).max(255).required(),
    game_description: Joi.string().allow("").default(""),
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

  "GET/game/peek/:invite_code": null,

  "POST/game/join/:invite_code": Joi.object({
    player_name: Joi.string().min(1).max(255).required(),
    playlist_link: Joi.string().min(1).max(255).allow(null).default(null),
    songs: Joi.array()
      .items(
        Joi.object({
          title: Joi.string().min(1).max(255).required(),
          artist: Joi.string().min(1).max(255).required(),
        })
      )
      .min(1)
      .max(100)
      .required(),
  }),

  // /admin

  "GET/admin/review/:master_code": null,

  "POST/admin/begin/:master_code": null,

  "POST/admin/end/:master_code": null,

  "POST/admin/remove_player/:master_code": Joi.object({
    player_code: Joi.string()
      .pattern(code.regexForCode(code.Kind.PLAYER))
      .required(),
  }),

  // /player

  "GET/player/review/:player_code": null,

  "POST/player/add_song/:player_code": Joi.object({
    song_to_add: Joi.object({
      title: Joi.string().min(1).max(255).required(),
      artist: Joi.string().min(1).max(255).required(),
    }).required(),
  }),

  "POST/player/remove_song/:player_code": Joi.object({
    song_id_to_remove: Joi.number().integer().min(1).max(INT_MAX).required(),
  }),

  "POST/player/replace_song/:player_code": Joi.object({
    song_id_to_remove: Joi.number().integer().min(1).max(INT_MAX).required(),
    song_to_add: Joi.object({
      title: Joi.string().min(1).max(255).required(),
      artist: Joi.string().min(1).max(255).required(),
    }).required(),
  }),

  "POST/player/change_playlist_link/:player_code": Joi.object({
    playlist_link: Joi.string().min(1).max(255).allow(null).required(),
  }),

  "POST/player/rate_song/:player_code": Joi.object({
    song_id: Joi.number().integer().min(1).max(INT_MAX).required(),
    rating: Joi.number().min(0.0).max(10.0).required(),
  }),
});

/**
 * Ensures the JSON body for a request follows the schema set up for it (defined
 * above in `schemas`). If a route path doesn't have a schema it isn't checked.
 *
 * If the body is invalid a 400 status is returned. The body may be updated
 * (e.g. default values filled in).
 *
 * > WARNING:
 * > You cannot use this middleware with `app.use()` because it requires
 * > routes to be pre-defined. Apply this middleware to each route individually.
 */
export function validateBodyOnSchemaMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const schema: Joi.Schema | null = schemas[req.method + req.route?.path];
  if (!schema) {
    next();
    return;
  }

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  req.body = value;
  next();
}
