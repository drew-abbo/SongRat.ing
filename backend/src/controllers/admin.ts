import { Request, Response } from "express";

import basic500 from "../middleware/basic500";
import db from "../db";

/**
 * Returns whether a game exists given an admin code.
 * @param adminCode The admin code to check the existence of.
 * @returns Whether or not the admin code is valid.
 *
 * @throws Any error that happens as a result of a database read failure.
 */
async function gameExists(adminCode: string): Promise<boolean> {
  return (
    await db.query(
      `SELECT EXISTS (
          SELECT 1
          FROM games
          WHERE admin_code = $1
        ) AS game_exists`,
      [adminCode]
    )
  ).rows[0].game_exists;
}

/** Returns a 404 with the message "Unknown admin code". */
function unknownAdminCode(res: Response) {
  return res.status(404).json({ message: "Unknown admin code" });
}

export async function adminReviewGame(req: Request, res: Response) {
  type GameInfo = {
    game_name: string;
    game_description: string;
    game_status: string;
    min_songs_per_playlist: number;
    max_songs_per_playlist: number;
    require_playlist_link: boolean;
    invite_code: string | null;
    players: Players;
    songs: Songs;
    ratings: Ratings;
  };
  type Players = Array<{
    player_code: string;
    player_name: string;
    playlist_link: string | null;
  }>;
  type Songs = Array<{
    song_id: string;
    player_name: string;
    title: string;
    artist: string;
  }>;
  type Ratings = Array<{
    song_id: string;
    player_name: string;
    title: string;
    artist: string;
    rater_player_name: string;
    rating: number;
  }>;

  try {
    const [
      gameInfoQueryResult,
      playersQueryResult,
      songsQueryResult,
      ratingsQueryResult,
    ] = await Promise.all([
      // game info
      db.query(
        `SELECT
          game_name,
          game_description,
          game_status,
          min_songs_per_playlist,
          max_songs_per_playlist,
          require_playlist_link,
          invite_code
        FROM games
        WHERE admin_code = $1`,
        [req.params.admin_code]
      ),

      // players in the game
      db.query(
        `SELECT
          p.player_code,
          p.player_name,
          p.playlist_link
        FROM players AS p
        JOIN games AS g ON p.game_id = g.game_id
        WHERE g.admin_code = $1
        ORDER BY p.player_id`,
        [req.params.admin_code]
      ),

      // songs from players in the game
      db.query(
        `SELECT
          s.song_id,
          p.player_name,
          s.title,
          s.artist
        FROM songs AS s
        JOIN players AS p ON s.player_id = p.player_id
        JOIN games AS g ON p.game_id = g.game_id
        WHERE g.admin_code = $1
        ORDER BY p.player_id, s.song_id`,
        [req.params.admin_code]
      ),

      // ratings on songs from players in the game
      db.query(
        `SELECT
          s.song_id,
          rated_p.player_name,
          s.title,
          s.artist,
          rater_p.player_name AS rater_player_name,
          r.rating
        FROM ratings AS r
        JOIN songs AS s ON r.song_id = s.song_id
        JOIN players AS rated_p ON s.player_id = rated_p.player_id
        JOIN players AS rater_p ON r.rater_player_id = rater_p.player_id
        JOIN games AS g ON rated_p.game_id = g.game_id
        WHERE g.admin_code = $1
        ORDER BY rated_p.player_id, s.song_id, r.rater_player_id`,
        [req.params.admin_code]
      ),
    ]);
    const gameInfo: GameInfo | undefined = gameInfoQueryResult.rows[0];
    const players: Players = playersQueryResult.rows;
    const songs: Songs = songsQueryResult.rows;
    const ratings: Ratings = ratingsQueryResult.rows;

    if (!gameInfo) {
      return unknownAdminCode(res);
    }

    gameInfo.players = players;
    gameInfo.songs = songs;
    gameInfo.ratings = ratings;

    return res.status(200).json(gameInfo);
  } catch (err) {
    return basic500(res, err);
  }
}

