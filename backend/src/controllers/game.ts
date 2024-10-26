import { Request, Response } from "express";

const notImplemented = (req: Request, res: Response) => {
  res.status(501).json({ message: "Not implemented" });
};

export const createGame = notImplemented;
export const peekGameInfo = notImplemented;
export const joinGame = notImplemented;
