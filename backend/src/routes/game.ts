import { Router } from "express";

import { validateBodyOnSchemaMiddleware } from "../middleware/schemas";
import * as code from "../middleware/code";
import * as controllers from "../controllers/game";

export const routes = Router();

routes.post(
  "/new",
  validateBodyOnSchemaMiddleware,
  controllers.createGame
);

routes.get(
  "/peek/:invite_code",
  code.createValidatorMiddleware(code.Kind.INVITE),
  validateBodyOnSchemaMiddleware,
  controllers.peekGameInfo
);

routes.post(
  "/join/:invite_code",
  code.createValidatorMiddleware(code.Kind.INVITE),
  validateBodyOnSchemaMiddleware,
  controllers.joinGame
);
