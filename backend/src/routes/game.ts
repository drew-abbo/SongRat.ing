import { Router } from "express";

import * as code from "../middleware/code";
import * as jsonBody from "../middleware/body_validator";
import schemas from "../schemas/game";
import * as controllers from "../controllers/game";

export const routes = Router();

routes.get(
  "/check_code/:code",
  code.createValidatorMiddleware(code.Kind.ANY),
  jsonBody.createValidatorMiddleware(schemas),
  controllers.checkCode
);

routes.post(
  "/new",
  jsonBody.createValidatorMiddleware(schemas),
  controllers.createGame
);

routes.get(
  "/peek/:code",
  code.createValidatorMiddleware(code.Kind.ANY),
  jsonBody.createValidatorMiddleware(schemas),
  controllers.peekGameInfo
);

routes.post(
  "/join/:invite_code",
  code.createValidatorMiddleware(code.Kind.INVITE),
  jsonBody.createValidatorMiddleware(schemas),
  controllers.joinGame
);
