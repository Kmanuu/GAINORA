import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL }));
app.use(express.json());

// --- Rutas ---
app.use("/api/auth", authRoutes);
// app.use("/api/v1/projects", projectRoutes);
// app.use("/api/v1/time-entries", timeEntryRoutes);
// app.use("/api/v1/fixed-costs", fixedCostRoutes);
// app.use("/api/v1/variable-costs", varCostRoutes);
// app.use("/api/v1/dashboard", dashboardRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`HorasPRO API running on http://localhost:${env.PORT}`);
});
