import { Request, Response, NextFunction, RequestHandler } from "express";
import Joi from "joi";

export type SchemaMap = {
  [key: string]: Joi.Schema | null;
};

const memoizationForCreateValidatorMiddleware = new Map<
  SchemaMap,
  RequestHandler
>();

/**
 * Returns a middleware function that checks whether a request has a valid JSON
 * body by looking into a map of schemas (provided as an argument). This is a
 * factory function that returns a newly created function. This function is
 * memoized.
 *
 * The returned function ensures the JSON body for a request follows the schema
 * set up for it (the schema associated with the key in `schemas` for the
 * visited route path) If a route path doesn't have a schema it isn't checked.
 * If the body is invalid a 400 status is returned. The body may be updated
 * (i.e. default values filled in).
 *
 * > WARNING:
 * > You cannot use the generated middleware function with `app.use()` because
 * > it requires routes to be pre-defined. Apply this middleware to each route
 * > individually.
 *
 * @example
 * // set up which routes should be validated (starts with HTTP method)
 * const schemas = {
 *   "POST/user": Joi.object({
 *     name: Joi.string().required(),
 *     email: Joi.string().required(),
 *   }),
 *   "GET/user": Joi.object({
 *     get_name: Joi.boolean().required(),
 *     get_email: Joi.boolean().required(),
 *   }),
 * };
 *
 * // generate a middleware function that validates against the schemas
 * const validatorMiddleware = createValidatorMiddleware(schemas);
 *
 * // these routes don't have to check if the request body is valid now
 * app.post("/user", validatorMiddleware, (req, res) => {
 *   // do something...
 * });
 * app.get("/user", validatorMiddleware, (req, res) => {
 *   // do something...
 * });
 */
export function createValidatorMiddleware(schemas: SchemaMap): RequestHandler {
  if (memoizationForCreateValidatorMiddleware.has(schemas)) {
    return memoizationForCreateValidatorMiddleware.get(schemas)!;
  }

  const ret = (req: Request, res: Response, next: NextFunction) => {
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
  };

  memoizationForCreateValidatorMiddleware.set(schemas, ret);
  return ret;
}
