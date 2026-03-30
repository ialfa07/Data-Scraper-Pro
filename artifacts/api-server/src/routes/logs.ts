import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, pipelineLogsTable } from "@workspace/db";
import { ListLogsResponse, ListLogsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/logs", async (req, res): Promise<void> => {
  const params = ListLogsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { level, limit = 100 } = params.data;

  const query = db
    .select()
    .from(pipelineLogsTable)
    .orderBy(desc(pipelineLogsTable.createdAt))
    .limit(limit ?? 100);

  const logs = level
    ? await query.where(eq(pipelineLogsTable.level, level))
    : await query;

  res.json(ListLogsResponse.parse(logs));
});

export default router;
