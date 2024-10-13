// This simulates a database for now (until a real database is set up)

class Game {
  constructor(masterCode, songsPerPlaylist, players) {
    this.masterCode = masterCode;
    this.status = "waitingForPlaylists";
    this.songsPerPlaylist = songsPerPlaylist;
    this.players = players;
    this.playlists = players.map(() => null);
  }

  get playerCount() {
    return this.players.length;
  }
}

class Database {
  constructor() {
    this.games = new Map();
  }

  createGame(masterCode, songsPerPlaylist, players) {
    this._simulateRandomFailure();

    if (this.games.has(masterCode)) {
      throw new Error(
        `A game with the master code ${masterCode} already exists.`
      );
    }
    this.games.set(masterCode, new Game(masterCode, songsPerPlaylist, players));
  }

  hasGame(masterCode) {
    this._simulateRandomFailure();

    return this.games.has(masterCode);
  }

  getGame(masterCode) {
    this._simulateRandomFailure();

    if (this.games.has(masterCode)) {
      return this.games.get(masterCode);
    }
    throw new Error(`No game with the master code ${masterCode} exists.`);
  }

  _simulateRandomFailure() {
    if (Math.floor(Math.random() * 50) === 42) {
      throw new Error("The database failed randomly.");
    }
  }
}

module.exports = new Database();
