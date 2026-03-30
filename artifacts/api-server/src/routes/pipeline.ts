import { Router, type IRouter } from "express";
import { desc, sql, eq } from "drizzle-orm";
import { db, episodesTable, pipelineLogsTable, insertEpisodeSchema } from "@workspace/db";
import {
  RunPipelineResponse,
  TriggerDownloadBody,
  TriggerDownloadResponse,
  GetPipelineStatusResponse,
  GetPipelineStatsResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

let pipelineRunning = false;
let pipelineStartedAt: Date | null = null;

router.get("/pipeline/status", async (_req, res): Promise<void> => {
  res.json(
    GetPipelineStatusResponse.parse({
      running: pipelineRunning,
      message: pipelineRunning ? "Pipeline is running" : "Pipeline is idle",
      startedAt: pipelineStartedAt?.toISOString() ?? null,
    })
  );
});

router.post("/pipeline/run", async (req, res): Promise<void> => {
  if (pipelineRunning) {
    res.json(
      RunPipelineResponse.parse({
        running: true,
        message: "Pipeline is already running",
        startedAt: pipelineStartedAt?.toISOString() ?? null,
      })
    );
    return;
  }

  pipelineRunning = true;
  pipelineStartedAt = new Date();

  await db.insert(pipelineLogsTable).values({
    level: "info",
    message: "Pipeline manually triggered via API",
  });

  setTimeout(async () => {
    try {
      await db.insert(pipelineLogsTable).values({
        level: "info",
        message: "Pipeline run completed (demo mode — connect Python scraper to process real episodes)",
      });
    } catch (err) {
      logger.error({ err }, "Failed to log pipeline completion");
    } finally {
      pipelineRunning = false;
      pipelineStartedAt = null;
    }
  }, 3000);

  res.json(
    RunPipelineResponse.parse({
      running: true,
      message: "Pipeline started",
      startedAt: pipelineStartedAt.toISOString(),
    })
  );
});

router.post("/pipeline/download", async (req, res): Promise<void> => {
  const parsed = TriggerDownloadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { animeName, season, episode, sourceUrl } = parsed.data;

  const existing = await db
    .select()
    .from(episodesTable)
    .where(eq(episodesTable.sourceUrl, sourceUrl));

  if (existing.length > 0) {
    res.json(
      TriggerDownloadResponse.parse({
        running: false,
        message: `Episode already exists with status: ${existing[0]!.status}`,
      })
    );
    return;
  }

  await db.insert(episodesTable).values({
    animeName,
    season,
    episode,
    sourceUrl,
    status: "pending",
  });

  await db.insert(pipelineLogsTable).values({
    level: "info",
    message: `Manual download queued: ${animeName} S${season.toString().padStart(2, "0")}E${episode.toString().padStart(2, "0")}`,
  });

  res.json(
    TriggerDownloadResponse.parse({
      running: true,
      message: `Episode queued: ${animeName} S${season.toString().padStart(2, "0")}E${episode.toString().padStart(2, "0")}`,
    })
  );
});

router.get("/pipeline/stats", async (_req, res): Promise<void> => {
  const [counts] = await db
    .select({
      total: sql<number>`count(*)`,
      pending: sql<number>`count(*) filter (where status = 'pending')`,
      downloading: sql<number>`count(*) filter (where status = 'downloading')`,
      downloaded: sql<number>`count(*) filter (where status = 'downloaded')`,
      sending: sql<number>`count(*) filter (where status = 'sending')`,
      sent: sql<number>`count(*) filter (where status = 'sent')`,
      failed: sql<number>`count(*) filter (where status = 'failed')`,
      totalAnimes: sql<number>`count(distinct anime_name)`,
    })
    .from(episodesTable);

  const recentActivity = await db
    .select()
    .from(episodesTable)
    .orderBy(desc(episodesTable.updatedAt))
    .limit(10);

  res.json(
    GetPipelineStatsResponse.parse({
      total: Number(counts?.total ?? 0),
      pending: Number(counts?.pending ?? 0),
      downloading: Number(counts?.downloading ?? 0),
      downloaded: Number(counts?.downloaded ?? 0),
      sending: Number(counts?.sending ?? 0),
      sent: Number(counts?.sent ?? 0),
      failed: Number(counts?.failed ?? 0),
      totalAnimes: Number(counts?.totalAnimes ?? 0),
      recentActivity,
    })
  );
});

export default router;
