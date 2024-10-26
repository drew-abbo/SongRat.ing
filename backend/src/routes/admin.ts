import { Router } from "express";

import * as code from "../middleware/code";
import * as jsonBody from "../middleware/body_validator";
import schemas from "../schemas/admin";
import * as controllers from "../controllers/admin";

export const routes = Router();

routes.get(
  "/review/:admin_code",
  code.createValidatorMiddleware(code.Kind.ADMIN),
  jsonBody.createValidatorMiddleware(schemas),
  controllers.adminReviewGame
);

routes.post(
  "/begin/:admin_code",
  code.createValidatorMiddleware(code.Kind.ADMIN),
  jsonBody.createValidatorMiddleware(schemas),
  controllers.adminBeginGame
);

routes.post(
  "/end/:admin_code",
  code.createValidatorMiddleware(code.Kind.ADMIN),
  jsonBody.createValidatorMiddleware(schemas),
  controllers.adminEndGame
);

routes.post(
  "/remove_player/:admin_code",
  code.createValidatorMiddleware(code.Kind.ADMIN),
  jsonBody.createValidatorMiddleware(schemas),
  controllers.adminRemovePlayer
);