export async function adminBeginGame(req: Request, res: Response) {
  try {
    const rowsUpdated = (
      await db.query(
        `UPDATE games
        SET game_status = 'active', invite_code = NULL
        WHERE
          admin_code = $1 AND
          game_status = 'waiting_for_players' AND
          (
            SELECT COUNT(*)
            FROM players AS p
            WHERE p.game_id = games.game_id
          ) >= 2`,
        [req.params.admin_code]
      )
    ).rowCount;

    if (rowsUpdated) {
      return res.status(201).json({ message: "Game begun successfully" });
    }

    // if it failed see if it failed because the admin code doesn't exist or
    // because the game status isn't 'waiting_for_players'
    if (await gameExists(req.params.admin_code)) {
      return res.status(409).json({
        message:
          "Can't begin an active or finished game or a game with less than 2 " +
          "players",
      });
    }
    return unknownAdminCode(res);
  } catch (err) {
    return basic500(res, err);
  }
}

export async function adminEndGame(req: Request, res: Response) {
  try {
    const rowsUpdated = (
      await db.query(
        // update the game status for the game (the game must be active and have
        // all ratings in, i.e. ratings = songs * (players - 1) must be true)
        `WITH
          song_count AS (
            SELECT COUNT(1) AS total_songs
            FROM songs AS s
            JOIN players AS p ON s.player_id = p.player_id
            JOIN games AS g ON p.game_id = g.game_id
            WHERE g.admin_code = $1
          ),
          player_count AS (
            SELECT COUNT(1) AS total_players
            FROM players AS p
            JOIN games AS g ON p.game_id = g.game_id
            WHERE g.admin_code = $1
          ),
          rating_count AS (
            SELECT COUNT(1) AS total_ratings
            FROM ratings AS r
            JOIN songs AS s ON r.song_id = s.song_id
            JOIN players AS p ON s.player_id = p.player_id
            JOIN games AS g ON p.game_id = g.game_id
            WHERE g.admin_code = $1
          )
        UPDATE games
        SET game_status = 'finished'
        WHERE
          admin_code = $1 AND
          game_status = 'active' AND
            (SELECT total_ratings FROM rating_count) =
            (SELECT total_songs FROM song_count) *
            ((SELECT total_players FROM player_count) - 1)`,
        [req.params.admin_code]
      )
    ).rowCount;

    if (rowsUpdated) {
      return res.status(201).json({ message: "Game ended successfully" });
    }

    // if it failed see if it failed because the admin code doesn't exist or
    // because the game status isn't 'active'
    if (await gameExists(req.params.admin_code)) {
      return res.status(409).json({
        message:
          "Can't end a game that has missing ratings or that isn't active",
      });
    }
    return unknownAdminCode(res);
  } catch (err) {
    return basic500(res, err);
  }
}

export async function adminRemovePlayer(req: Request, res: Response) {
  try {
    const rowsUpdated = (
      await db.query(
        `DELETE FROM players AS p1
        USING games AS g
        WHERE
          p1.game_id = g.game_id AND
          g.admin_code = $1 AND
          p1.player_code = $2 AND
          (
            g.game_status = 'waiting_for_players' OR
            (
              SELECT COUNT(*)
              FROM players AS p2
              WHERE p2.game_id = g.game_id
            ) > 2
          )`,
        [req.params.admin_code, req.body.player_code]
      )
    ).rowCount;

    if (rowsUpdated) {
      return res.status(201).json({ message: "Player removed successfully" });
    }

    // if it failed see if it failed because the admin code doesn't exist or
    // because the player code doesn't exist
    if (await gameExists(req.params.admin_code)) {
      return res.status(409).json({
        message:
          "Unknown player code or removal would result in less than 2 " +
          "players being in an active or finished game",
      });
    }
    return unknownAdminCode(res);
  } catch (err) {
    return basic500(res, err);
  }
}
