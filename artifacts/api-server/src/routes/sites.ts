import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, animeSitesTable } from "@workspace/db";
import {
  CreateSiteBody,
  UpdateSiteBody,
  UpdateSiteParams,
  UpdateSiteResponse,
  DeleteSiteParams,
  ListSitesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/sites", async (_req, res): Promise<void> => {
  const sites = await db.select().from(animeSitesTable);
  res.json(ListSitesResponse.parse(sites));
});

router.post("/sites", async (req, res): Promise<void> => {
  const parsed = CreateSiteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [site] = await db
    .insert(animeSitesTable)
    .values({
      name: parsed.data.name,
      baseUrl: parsed.data.baseUrl,
      scraperType: parsed.data.scraperType,
      enabled: parsed.data.enabled ?? true,
      requiresJs: parsed.data.requiresJs ?? false,
    })
    .returning();

  res.status(201).json(site);
});

router.patch("/sites/:id", async (req, res): Promise<void> => {
  const params = UpdateSiteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSiteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<typeof animeSitesTable.$inferInsert> = {};
  if (parsed.data.name !== null && parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.baseUrl !== null && parsed.data.baseUrl !== undefined) updateData.baseUrl = parsed.data.baseUrl;
  if (parsed.data.enabled !== null && parsed.data.enabled !== undefined) updateData.enabled = parsed.data.enabled;
  if (parsed.data.requiresJs !== null && parsed.data.requiresJs !== undefined) updateData.requiresJs = parsed.data.requiresJs;
  if (parsed.data.scraperType !== null && parsed.data.scraperType !== undefined) updateData.scraperType = parsed.data.scraperType;

  const [site] = await db
    .update(animeSitesTable)
    .set(updateData)
    .where(eq(animeSitesTable.id, params.data.id))
    .returning();

  if (!site) {
    res.status(404).json({ error: "Site not found" });
    return;
  }

  res.json(UpdateSiteResponse.parse(site));
});

router.delete("/sites/:id", async (req, res): Promise<void> => {
  const params = DeleteSiteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(animeSitesTable)
    .where(eq(animeSitesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Site not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
