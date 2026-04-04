import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import fixedCostRoutes from "./routes/fixedCost.routes.js";
import projectRoutes from "./routes/project.routes.js";
import timeEntryRoutes from "./routes/timeEntry.routes.js";
import varCostRoutes from "./routes/varCost.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import meRoutes        from "./routes/me.routes.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL }));
app.use(express.json());

// --- Rutas ---
app.use("/api/auth", authRoutes);
app.use("/api/v1/fixed-costs", fixedCostRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/time-entries", timeEntryRoutes);
app.use("/api/v1/variable-costs", varCostRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/me",        meRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`HorasPRO API running on http://localhost:${env.PORT}`);
});
