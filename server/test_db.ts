import { env } from "./src/config/env.js";
import prisma from "./src/lib/prisma.js";

async function test() {
  try {
    const clients = await prisma.client.findMany({
      where: { tenantId: "1f276287-d642-4d7a-8917-2a7fe94a585c" },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { contracts: true } },
      },
    });
    console.log(clients);
  } catch (err) {
    console.error("DB Error:", err);
  }
}
test();
