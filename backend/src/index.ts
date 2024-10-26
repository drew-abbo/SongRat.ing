import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

import * as code from "./code";
import { validateBodyOnSchemaMiddleware } from "./schemas";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// /game

app.post(
  "/game/new",
  validateBodyOnSchemaMiddleware,
  (req: Request, res: Response) => {
    return res.status(201).json({ hello: "world" });
  }
);

app.get(
  "/game/peek/:invite_code",
  code.createValidatorMiddleware(code.Kind.INVITE),
  validateBodyOnSchemaMiddleware,
  (req: Request, res: Response) => {
    return res.status(200).json({ hello: "world" });
  }
);

app.post(
  "/game/join/:invite_code",
  code.createValidatorMiddleware(code.Kind.INVITE),
  validateBodyOnSchemaMiddleware,
  (req: Request, res: Response) => {
    return res.status(201).json({ hello: "world" });
  }
);

// /admin

app.get(
  "/admin/review/:master_code",
  code.createValidatorMiddleware(code.Kind.ADMIN),
  validateBodyOnSchemaMiddleware,
  (req: Request, res: Response) => {
    return res.status(200).json({ hello: "world" });
  }
);

app.post(
  "/admin/begin/:master_code",
  code.createValidatorMiddleware(code.Kind.ADMIN),
  validateBodyOnSchemaMiddleware,
  (req: Request, res: Response) => {
    return res.status(201).json({ hello: "world" });
  }
);

app.post(
  "/admin/end/:master_code",
  code.createValidatorMiddleware(code.Kind.ADMIN),
  validateBodyOnSchemaMiddleware,
  (req: Request, res: Response) => {
    return res.status(201).json({ hello: "world" });
  }
);

app.post(
  "/admin/remove_player/:master_code",
  code.createValidatorMiddleware(code.Kind.ADMIN),
  validateBodyOnSchemaMiddleware,
  (req: Request, res: Response) => {
    return res.status(201).json({ hello: "world" });
  }
);

// /player

app.get(
  "/player/review/:player_code",
  code.createValidatorMiddleware(code.Kind.PLAYER),
  validateBodyOnSchemaMiddleware,
  (req: Request, res: Response) => {
    return res.status(200).json({ hello: "world" });
  }
);

app.post(
  "/player/add_song/:player_code",
  code.createValidatorMiddleware(code.Kind.PLAYER),
  validateBodyOnSchemaMiddleware,
  (req: Request, res: Response) => {
    return res.status(201).json({ hello: "world" });
  }
);

app.post(
  "/player/remove_song/:player_code",
  code.createValidatorMiddleware(code.Kind.PLAYER),
  validateBodyOnSchemaMiddleware,
  (req: Request, res: Response) => {
    return res.status(201).json({ hello: "world" });
  }
);

app.post(
  "/player/replace_song/:player_code",
  code.createValidatorMiddleware(code.Kind.PLAYER),
  validateBodyOnSchemaMiddleware,
  (req: Request, res: Response) => {
    return res.status(201).json({ hello: "world" });
  }
);

app.post(
  "/player/change_playlist_link/:player_code",
  code.createValidatorMiddleware(code.Kind.PLAYER),
  validateBodyOnSchemaMiddleware,
  (req: Request, res: Response) => {
    return res.status(201).json({ hello: "world" });
  }
);

app.post(
  "/player/rate_song/:player_code",
  code.createValidatorMiddleware(code.Kind.PLAYER),
  validateBodyOnSchemaMiddleware,
  (req: Request, res: Response) => {
    return res.status(201).json({ hello: "world" });
  }
);

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
