import { Request, Response } from "express";

import * as code from "../middleware/code";
import basic500 from "../middleware/basic500";
import db from "../db";
import insertSongsQuery from "./utils/insert_songs_query";

export async function checkCode(req: Request, res: Response) {
  const code = req.params.code;

  let query: string;
  switch (code[0]) {
    case "I":
      query = `SELECT EXISTS (
                SELECT 1
                FROM games
                WHERE invite_code = $1 AND game_status = 'waiting_for_players'
              )`;
      break;

    case "P":
      query = `SELECT EXISTS (
                SELECT 1
                FROM players
                WHERE player_code = $1
              )`;
      break;

    case "A":
      query = `SELECT EXISTS (
                SELECT 1
                FROM games
                WHERE admin_code = $1
              )`;
      break;
  }

  try {
    const isValid: boolean = (await db.query(query!, [code])).rows[0].exists;
    return res.status(200).json({ is_valid: isValid });
  } catch (err) {
    return basic500(res, err);
  }
}

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
    invite_code: inviteCode,
  });
}

export async function peekGameInfo(req: Request, res: Response) {
  type GameInfo = {
    game_name: string;
    game_description: string;
    game_status?: string;
    min_songs_per_playlist: number;
    max_songs_per_playlist: number;
    require_playlist_link: boolean;
  };

  const code = req.params.code;

  try {
    let gameInfo: GameInfo | undefined;

    if (code[0] == "I" || code[0] == "A") {
      gameInfo = (
        await db.query(
          `SELECT
            game_name,
            game_description,
            game_status,
            min_songs_per_playlist,
            max_songs_per_playlist,
            require_playlist_link
          FROM games
          WHERE ${code[0] == "I" ? "invite" : "admin"}_code = $1`,
          [code]
        )
      ).rows[0];
    } else if (code[0] == "P") {
      gameInfo = (
        await db.query(
          `SELECT
            g.game_name,
            g.game_description,
            g.game_status,
            g.min_songs_per_playlist,
            g.max_songs_per_playlist,
            g.require_playlist_link
          FROM players AS p
          JOIN games AS g ON p.game_id = g.game_id
          WHERE p.player_code = $1`,
          [code]
        )
      ).rows[0];
    }

    if (gameInfo && gameInfo.game_status === "waiting_for_players") {
      delete gameInfo.game_status; // remove extra property
      return res.status(200).json(gameInfo);
    }
  } catch (err) {
    return basic500(res, err);
  }

  return res.status(404).json({ message: "Unknown or expired code" });
}

const GAME_PLAYER_LIMIT = 50;

export async function joinGame(req: Request, res: Response) {
  const body: {
    player_name: string;
    playlist_link: string | null;
    songs: Array<{ title: string; artist: string }>;
  } = req.body;

  let gameInfo: {
    game_id: number;
    game_status: string;
    min_songs_per_playlist: number;
    max_songs_per_playlist: number;
    require_playlist_link: boolean;
  };
  let nameIsTaken: boolean;
  let gamePlayerLimitReached: boolean;

  // get a client for a transaction
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const [gameInfoQueryResult, takenNamesQueryResult] = await Promise.all([
      // get info about the game via the invite code
      client.query(
        `SELECT
          game_id,
          game_status,
          min_songs_per_playlist,
          max_songs_per_playlist,
          require_playlist_link
        FROM games
        WHERE invite_code = $1`,
        [req.params.invite_code]
      ),

      // collect the names of all players already in the game
      client.query(
        `SELECT p.player_name
        FROM players AS p
        JOIN games AS g on p.game_id = g.game_id
        WHERE g.invite_code = $1`,
        [req.params.invite_code]
      ),
    ]);
    gameInfo = gameInfoQueryResult.rows[0];
    nameIsTaken = takenNamesQueryResult.rows.some(
      (row) => row.player_name == body.player_name
    );
    gamePlayerLimitReached =
      takenNamesQueryResult.rows.length >= GAME_PLAYER_LIMIT;

    if (!gameInfo || gameInfo.game_status !== "waiting_for_players") {
      return res
        .status(404)
        .json({ message: "Unknown or expired invite code" });
    }

    if (nameIsTaken) {
      return res
        .status(409)
        .json({ message: "Provided name is already in use for this game" });
    }

    if (gamePlayerLimitReached) {
      return res.status(409).json({
        message: `Games can't have over ${GAME_PLAYER_LIMIT} players`,
      });
    }

    // ensure a playlist link was provided (if required)
    if (gameInfo.require_playlist_link && !body.playlist_link) {
      return res
        .status(409)
        .json({ message: "Playlist link required but not provided" });
    }

    // ensure a valid number of songs was provided
    const songCount = body.songs.length;
    const minSongCount = gameInfo.min_songs_per_playlist;
    const maxSongCount = gameInfo.max_songs_per_playlist;
    if (songCount < minSongCount || songCount > maxSongCount) {
      return res.status(409).json({
        message:
          (songCount > maxSongCount ? "Too many" : "Not enough") +
          " songs were provided, expected " +
          (minSongCount === maxSongCount
            ? maxSongCount
            : "between " + minSongCount + " and " + maxSongCount) +
          " songs",
      });
    }

    const newPlayerCode = code.generate(code.Kind.PLAYER);

    // create new player (player needs to be created before songs can be added)
    const playerId: number = (
      await client.query(
        `INSERT INTO players (
          game_id,
          player_code,
          player_name,
          playlist_link)
        VALUES ($1, $2, $3, $4)
        RETURNING player_id`,
        [gameInfo.game_id, newPlayerCode, body.player_name, body.playlist_link]
      )
    ).rows[0].player_id;

    // add songs
    await client.query(...insertSongsQuery(body.songs, playerId));

    await client.query("COMMIT");
    res.status(201).json({ player_code: newPlayerCode });
  } catch (err) {
    await client.query("ROLLBACK");
    return basic500(res, err);
  } finally {
    client.release();
  }
}
