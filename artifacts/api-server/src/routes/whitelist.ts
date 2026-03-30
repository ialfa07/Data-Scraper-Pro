import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, animeWhitelistTable } from "@workspace/db";
import {
  ListWhitelistResponse,
  CreateWhitelistEntryBody,
  UpdateWhitelistEntryBody,
  UpdateWhitelistEntryParams,
  UpdateWhitelistEntryResponse,
  DeleteWhitelistEntryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/whitelist", async (_req, res): Promise<void> => {
  const entries = await db
    .select()
    .from(animeWhitelistTable)
    .orderBy(desc(animeWhitelistTable.priority), animeWhitelistTable.animeName);

  res.json(ListWhitelistResponse.parse(entries));
});

router.post("/whitelist", async (req, res): Promise<void> => {
  const body = CreateWhitelistEntryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { animeName, priority = 0, qualityPreference = "best", enabled = true } = body.data;

  try {
    const [entry] = await db
      .insert(animeWhitelistTable)
      .values({ animeName, priority: priority ?? 0, qualityPreference: qualityPreference ?? "best", enabled: enabled ?? true })
      .returning();

    res.status(201).json(entry);
  } catch (_e) {
    res.status(400).json({ error: "Cet anime est déjà dans la liste blanche" });
  }
});

router.patch("/whitelist/:id", async (req, res): Promise<void> => {
  const params = UpdateWhitelistEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateWhitelistEntryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  const d = body.data;
  if (d.animeName !== null && d.animeName !== undefined) updates.animeName = d.animeName;
  if (d.priority !== null && d.priority !== undefined) updates.priority = d.priority;
  if (d.qualityPreference !== null && d.qualityPreference !== undefined) updates.qualityPreference = d.qualityPreference;
  if (d.enabled !== null && d.enabled !== undefined) updates.enabled = d.enabled;

  const [updated] = await db
    .update(animeWhitelistTable)
    .set(updates)
    .where(eq(animeWhitelistTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Entrée introuvable" });
    return;
  }

  res.json(UpdateWhitelistEntryResponse.parse(updated));
});

router.delete("/whitelist/:id", async (req, res): Promise<void> => {
  const params = DeleteWhitelistEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(animeWhitelistTable)
    .where(eq(animeWhitelistTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Entrée introuvable" });
    return;
  }

  res.sendStatus(204);
});

export default router;
