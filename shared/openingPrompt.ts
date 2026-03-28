import type { MeetingPlan, OpeningPromptEnvelope, OpeningPromptVariables } from "./types.js";

const OPENING_PROMPT_ID = "pmpt_69c2106d04d48190804cd755b7dd99720e46c40532149d57";
const OPENING_PROMPT_VERSION = "6";

export function buildOpeningPromptVariables(plan: MeetingPlan): OpeningPromptVariables {
  const rank = plan.rank.name;
  const grade = plan.rank.grade;
  const adventures = plan.adventures.map((adventure) => adventure.name).join("\n");
  const requirements = plan.agenda
    .filter((item) => item.kind === "activity" && item.selectedActivityId && item.requirementText)
    .map((item) => `${item.requirementNumber}. ${item.requirementText}`)
    .join("\n");
  const activities = plan.agenda
    .filter((item) => item.kind === "activity" && item.selectedActivityId)
    .map((item) => {
      const selectedActivity = plan.activityLibrary.find((activity) => activity.id === item.selectedActivityId);
      const snapshot = selectedActivity?.summary || item.description;
      return `${item.title}: ${snapshot}`;
    })
    .join("\n");

  return { rank, grade, adventures, requirements, activities };
}

export function buildOpeningPromptEnvelope(plan: MeetingPlan): OpeningPromptEnvelope {
  return {
    prompt: {
      id: OPENING_PROMPT_ID,
      version: OPENING_PROMPT_VERSION,
      variables: buildOpeningPromptVariables(plan)
    }
  };
}