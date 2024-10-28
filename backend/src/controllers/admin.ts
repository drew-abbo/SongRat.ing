import { Request, Response } from "express";

import * as code from "../middleware/code";
import basic500 from "../middleware/basic500";
import db from "../db";

const notImplemented = (req: Request, res: Response) => {
  res.status(501).json({ message: "Not implemented" });
};

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
        ORDER BY rated_p.player_id, s.song_id`,
        [req.params.admin_code]
      ),
    ]);
    const gameInfo: GameInfo | undefined = gameInfoQueryResult.rows[0];
    const players: Players = playersQueryResult.rows;
    const songs: Songs = songsQueryResult.rows;
    const ratings: Ratings = ratingsQueryResult.rows;

    if (!gameInfo) {
      return res.status(404).json({ message: "Unknown admin code" });
    }

    gameInfo.players = players;
    gameInfo.songs = songs;
    gameInfo.ratings = ratings;

    return res.status(200).json(gameInfo);
  } catch (err) {
    return basic500(res, err);
  }
}

export const adminBeginGame = notImplemented;
export const adminEndGame = notImplemented;
export const adminRemovePlayer = notImplemented;
