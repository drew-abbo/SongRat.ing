/**
 * Returns an SQL query string and its arguments for inserting all songs in
 * `songs` into the song table for a player with a player ID `playerId`.
 * 
 * @example
 * db.query(...insertSongsQuery(body.songs, playerId))
 */
export default function insertSongsQuery(
  songs: Array<{ title: string; artist: string }>,
  playerId: number
): [string, Array<number | string>] {
  // For efficiency we're inserting all songs in one db call. This means we
  // need to generate a string like "($1, $2, $3), ($4, $5, $6)" to inject
  // into the query. We also need to generate an argument array like
  // [playerId, "title1", "artist1", playerId, "title2", "artist2"].
  let i = 0;
  let sqlArgs: Array<number | string> = [];
  let sqlArgPlaceholders: Array<string> = [];
  songs.forEach((song) => {
    sqlArgs.push(playerId, song.title, song.artist);
    sqlArgPlaceholders.push(`($${++i}, $${++i}, $${++i})`);
  });

  const retStr = `INSERT INTO songs (player_id, title, artist)
                  VALUES ${sqlArgPlaceholders.join(", ")}`;

  return [retStr, sqlArgs];
}
