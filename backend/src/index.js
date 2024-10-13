const express = require("express");
const cors = require("cors");
const Joi = require("joi");
const crypto = require("crypto");

const db = require("./database");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

function generateCode(resultLen = 14) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(resultLen);

  let result = "";
  for (let i = 0; i < resultLen; i++) {
    result += chars[bytes[i] % chars.length];
  }

  return result;
}

app.get("/game/:code", (req, res) => {
  const { code } = req.params;
  const { error, value } = Joi.string()
    .pattern(/^M[a-zA-Z0-9]+$/)
    .required().validate(code);
  if (error) {
    res.status(400).json({ error: `${error.details[0].message}` });
    return;
  }

  try {
    if (!db.hasGame(code)) {
      res
        .status(404)
        .json({ error: `No game found with master code "${code}"` });
      return;
    }

    const game = db.getGame(code);

    const response = {
      masterCode: game.masterCode,
      status: game.status,
      playerCount: game.playerCount,
      songsPerPlaylist: game.songsPerPlaylist,
      players: game.players,
      playlists: game.playlists,
    };
    res.status(200).json(response);
    return;
  } catch (err) {
    res.status(500).json({ error: `${err}` });
    return;
  }
});

app.post("/game/new", (req, res) => {
  const schema = Joi.object({
    playerNames: Joi.array()
      .min(1)
      .items(Joi.string().min(1).alphanum())
      .unique()
      .required(),

    songsPerPlaylist: Joi.number().integer().greater(0).required(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ error: `${error.details[0].message}` });
    return;
  }

  const { playerNames, songsPerPlaylist } = value;

  const masterCode = "M" + generateCode();
  const players = playerNames.map((playerName) => ({
    playerName,
    playerCode: "P" + generateCode(),
  }));

  try {
    db.createGame(masterCode, songsPerPlaylist, players);
  } catch (err) {
    res.status(500).json({ error: `${err}` });
    return;
  }

  res.status(201).json({
    masterCode,
    players,
  });
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
