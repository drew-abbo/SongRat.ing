import Joi from "joi";

import { SchemaMap } from "../middleware/body_validator";

const schemas: SchemaMap = Object.freeze({
  "POST/new": Joi.object({
    game_name: Joi.string().min(1).max(255).required(),
    game_description: Joi.string().max(2500).allow("").default(""),
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

  "GET/peek/:invite_code": null,

  "POST/join/:invite_code": Joi.object({
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
});

export default schemas;
