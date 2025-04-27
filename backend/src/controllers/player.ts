import { Request, Response } from "express";
import { PoolClient, Pool } from "pg";

import basic500 from "../middleware/basic500";
import db from "../db";
import insertSongsQuery from "./utils/insert_songs_query";

/** Returns a 404 with the message "Unknown player code". */
function unknownPlayerCode(res: Response) {
  return res.status(404).json({ message: "Unknown player code" });
}

/**
 * Returns a 409 with a message about the operation resulting in an invalid song
 * count.
 */
function operationMustResultInValidSongCount(res: Response) {
  return res.status(409).json({
    message:
      "Operation would result in a song count outside of the range of " +
      '"min_songs_per_playlist" to "min_songs_per_playlist"',
  });
}

/**
 * Returns a 409 with a message about the game status not being
 * "waiting_for_players".
 */
function gameIsntWatingForPlayers(res: Response) {
  return res.status(409).json({
    message:
      "Playlists cannot be modified unless the game status is waiting for " +
      "players",
  });
}

type BasicGameInfoForPlayer = {
  song_count: number;
  player_id: number;
  min_songs_per_playlist: number;
  max_songs_per_playlist: number;
  game_status: string;
};

/**
 * Returns the min and max songs per playlist. Updates the response if anything
 * fails. This function can throw.
 */
async function getBasicGameInfo(
  res: Response,
  playerCode: string,
  client: PoolClient | Pool = db
): Promise<BasicGameInfoForPlayer | null> {
  const ret =
    (
      await client.query(
        `SELECT
          COUNT(s.song_id) AS song_count,
          p.player_id,
          g.min_songs_per_playlist,
          g.max_songs_per_playlist,
          g.game_status
        FROM players AS p
        JOIN games AS g ON p.game_id = g.game_id
        LEFT JOIN songs AS s ON s.player_id = p.player_id
        WHERE p.player_code = $1
        GROUP BY
          p.player_id,
          g.min_songs_per_playlist,
          g.max_songs_per_playlist,
          g.game_status`,
        [playerCode]
      )
    ).rows[0] || null;

  if (!ret) {
    unknownPlayerCode(res);
  }
  return ret;
}

