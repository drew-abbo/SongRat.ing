import { Router } from "express";

import { validateBodyOnSchemaMiddleware } from "../middleware/schemas";
import * as code from "../middleware/code";
import * as controllers from "../controllers/admin";

export const routes = Router();

routes.get(
  "/review/:admin_code",
  code.createValidatorMiddleware(code.Kind.ADMIN),
  validateBodyOnSchemaMiddleware,
  controllers.adminReviewGame
);

routes.post(
  "/begin/:admin_code",
  code.createValidatorMiddleware(code.Kind.ADMIN),
  validateBodyOnSchemaMiddleware,
  controllers.adminBeginGame
);

routes.post(
  "/end/:admin_code",
  code.createValidatorMiddleware(code.Kind.ADMIN),
  validateBodyOnSchemaMiddleware,
  controllers.adminEndGame
);

routes.post(
  "/remove_player/:admin_code",
  code.createValidatorMiddleware(code.Kind.ADMIN),
  validateBodyOnSchemaMiddleware,
  controllers.adminRemovePlayer
);
