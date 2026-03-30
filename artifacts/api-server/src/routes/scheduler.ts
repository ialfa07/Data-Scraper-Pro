import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, schedulerConfigTable } from "@workspace/db";
import {
  GetSchedulerResponse,
  UpdateSchedulerBody,
  UpdateSchedulerResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/scheduler", async (_req, res): Promise<void> => {
  let [config] = await db.select().from(schedulerConfigTable).limit(1);

  if (!config) {
    [config] = await db
      .insert(schedulerConfigTable)
      .values({
        enabled: false,
        intervalMinutes: 60,
        notifyOnError: true,
        defaultQuality: "best",
        useWhitelist: false,
      })
      .returning();
  }

  res.json(GetSchedulerResponse.parse(config));
});

router.patch("/scheduler", async (req, res): Promise<void> => {
  const body = UpdateSchedulerBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  let [config] = await db.select().from(schedulerConfigTable).limit(1);

  if (!config) {
    [config] = await db
      .insert(schedulerConfigTable)
      .values({
        enabled: false,
        intervalMinutes: 60,
        notifyOnError: true,
        defaultQuality: "best",
        useWhitelist: false,
      })
      .returning();
  }

  const updates: Record<string, unknown> = {};
  const d = body.data;
  if (d.enabled !== null && d.enabled !== undefined) updates.enabled = d.enabled;
  if (d.intervalMinutes !== null && d.intervalMinutes !== undefined) updates.intervalMinutes = d.intervalMinutes;
  if (d.discordWebhookUrl !== undefined) updates.discordWebhookUrl = d.discordWebhookUrl;
  if (d.notifyOnError !== null && d.notifyOnError !== undefined) updates.notifyOnError = d.notifyOnError;
  if (d.defaultQuality !== null && d.defaultQuality !== undefined) updates.defaultQuality = d.defaultQuality;
  if (d.useWhitelist !== null && d.useWhitelist !== undefined) updates.useWhitelist = d.useWhitelist;

  if (d.enabled && d.intervalMinutes) {
    const nextRun = new Date();
    nextRun.setMinutes(nextRun.getMinutes() + (d.intervalMinutes ?? config.intervalMinutes));
    updates.nextRunAt = nextRun;
  }

  const [updated] = await db
    .update(schedulerConfigTable)
    .set(updates)
    .where(eq(schedulerConfigTable.id, config.id))
    .returning();

  res.json(UpdateSchedulerResponse.parse(updated));
});

export default router;
