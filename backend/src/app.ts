import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

import * as gameRoutes from "./routes/game";
import * as adminRoutes from "./routes/admin";
import * as playerRoutes from "./routes/player";

export const app = express();

app.use(cors());
app.use(express.json());

// mount all defined routes
app.use("/game", gameRoutes.routes);
app.use("/admin", adminRoutes.routes);
app.use("/player", playerRoutes.routes);

// checkHealth operation
app.get("/", (req: Request, res: Response) => {
  return res.status(200).json({ message: "The server is up and running" });
});

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
