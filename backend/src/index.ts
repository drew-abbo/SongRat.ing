import express from "express";
import cors from "cors";
import joi from "joi";

import * as code from "./generate_code";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
