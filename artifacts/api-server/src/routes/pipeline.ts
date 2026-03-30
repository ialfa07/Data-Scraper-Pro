import { Router, type IRouter } from "express";
import { desc, sql, eq } from "drizzle-orm";
import { db, episodesTable, pipelineLogsTable, pipelineRunsTable } from "@workspace/db";
import {
  RunPipelineResponse,
  TriggerDownloadBody,
  TriggerDownloadResponse,
  GetPipelineStatusResponse,
  GetPipelineStatsResponse,
  GetPipelineActivityResponse,
  GetPipelineActivityQueryParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

let pipelineRunning = false;
let pipelineStartedAt: Date | null = null;

router.get("/pipeline/status", async (_req, res): Promise<void> => {
  res.json(
    GetPipelineStatusResponse.parse({
      running: pipelineRunning,
      message: pipelineRunning ? "Pipeline en cours d'exécution" : "Pipeline en veille",
      startedAt: pipelineStartedAt?.toISOString() ?? null,
    })
  );
});

router.post("/pipeline/run", async (req, res): Promise<void> => {
  if (pipelineRunning) {
    res.json(
      RunPipelineResponse.parse({
        running: true,
        message: "Pipeline déjà en cours",
        startedAt: pipelineStartedAt?.toISOString() ?? null,
      })
    );
    return;
  }

  pipelineRunning = true;
  pipelineStartedAt = new Date();

  const [run] = await db
    .insert(pipelineRunsTable)
    .values({ status: "running", trigger: "manual", episodesFound: 0, episodesDownloaded: 0, episodesFailed: 0 })
    .returning();

  await db.insert(pipelineLogsTable).values({
    level: "info",
    message: "Pipeline déclenchée manuellement via l'API",
  });

  setTimeout(async () => {
    try {
      await db.insert(pipelineLogsTable).values({
        level: "info",
        message: "Pipeline terminée (mode démo — connectez le scraper Python pour traiter de vrais épisodes)",
      });
      if (run) {
        await db
          .update(pipelineRunsTable)
          .set({ status: "completed", endedAt: new Date(), durationSeconds: 3 })
          .where(eq(pipelineRunsTable.id, run.id));
      }
    } catch (err) {
      logger.error({ err }, "Erreur lors du log de fin de pipeline");
    } finally {
      pipelineRunning = false;
      pipelineStartedAt = null;
    }
  }, 3000);

  res.json(
    RunPipelineResponse.parse({
      running: true,
      message: "Pipeline démarrée",
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

  const { animeName, season, episode, sourceUrl, quality, priority } = parsed.data;

  const existing = await db
    .select()
    .from(episodesTable)
    .where(eq(episodesTable.sourceUrl, sourceUrl));

  if (existing.length > 0) {
    res.json(
      TriggerDownloadResponse.parse({
        running: false,
        message: `Épisode déjà présent — statut: ${existing[0]!.status}`,
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
    quality: quality ?? null,
    priority: priority ?? 0,
  });

  await db.insert(pipelineLogsTable).values({
    level: "info",
    message: `Téléchargement manuel en attente : ${animeName} S${season.toString().padStart(2, "0")}E${episode.toString().padStart(2, "0")}`,
  });

  res.json(
    TriggerDownloadResponse.parse({
      running: true,
      message: `Épisode en attente : ${animeName} S${season.toString().padStart(2, "0")}E${episode.toString().padStart(2, "0")}`,
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

router.get("/pipeline/activity", async (req, res): Promise<void> => {
  const params = GetPipelineActivityQueryParams.safeParse(req.query);
  const days = params.success ? (params.data.days ?? 14) : 14;

  const result = await db.execute(sql`
    SELECT
      to_char(date_series.d, 'YYYY-MM-DD') AS date,
      COUNT(*) FILTER (WHERE e.status = 'downloaded' AND DATE(e.updated_at) = date_series.d) AS downloaded,
      COUNT(*) FILTER (WHERE e.status = 'sent' AND DATE(e.updated_at) = date_series.d) AS sent,
      COUNT(*) FILTER (WHERE e.status = 'failed' AND DATE(e.updated_at) = date_series.d) AS failed
    FROM generate_series(
      CURRENT_DATE - (${days} - 1) * INTERVAL '1 day',
      CURRENT_DATE,
      INTERVAL '1 day'
    ) AS date_series(d)
    LEFT JOIN episodes e ON DATE(e.updated_at) = date_series.d
    GROUP BY date_series.d
    ORDER BY date_series.d ASC
  `);

  const activity = (result.rows as Array<{ date: string; downloaded: string; sent: string; failed: string }>).map(
    (row) => ({
      date: row.date,
      downloaded: Number(row.downloaded),
      sent: Number(row.sent),
      failed: Number(row.failed),
    })
  );

  res.json(GetPipelineActivityResponse.parse(activity));
});

export default router;
