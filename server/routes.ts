import express from "express";
import type { Request, Response } from "express";
import {
  getAdminCurriculumDetail,
  getAdventureBundles,
  getAdventureTrailData,
  getContentStatus,
  getDenProfile,
  getWorkspace,
  getRank,
  listAdventuresForRank,
  listDenProfiles,
  listRequirementsForAdventureIds,
  listAdminCurriculumItems,
  listSavedPlansForDen,
  saveAdminCurriculumRecord,
  saveMeetingPlan,
  saveMeetingRecap
} from "./db.js";
import { buildMeetingPlan, swapMeetingActivity } from "../planner/buildMeetingPlan.js";
import { generateOpeningScript } from "./openai.js";
import type {
  AdminCurriculumWrite,
  ActivitySwapRequest,
  OpeningGenerationRequest,
  MeetingPlan,
  MeetingRequest,
  CurriculumEntityType,
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

apiRouter.get("/admin/curriculum", (_req, res) => {
  res.json({ items: listAdminCurriculumItems() });
});

apiRouter.get("/admin/curriculum/:entity/:id", (req, res) => {
  const entity = req.params.entity as CurriculumEntityType;
  if (!["ranks", "adventures", "requirements", "activities"].includes(entity)) {
    res.status(400).json({ error: "Invalid curriculum entity" });
    return;
  }
  const detail = getAdminCurriculumDetail(entity, req.params.id);
  if (!detail) {
    res.status(404).json({ error: "Curriculum record not found" });
    return;
  }
  res.json(detail);
});

apiRouter.post("/admin/curriculum/:entity", express.json(), (req: Request, res: Response) => {
  const input = req.body as AdminCurriculumWrite;
  const entity = req.params.entity as CurriculumEntityType;
  if (!["ranks", "adventures", "requirements", "activities"].includes(entity) || input.entityType !== entity) {
    res.status(400).json({ error: "Invalid curriculum entity" });
    return;
  }
  try {
    const saved = saveAdminCurriculumRecord(input);
    if (!saved) {
      res.status(404).json({ error: "Curriculum record not found" });
      return;
    }
    res.json(saved);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Unable to save curriculum record" });
  }
});

apiRouter.get("/dens/:denId/adventures", (req, res) => {
  const den = getDenProfile(req.params.denId);
  if (!den) {
    res.status(404).json({ error: "Den not found" });
    return;
  }
  res.json(listAdventuresForRank(den.rankId));
});

apiRouter.get("/dens/:denId/adventure-trail", (req, res) => {
  const trail = getAdventureTrailData(req.params.denId);
  if (!trail) {
    res.status(404).json({ error: "Den not found" });
    return;
  }
  res.json(trail);
});

apiRouter.get("/dens/:denId/requirements", (req, res) => {
  const den = getDenProfile(req.params.denId);
  if (!den) {
    res.status(404).json({ error: "Den not found" });
    return;
  }
  const rawIds = String(req.query.adventureIds ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  res.json(listRequirementsForAdventureIds(rawIds));
});

apiRouter.get("/dens/:denId/saved-plans", (req, res) => {
  res.json(listSavedPlansForDen(req.params.denId));
});

apiRouter.post("/plans/generate", express.json(), (req: Request, res: Response) => {
  const request = req.body as MeetingRequest;
  const den = getDenProfile(request.denId);
  const rank = getRank(request.rankId);
  const bundles = getAdventureBundles(request.adventureIds);
  if (!den || !rank || bundles.length === 0) {
    res.status(404).json({ error: "Den, rank, or adventures not found" });
    return;
  }
  res.json(buildMeetingPlan(den, rank, bundles, request));
});

apiRouter.post("/plans/save", express.json(), (req: Request, res: Response) => {
  const input = req.body as SaveMeetingPlanRequest;
  res.json(saveMeetingPlan(input));
});

apiRouter.post("/plans/swap", express.json(), (req: Request, res: Response) => {
  const { plan, selectedActivityId, agendaItemId } = req.body as ActivitySwapRequest;
  const den = getDenProfile(plan.denId);
  const rank = getRank(plan.rank.id);
  const bundles = getAdventureBundles(plan.adventures.map((adventure) => adventure.id));
  if (!den || !rank || bundles.length === 0) {
    res.status(404).json({ error: "Den, rank, or adventures not found" });
    return;
  }
  res.json(swapMeetingActivity(den, rank, bundles, plan, agendaItemId, selectedActivityId));
});

apiRouter.post("/plans/opening", express.json(), async (req: Request, res: Response) => {
  const { prompt } = req.body as OpeningGenerationRequest;
  if (!prompt?.id || !prompt?.version || !prompt?.variables) {
    res.status(400).json({ error: "Opening prompt is required" });
    return;
  }

  try {
    const result = await generateOpeningScript({ prompt });
    res.json(result);
  } catch (error) {
    res.status(503).json({
      error: error instanceof Error ? error.message : "Unable to generate opening right now."
    });
  }
});

apiRouter.post("/plans/recap", express.json(), (req: Request, res: Response) => {
  const input = req.body as SaveRecapRequest;
  res.json(saveMeetingRecap(input));
});