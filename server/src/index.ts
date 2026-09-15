import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { errorHandler } from "./middleware/error-handler.js";
import { authRoutes } from "./modules/auth/routes.js";
import { teamsRoutes } from "./modules/teams/routes.js";
import { tasksRoutes } from "./modules/tasks/routes.js";
import { commentsRoutes } from "./modules/comments/routes.js";
import { mediaRoutes } from "./modules/media/routes.js";

const app = new Hono();

app.onError(errorHandler);

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/auth", authRoutes);
app.route("/teams", teamsRoutes);
app.route("/", tasksRoutes);
app.route("/", commentsRoutes);
app.route("/media", mediaRoutes);

const port = Number(process.env.PORT ?? 3000);

if (process.argv[1] === new URL(import.meta.url).pathname) {
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`Server listening on http://localhost:${info.port}`);
  });
}

export { app };
