import express from "express";
import type { Request, Response } from "express";
import {
  buildYearPlanOutline,
  getAdventureBundle,
  getRank,
  listAdventuresForRank,
  listRanks,
  listSavedPlansForRank,
  saveMeetingPlan
} from "./db.js";
import { buildMeetingPlan, swapMeetingActivity } from "../planner/buildMeetingPlan.js";
import type { ActivitySwapRequest, MeetingPlan, MeetingRequest } from "../shared/types.js";

export const apiRouter = express.Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true });
});

apiRouter.get("/ranks", (_req, res) => {
  res.json(listRanks());
});

apiRouter.get("/ranks/:rankId/adventures", (req, res) => {
  res.json(listAdventuresForRank(req.params.rankId));
});

apiRouter.get("/ranks/:rankId/year-plan", (req, res) => {
  const outline = buildYearPlanOutline(req.params.rankId);
  if (!outline) {
    res.status(404).json({ error: "Rank not found" });
    return;
  }
  res.json(outline);
});

apiRouter.get("/ranks/:rankId/saved-plans", (req, res) => {
  res.json(listSavedPlansForRank(req.params.rankId));
});

apiRouter.post("/plans/generate", express.json(), (req: Request, res: Response) => {
  const request = req.body as MeetingRequest;
  const rank = getRank(request.rankId);
  const bundle = getAdventureBundle(request.adventureId);
  if (!rank || !bundle) {
    res.status(404).json({ error: "Rank or adventure not found" });
    return;
  }
  const plan = buildMeetingPlan(rank, bundle, request);
  res.json(plan);
});

apiRouter.post("/plans/save", express.json(), (req: Request, res: Response) => {
  const { title, plannedDate, payload } = req.body as {
    title: string;
    plannedDate: string | null;
    payload: MeetingPlan;
  };
  const savedPlan = saveMeetingPlan(title, plannedDate, payload);
  res.json(savedPlan);
});

apiRouter.post("/plans/swap", express.json(), (req: Request, res: Response) => {
  const { plan, selectedActivityId, agendaItemId } = req.body as ActivitySwapRequest;
  const rank = getRank(plan.rank.id);
  const bundle = getAdventureBundle(plan.adventure.id);
  if (!rank || !bundle) {
    res.status(404).json({ error: "Rank or adventure not found" });
    return;
  }
  const nextPlan = swapMeetingActivity(rank, bundle, plan, agendaItemId, selectedActivityId);
  res.json(nextPlan);
});