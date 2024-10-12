const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 3000;

app.use(cors());

const users = [
  { name: "bob", email: "bob@gmail.com" },
  { name: "alice", email: "alice@gmail.com" },
];

app.get("/users", (req, res) => {
  return res.json(users);
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
