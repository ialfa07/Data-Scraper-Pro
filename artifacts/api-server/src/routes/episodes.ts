import { Router, type IRouter } from "express";
import { eq, desc, sql, and, ne } from "drizzle-orm";
import { db, episodesTable } from "@workspace/db";
import {
  GetEpisodeResponse,
  ListEpisodesResponse,
  DeleteEpisodeParams,
  GetEpisodeParams,
  RetryEpisodeParams,
  RetryEpisodeResponse,
  ListEpisodesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/episodes", async (req, res): Promise<void> => {
  const params = ListEpisodesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { status, animeName, limit = 50, offset = 0 } = params.data;

  const conditions = [];
  if (status) conditions.push(eq(episodesTable.status, status));
  if (animeName) conditions.push(eq(episodesTable.animeName, animeName));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [episodes, countResult] = await Promise.all([
    db
      .select()
      .from(episodesTable)
      .where(whereClause)
      .orderBy(desc(episodesTable.createdAt))
      .limit(limit ?? 50)
      .offset(offset ?? 0),
    db
      .select({ count: sql<number>`count(*)` })
      .from(episodesTable)
      .where(whereClause),
  ]);

  res.json(ListEpisodesResponse.parse({ episodes, total: Number(countResult[0]?.count ?? 0) }));
});

router.get("/episodes/:id", async (req, res): Promise<void> => {
  const params = GetEpisodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [episode] = await db
    .select()
    .from(episodesTable)
    .where(eq(episodesTable.id, params.data.id));

  if (!episode) {
    res.status(404).json({ error: "Episode not found" });
    return;
  }

  res.json(GetEpisodeResponse.parse(episode));
});

router.delete("/episodes/:id", async (req, res): Promise<void> => {
  const params = DeleteEpisodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(episodesTable)
    .where(eq(episodesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Episode not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/episodes/:id/retry", async (req, res): Promise<void> => {
  const params = RetryEpisodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [episode] = await db
    .update(episodesTable)
    .set({ status: "pending", errorMessage: null, updatedAt: new Date() })
    .where(
      and(
        eq(episodesTable.id, params.data.id),
        ne(episodesTable.status, "sent"),
      )
    )
    .returning();

  if (!episode) {
    res.status(404).json({ error: "Episode not found or already sent" });
    return;
  }

  res.json(RetryEpisodeResponse.parse(episode));
});

export default router;
