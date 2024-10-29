import { Request, Response } from "express";

import basic500 from "../middleware/basic500";
import db from "../db";

const notImplemented = (req: Request, res: Response) => {
  res.status(501).json({ message: "Not implemented" });
};

/** Returns a 404 with the message "Unknown player code". */
function unknownPlayerCode(res: Response) {
  return res.status(404).json({ message: "Unknown player code" });
}

export async function playerReviewGame(req: Request, res: Response) {
  type GameInfo = {
    game_name: string;
    game_description: string;
    game_status: string;
    min_songs_per_playlist: number;
    max_songs_per_playlist: number;
    require_playlist_link: boolean;
    players: Players;
    songs: Songs;
    ratings: Ratings;
  };
  type Players = Array<{
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

    gameInfo.players = players;
    gameInfo.songs = songs;
    gameInfo.ratings = ratings;

    return res.status(200).json(gameInfo);
  } catch (err) {
    return basic500(res, err);
  }
}

export const playerAddSong = notImplemented;
export const playerRemoveSong = notImplemented;
export const playerReplaceSong = notImplemented;
export const playerChangePlaylistLink = notImplemented;
export const playerRateSong = notImplemented;
