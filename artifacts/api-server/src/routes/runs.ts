import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, pipelineRunsTable } from "@workspace/db";
import {
  ListRunsResponse,
  ListRunsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/runs", async (req, res): Promise<void> => {
  const params = ListRunsQueryParams.safeParse(req.query);
  const limit = params.success ? (params.data.limit ?? 50) : 50;

  const runs = await db
    .select()
    .from(pipelineRunsTable)
    .orderBy(desc(pipelineRunsTable.startedAt))
    .limit(limit);

  res.json(ListRunsResponse.parse(runs));
});

export default router;
