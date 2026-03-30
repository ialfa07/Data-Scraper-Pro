import { Router, type IRouter } from "express";
import healthRouter from "./health";
import episodesRouter from "./episodes";
import pipelineRouter from "./pipeline";
import sitesRouter from "./sites";
import logsRouter from "./logs";
import runsRouter from "./runs";
import schedulerRouter from "./scheduler";
import whitelistRouter from "./whitelist";

const router: IRouter = Router();

router.use(healthRouter);
router.use(episodesRouter);
router.use(pipelineRouter);
router.use(sitesRouter);
router.use(logsRouter);
router.use(runsRouter);
router.use(schedulerRouter);
router.use(whitelistRouter);

export default router;
