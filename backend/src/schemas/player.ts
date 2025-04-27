import Joi from "joi";

// used to ensure extremely large id numbers aren't passed into the database
const INT_MAX = 2147483647;

import { SchemaMap } from "../middleware/body_validator";

const schemas: SchemaMap = Object.freeze({
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

  "POST/player/update_info/:player_code": Joi.object({
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

  "POST/player/rate_song/:player_code": Joi.object({
    song_id: Joi.number().integer().min(1).max(INT_MAX).required(),
    rating: Joi.number().min(0.0).max(10.0).required(),
  }),
});

export default schemas;
