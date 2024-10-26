import { Router } from "express";

import { validateBodyOnSchemaMiddleware } from "../middleware/schemas";
import * as code from "../middleware/code";
import * as controllers from "../controllers/player";

export const routes = Router();

routes.get(
  "/review/:player_code",
  code.createValidatorMiddleware(code.Kind.PLAYER),
  validateBodyOnSchemaMiddleware,
  controllers.playerReviewGame
);

routes.post(
  "/add_song/:player_code",
  code.createValidatorMiddleware(code.Kind.PLAYER),
  validateBodyOnSchemaMiddleware,
  controllers.playerAddSong
);

routes.post(
  "/remove_song/:player_code",
  code.createValidatorMiddleware(code.Kind.PLAYER),
  validateBodyOnSchemaMiddleware,
  controllers.playerRemoveSong
);

routes.post(
  "/replace_song/:player_code",
  code.createValidatorMiddleware(code.Kind.PLAYER),
  validateBodyOnSchemaMiddleware,
  controllers.playerReplaceSong
);

routes.post(
  "/change_playlist_link/:player_code",
  code.createValidatorMiddleware(code.Kind.PLAYER),
  validateBodyOnSchemaMiddleware,
  controllers.playerChangePlaylistLink
);

routes.post(
  "/rate_song/:player_code",
  code.createValidatorMiddleware(code.Kind.PLAYER),
  validateBodyOnSchemaMiddleware,
  controllers.playerRateSong
);
