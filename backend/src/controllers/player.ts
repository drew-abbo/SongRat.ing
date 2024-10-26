import { Request, Response } from "express";

const notImplemented = (req: Request, res: Response) => {
  res.status(501).json({ message: "Not implemented" });
};

export const playerReviewGame = notImplemented;
export const playerAddSong = notImplemented;
export const playerRemoveSong = notImplemented;
export const playerReplaceSong = notImplemented;
export const playerChangePlaylistLink = notImplemented;
export const playerRateSong = notImplemented;
