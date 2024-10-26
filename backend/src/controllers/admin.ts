import { Request, Response } from "express";

const notImplemented = (req: Request, res: Response) => {
  res.status(501).json({ message: "Not implemented" });
};

export const adminReviewGame = notImplemented;
export const adminBeginGame = notImplemented;
export const adminEndGame = notImplemented;
export const adminRemovePlayer = notImplemented;
