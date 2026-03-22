import express from "express";
import type { Request, Response } from "express";
import {
  buildYearPlan,
  duplicateMeetingPlan,
  getAdventureBundle,
  getContentStatus,
  getDenProfile,
  getWorkspace,
  getRank,
  listAdventuresForRank,
  listDenProfiles,
  listSavedPlansForDen,
  saveMeetingPlan,
  saveMeetingRecap
} from "./db.js";
import { buildMeetingPlan, swapMeetingActivity } from "../planner/buildMeetingPlan.js";
import type {
  ActivitySwapRequest,
  MeetingPlan,
  MeetingRequest,
  SaveMeetingPlanRequest,
  SaveRecapRequest
} from "../shared/types.js";

export const apiRouter = express.Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true });
});

apiRouter.get("/workspace", (_req, res) => {
  res.json(getWorkspace());
});

apiRouter.get("/dens", (_req, res) => {
  res.json(listDenProfiles());
});

apiRouter.get("/content-status", (_req, res) => {
  res.json(getContentStatus());
});

apiRouter.get("/dens/:denId/adventures", (req, res) => {
  const den = getDenProfile(req.params.denId);
  if (!den) {
    res.status(404).json({ error: "Den not found" });
    return;
  }
  res.json(listAdventuresForRank(den.rankId));
});

apiRouter.get("/dens/:denId/year-plan", (req, res) => {
  const yearPlan = buildYearPlan(req.params.denId);
  if (!yearPlan) {
    res.status(404).json({ error: "Den not found" });
    return;
  }
  res.json(yearPlan);
});

apiRouter.get("/dens/:denId/saved-plans", (req, res) => {
  res.json(listSavedPlansForDen(req.params.denId));
});

apiRouter.post("/plans/generate", express.json(), (req: Request, res: Response) => {
  const request = req.body as MeetingRequest;
  const den = getDenProfile(request.denId);
  const rank = getRank(request.rankId);
  const bundle = getAdventureBundle(request.adventureId);
  if (!den || !rank || !bundle) {
    res.status(404).json({ error: "Den, rank, or adventure not found" });
    return;
  }
  res.json(buildMeetingPlan(den, rank, bundle, request));
});

apiRouter.post("/plans/save", express.json(), (req: Request, res: Response) => {
  const input = req.body as SaveMeetingPlanRequest;
  res.json(saveMeetingPlan(input));
});

apiRouter.post("/plans/swap", express.json(), (req: Request, res: Response) => {
  const { plan, selectedActivityId, agendaItemId } = req.body as ActivitySwapRequest;
  const den = getDenProfile(plan.denId);
  const rank = getRank(plan.rank.id);
  const bundle = getAdventureBundle(plan.adventure.id);
  if (!den || !rank || !bundle) {
    res.status(404).json({ error: "Den, rank, or adventure not found" });
    return;
  }
  res.json(swapMeetingActivity(den, rank, bundle, plan, agendaItemId, selectedActivityId));
});

apiRouter.post("/plans/recap", express.json(), (req: Request, res: Response) => {
  const input = req.body as SaveRecapRequest;
  res.json(saveMeetingRecap(input));
});

apiRouter.post("/plans/:savedPlanId/duplicate", express.json(), (req: Request, res: Response) => {
  const { monthKey, monthLabel, theme } = req.body as { monthKey: string; monthLabel: string; theme: string };
  const savedPlan = duplicateMeetingPlan(String(req.params.savedPlanId), monthKey, monthLabel, theme);
  if (!savedPlan) {
    res.status(404).json({ error: "Saved plan not found" });
    return;
  }
  res.json(savedPlan);
});