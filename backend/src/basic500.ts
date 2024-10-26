import { Response } from "express";

/**
 * Sets a response to a 500 with a json message. Useful for operations that
 * generally aren't going to fail, but still can.
 *
 * @param res The ExpressJS response object that will be modified.
 * @param err An optional error to log.
 *
 * @example
 * app.get("/get_data", async (req: Request, res: Response) => {
 *   try {
 *     const data = await getDatabaseData();
 *     return res.status(200).json(data);
 *   } catch (err) {
 *     return basic500(res, err);
 *   }
 * });
 * */
export default function basic500(res: Response, err?: any): void {
  if (err !== undefined) {
    console.error(err);
  }
  res.status(500).json({ message: "Internal Server Error" });
}
