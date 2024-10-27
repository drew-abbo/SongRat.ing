import { Request, Response } from "express";

import * as code from "../middleware/code";
import basic500 from "../middleware/basic500";
import db from "../db";

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
  type GameInfo = {
    game_name: string;
    game_description: string;
    game_status?: string;
    min_songs_per_playlist: number;
    max_songs_per_playlist: number;
    require_playlist_link: boolean;
  };

  try {
    const gameInfo: GameInfo | undefined = (
      await db.query(
        `SELECT
          game_name,
          game_description,
          game_status,
          min_songs_per_playlist,
          max_songs_per_playlist,
          require_playlist_link
        FROM games
        WHERE invite_code = $1`,
        [req.params.invite_code]
      )
    ).rows[0];

    if (gameInfo && gameInfo.game_status === "waiting_for_players") {
      delete gameInfo.game_status; // remove extra property
      return res.status(200).json(gameInfo);
    }
  } catch (err) {
    return basic500(res, err);
  }

  return res.status(404).json({ message: "Unknown or expired invite code" });
}

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

  // get a client for a transaction
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const [gameInfoQueryResult, nameIsTakenQueryResult] = await Promise.all([
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

      // check if the provided name already exists for the game
      client.query(
        `SELECT EXISTS (
            SELECT p.player_name
            FROM players AS p
            JOIN games AS g ON p.game_id = g.game_id
            WHERE g.invite_code = $1 AND p.player_name = $2
          ) AS name_is_taken`,
        [req.params.invite_code, body.player_name]
      ),
    ]);
    gameInfo = gameInfoQueryResult.rows[0];
    nameIsTaken = nameIsTakenQueryResult.rows[0]?.name_is_taken;

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

    // For efficiency we're inserting all songs in one db call. This means we
    // need to generate a string like "($1, $2, $3), ($4, $5, $6)" to inject
    // into the query. We also need to generate an argument array like
    // [playerId, "title1", "artist1", playerId, "title2", "artist2"].
    let i = 0;
    let sqlArgs: Array<number | string> = [];
    let sqlArgPlaceholders: Array<string> = [];
    body.songs.forEach((song) => {
      sqlArgs.push(playerId, song.title, song.artist);
      sqlArgPlaceholders.push(`($${++i}, $${++i}, $${++i})`);
    });
    const fullSqlArgPlaceholder = sqlArgPlaceholders.join(", ");

    // add songs
    await client.query(
      `INSERT INTO songs (player_id, title, artist)
        VALUES ${fullSqlArgPlaceholder}`,
      sqlArgs
    );

    await client.query("COMMIT");
    res.status(201).json({ player_code: newPlayerCode });
  } catch (err) {
    await client.query("ROLLBACK");
    return basic500(res, err);
  } finally {
    client.release();
  }
}
