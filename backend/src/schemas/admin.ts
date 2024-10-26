import Joi from "joi";

import * as code from "../middleware/code";

import { SchemaMap } from "../middleware/body_validator";

const schemas: SchemaMap = Object.freeze({
  "GET/admin/review/:admin_code": null,

  "POST/admin/begin/:admin_code": null,

  "POST/admin/end/:admin_code": null,

  "POST/admin/remove_player/:admin_code": Joi.object({
    player_code: Joi.string()
      .pattern(code.regexForCode(code.Kind.PLAYER))
      .required(),
  }),
});

export default schemas;