export async function playerReviewGame(req: Request, res: Response) {
  type GameInfo = {
    game_name: string;
    game_description: string;
    game_status: string;
    min_songs_per_playlist: number;
    max_songs_per_playlist: number;
    require_playlist_link: boolean;
    player_name: string;
    players: Players;
    songs: Songs;
    ratings: Ratings;
  };
  type Players = Array<{
    player_code?: string;
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
          g.game_name,
          g.game_description,
          g.game_status,
          g.min_songs_per_playlist,
          g.max_songs_per_playlist,
          g.require_playlist_link
        FROM players AS p
        JOIN games AS g ON p.game_id = g.game_id
        WHERE player_code = $1`,
        [req.params.player_code]
      ),

      // players in the game
      db.query(
        `SELECT 
          p2.player_code,
          p2.player_name,
          p2.playlist_link
        FROM players AS p1
        JOIN players AS p2 ON p1.game_id = p2.game_id
        WHERE p1.player_code = $1
        ORDER BY p2.player_id`,
        [req.params.player_code]
      ),

      // songs from players in the game
      db.query(
        `SELECT 
          s.song_id,
          p2.player_name,
          s.title,
          s.artist
        FROM players AS p1
        JOIN players AS p2 ON p1.game_id = p2.game_id
        JOIN songs AS s ON s.player_id = p2.player_id
        WHERE p1.player_code = $1
        ORDER BY p2.player_id, s.song_id`,
        [req.params.player_code]
      ),

      // ratings from this player
      db.query(
        `SELECT
          r.song_id,
          p2.player_name,
          s.title,
          s.artist,
          r.rating
        FROM ratings AS r
        JOIN songs AS s ON r.song_id = s.song_id
        JOIN players AS p1 ON r.rater_player_id = p1.player_id
        JOIN players AS p2 ON s.player_id = p2.player_id
        WHERE p1.player_code = $1
        ORDER BY p2.player_name, r.song_id`,
        [req.params.player_code]
      ),
    ]);
    const gameInfo: GameInfo | undefined = gameInfoQueryResult.rows[0];
    const players: Players = playersQueryResult.rows;
    const songs: Songs = songsQueryResult.rows;
    const ratings: Ratings = ratingsQueryResult.rows;

    if (!gameInfo) {
      return unknownPlayerCode(res);
    }

    // find this player's player name
    let playerName: string | undefined;
    for (let i = 0; i < players.length; i++) {
      if (players[i].player_code === req.params.player_code) {
        playerName = players[i].player_name;
      }
    }
    if (!playerName) {
      throw new Error("player code not found in player list");
    }

    // remove player codes from "players" list
    players.forEach((player) => {
      delete player.player_code;
    });

    gameInfo.player_name = playerName;
    gameInfo.players = players;
    gameInfo.songs = songs;
    gameInfo.ratings = ratings;

    return res.status(200).json(gameInfo);
  } catch (err) {
    return basic500(res, err);
  }
}

export async function playerAddSong(req: Request, res: Response) {
  // get a client for a transaction
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const gameInfo = await getBasicGameInfo(
      res,
      req.params.player_code,
      client
    );
    if (!gameInfo) {
      return res;
    }

    if (gameInfo.game_status !== "waiting_for_players") {
      return gameIsntWatingForPlayers(res);
    }
    if (gameInfo.song_count + 1 > gameInfo.max_songs_per_playlist) {
      return operationMustResultInValidSongCount(res);
    }

    await client.query(
      `INSERT INTO songs (player_id, title, artist)
      VALUES ($1, $2, $3)`,
      [
        gameInfo.player_id,
        req.body.song_to_add.title,
        req.body.song_to_add.artist,
      ]
    );

    await client.query("COMMIT");
    return res.status(201).json({ message: "Song added successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    return basic500(res, err);
  } finally {
    client.release();
  }
}

export async function playerRemoveSong(req: Request, res: Response) {
  // get a client for a transaction
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const gameInfo = await getBasicGameInfo(
      res,
      req.params.player_code,
      client
    );
    if (!gameInfo) {
      return res;
    }

    if (gameInfo.game_status !== "waiting_for_players") {
      return gameIsntWatingForPlayers(res);
    }
    if (gameInfo.song_count - 1 < gameInfo.min_songs_per_playlist) {
      return operationMustResultInValidSongCount(res);
    }

    const removeCount = (
      await client.query(
        `DELETE FROM songs
        WHERE player_id = $1 AND song_id = $2`,
        [gameInfo.player_id, req.body.song_id_to_remove]
      )
    ).rowCount;
    if (!removeCount) {
      return res.status(409).json({ message: "Invalid song id" });
    }

    await client.query("COMMIT");
    return res.status(201).json({ message: "Song removed successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    return basic500(res, err);
  } finally {
    client.release();
  }
}

export async function playerReplaceSong(req: Request, res: Response) {
  // get a client for a transaction
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const gameInfo: { game_status: string; player_id: number } | undefined = (
      await client.query(
        `SELECT
          g.game_status,
          p.player_id
        FROM games AS g
        JOIN players AS p ON p.game_id = g.game_id
        WHERE p.player_code = $1`,
        [req.params.player_code]
      )
    ).rows[0];
    if (!gameInfo) {
      return unknownPlayerCode(res);
    }

    if (gameInfo.game_status !== "waiting_for_players") {
      return gameIsntWatingForPlayers(res);
    }

    const replaceCount = (
      await client.query(
        `UPDATE songs
        SET
          title = $1,
          artist = $2
        WHERE
          player_id = $3 AND
          song_id = $4`,
        [
          req.body.song_to_add.title,
          req.body.song_to_add.artist,
          gameInfo.player_id,
          req.body.song_id_to_remove,
        ]
      )
    ).rowCount;
    if (!replaceCount) {
      return res.status(409).json({ message: "Invalid song id" });
    }

    await client.query("COMMIT");
    return res.status(201).json({ message: "Song updated successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    return basic500(res, err);
  } finally {
    client.release();
  }
}

export async function playerChangePlaylistLink(req: Request, res: Response) {
  // get a client for a transaction
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const gameInfo:
      | { game_status: string; require_playlist_link: boolean }
      | undefined = (
      await client.query(
        `SELECT
          g.game_status,
          g.require_playlist_link
        FROM games AS g
        JOIN players AS p ON p.game_id = g.game_id
        WHERE p.player_code = $1`,
        [req.params.player_code]
      )
    ).rows[0];
    if (!gameInfo) {
      return unknownPlayerCode(res);
    }

    if (gameInfo.game_status !== "waiting_for_players") {
      return gameIsntWatingForPlayers(res);
    }

    if (gameInfo.require_playlist_link && !req.body.playlist_link) {
      return res
        .status(209)
        .json({ message: "Playlist link required but not provided" });
    }

    await db.query(
      `UPDATE players
      SET playlist_link = $1
      WHERE player_code = $2`,
      [req.body.playlist_link, req.params.player_code]
    );

    await client.query("COMMIT");
    return res
      .status(201)
      .json({ message: "Playlist link updated successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    return basic500(res, err);
  } finally {
    client.release();
  }
}

export async function playerUpdateInfo(req: Request, res: Response) {
  const body: {
    player_name: string;
    playlist_link: string | null;
    songs: Array<{ title: string; artist: string }>;
  } = req.body;

  let gameInfo: {
    game_status: string;
    min_songs_per_playlist: number;
    max_songs_per_playlist: number;
    require_playlist_link: boolean;
    player_id: number;
  };
  let nameIsTaken: boolean;

  // get a client for a transaction
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const [gameInfoQueryResult, nameIsTakenQueryResult] = await Promise.all([
      // game info
      client.query(
        `SELECT
          g.game_status,
          g.min_songs_per_playlist,
          g.max_songs_per_playlist,
          g.require_playlist_link,
          p.player_id
        FROM players AS p
        JOIN games AS g ON p.game_id = g.game_id
        WHERE player_code = $1`,
        [req.params.player_code]
      ),

      // make sure the player's new name doesn't conflict with any existing
      // names or is the same as their original name
      client.query(
        `SELECT EXISTS (
          SELECT 1
          FROM players AS p1
          JOIN players AS p2 ON p1.game_id = p2.game_id
          WHERE
            p1.player_code = $1 AND
            p2.player_code <> p1.player_code AND
            p2.player_name = $2
        ) AS name_is_taken`,
        [req.params.player_code, body.player_name]
      ),
    ]);
    gameInfo = gameInfoQueryResult.rows[0];
    nameIsTaken = nameIsTakenQueryResult.rows[0].name_is_taken;

    if (!gameInfo) {
      return unknownPlayerCode(res);
    }

    if (gameInfo.game_status !== "waiting_for_players") {
      return res.status(410).json({ message: "The game has already started." });
    }

    if (nameIsTaken) {
      return res
        .status(409)
        .json({ message: "Name changed to name already in use for this game" });
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

    // update player info
    await client.query(
      `UPDATE players
      SET
        player_name = $1,
        playlist_link = $2
      WHERE player_id = $3`,
      [body.player_name, body.playlist_link, gameInfo.player_id]
    );

    // remove old songs
    await client.query(
      `DELETE FROM songs
      WHERE player_id = $1`,
      [gameInfo.player_id]
    );

    // add songs
    await client.query(...insertSongsQuery(body.songs, gameInfo.player_id));

    await client.query("COMMIT");
    res.status(201).json({ message: "Player data updated successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    return basic500(res, err);
  } finally {
    client.release();
  }
}

export async function playerRateSong(req: Request, res: Response) {
  // get a client for a transaction
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const [gameInfoQueryResult, songInfoQueryResult] = await Promise.all([
      // get game info
      client.query(
        `SELECT
          g.game_status,
          g.game_id,
          p.player_id
        FROM games AS g
        JOIN players AS p ON p.game_id = g.game_id
        WHERE p.player_code = $1`,
        [req.params.player_code]
      ),

      // get song info
      client.query(
        `SELECT
          s.song_id,
          p.player_id,
          g.game_id
        FROM songs AS s
        JOIN players AS p ON s.player_id = p.player_id
        JOIN games AS g ON p.game_id = g.game_id
        WHERE s.song_id = $1`,
        [req.body.song_id]
      ),
    ]);

    const gameInfo:
      | { game_status: string; game_id: number; player_id: number }
      | undefined = gameInfoQueryResult.rows[0];
    if (!gameInfo) {
      return unknownPlayerCode(res);
    }

    if (gameInfo.game_status !== "active") {
      return res.status(409).json({
        message:
          "Playlists cannot be modified unless the game status is active",
      });
    }

    const songInfo:
      | { song_id: number; player_id: number; game_id: number }
      | undefined = songInfoQueryResult.rows[0];
    if (
      !songInfo ||
      songInfo.game_id !== gameInfo.game_id ||
      songInfo.player_id === gameInfo.player_id
    ) {
      return res.status(409).json({ message: "Invalid song id" });
    }

    await db.query(
      // insert new record or update the existing one
      `INSERT INTO ratings (song_id, rater_player_id, rating)
      VALUES ($1, $2, $3)
      ON CONFLICT (song_id, rater_player_id)
      DO UPDATE SET rating = EXCLUDED.rating`,
      [req.body.song_id, gameInfo.player_id, req.body.rating]
    );

    await client.query("COMMIT");
    return res.status(201).json({ message: "Rating submitted successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    return basic500(res, err);
  } finally {
    client.release();
  }
}
