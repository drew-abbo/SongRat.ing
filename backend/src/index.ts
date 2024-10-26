import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";

import * as code from "./code";
import { validateBodyOnSchemaMiddleware } from "./schemas";

dotenv.config();
const PORT = 3000;
const app = express();

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
  "/admin/review/:admin_code",
  code.createValidatorMiddleware(code.Kind.ADMIN),
  validateBodyOnSchemaMiddleware,
  (req: Request, res: Response) => {
    return res.status(200).json({ hello: "world" });
  }
);

app.post(
  "/admin/begin/:admin_code",
  code.createValidatorMiddleware(code.Kind.ADMIN),
  validateBodyOnSchemaMiddleware,
  (req: Request, res: Response) => {
    return res.status(201).json({ hello: "world" });
  }
);

app.post(
  "/admin/end/:admin_code",
  code.createValidatorMiddleware(code.Kind.ADMIN),
  validateBodyOnSchemaMiddleware,
  (req: Request, res: Response) => {
    return res.status(201).json({ hello: "world" });
  }
);

app.post(
  "/admin/remove_player/:admin_code",
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

// 404 handler (deals with every other path)
app.use((req: Request, res: Response) => {
  return res.status(404).json({ message: "Resource not found" });
});

// translate any error responses from HTML to JSON
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // if status unset use 500 error code
  return res
    .status(err.status || 500)
    .json({ message: err.message || "Unknown error" });
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
