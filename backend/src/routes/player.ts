import { Router } from "express";

import * as code from "../middleware/code";
import * as jsonBody from "../middleware/body_validator";
import schemas from "../schemas/player";
import * as controllers from "../controllers/player";

export const routes = Router();

routes.get(
  "/review/:player_code",
  code.createValidatorMiddleware(code.Kind.PLAYER),
  jsonBody.createValidatorMiddleware(schemas),
  controllers.playerReviewGame
);

routes.post(
  "/add_song/:player_code",
  code.createValidatorMiddleware(code.Kind.PLAYER),
  jsonBody.createValidatorMiddleware(schemas),
  controllers.playerAddSong
);

routes.post(
  "/remove_song/:player_code",
  code.createValidatorMiddleware(code.Kind.PLAYER),
  jsonBody.createValidatorMiddleware(schemas),
  controllers.playerRemoveSong
);

routes.post(
  "/replace_song/:player_code",
  code.createValidatorMiddleware(code.Kind.PLAYER),
  jsonBody.createValidatorMiddleware(schemas),
  controllers.playerReplaceSong
);

routes.post(
  "/change_playlist_link/:player_code",
  code.createValidatorMiddleware(code.Kind.PLAYER),
  jsonBody.createValidatorMiddleware(schemas),
  controllers.playerChangePlaylistLink
);

routes.post(
  "/update_info/:player_code",
  code.createValidatorMiddleware(code.Kind.PLAYER),
  jsonBody.createValidatorMiddleware(schemas),
  controllers.playerUpdateInfo
);

routes.post(
  "/rate_song/:player_code",
  code.createValidatorMiddleware(code.Kind.PLAYER),
  jsonBody.createValidatorMiddleware(schemas),
  controllers.playerRateSong
);
