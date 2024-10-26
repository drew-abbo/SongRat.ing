import { Request, Response } from "express";

import * as code from "../middleware/code";
import basic500 from "../middleware/basic500";
import db from "../db";

const notImplemented = (req: Request, res: Response) => {
  res.status(501).json({ message: "Not implemented" });
};

export async function createGame(req: Request, res: Response) {
  const adminCode = code.generate(code.Kind.ADMIN);
  const inviteCode = code.generate(code.Kind.INVITE);

  try {
    await db.query(
      `INSERT INTO games (
        admin_code,
        game_name,
        game_description,
        min_songs_per_playlist,
        max_songs_per_playlist,
        require_playlist_link,
        invite_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        adminCode,
        req.body.game_name,
        req.body.game_description,
        req.body.min_songs_per_playlist,
        req.body.max_songs_per_playlist,
        req.body.require_playlist_link,
        inviteCode,
      ]
    );
  } catch (err) {
    return basic500(res, err);
  }

  return res.status(201).json({
    admin_code: adminCode,
    inviteCode: inviteCode,
  });
}

export async function peekGameInfo(req: Request, res: Response) {
  try {
    const result = await db.query(
      `SELECT
        game_name,
        game_description,
        min_songs_per_playlist,
        max_songs_per_playlist,
        require_playlist_link
      FROM games
      WHERE invite_code = $1`,
      [req.params.invite_code]
    );
    if (result.rows.length) {
      return res.status(200).json(result.rows);
    }
  } catch (err) {
    return basic500(res, err);
  }

  return res.status(404).json({ message: "Unknown invite code" });
}

export const joinGame = notImplemented;
