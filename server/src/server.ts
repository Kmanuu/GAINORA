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
import clientRoutes from "./routes/client.routes.js";
import contractRoutes from "./routes/contract.routes.js";
import issueRoutes from "./routes/issue.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import planRoutes from "./routes/plan.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import { startRollPaymentsCron } from "./jobs/rollPaymentsCron.js";

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
app.use("/api/v1/clients",   clientRoutes);
app.use("/api/v1/contracts", contractRoutes);
app.use("/api/v1/issues",    issueRoutes);
app.use("/api/v1/payments",  paymentRoutes);
app.use("/api/v1/plans",     planRoutes);
app.use("/api/v1/invoices",  invoiceRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`HorasPRO API running on http://localhost:${env.PORT}`);
  startRollPaymentsCron();
});
