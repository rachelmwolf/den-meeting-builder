import type { Activity, Adventure, Rank, Requirement } from "./types.js";
import { makeId, slugify } from "./utils.js";

const rank: Rank = {
  id: "lion",
  name: "Lion",
  grade: "Kindergarten",
  slug: "lion",
  sourceUrl: "https://www.scouting.org/programs/cub-scouts/adventures/lion/"
};

const adventure: Adventure = {
  id: makeId(rank.id, "bobcat-lion"),
  rankId: rank.id,
  name: "Bobcat Lion",
  slug: "bobcat-lion",
  kind: "required",
  category: "Character & Leadership",
  sourceUrl: "https://www.scouting.org/cub-scout-adventures/bobcat-lion/",
  snapshot:
    "The Bobcat Adventure is the first required Adventure on the trail to earn the Lion badge of rank."
};

const requirements: Requirement[] = [
  {
    id: makeId(adventure.id, "req-1"),
    adventureId: adventure.id,
    requirementNumber: 1,
    text: "Get to know the members of your den."
  },
  {
    id: makeId(adventure.id, "req-2"),
    adventureId: adventure.id,
    requirementNumber: 2,
    text: "Have your Lion adult partner or den leader read the Scout Law to you. Demonstrate your understanding of being friendly."
  },
  {
    id: makeId(adventure.id, "req-3"),
    adventureId: adventure.id,
    requirementNumber: 3,
    text: "Share with your Lion adult partner, during a den meeting or at home, a time when you have demonstrated the Cub Scout motto “Do Your Best.”"
  }
];

const activities: Activity[] = [
  {
    id: makeId(adventure.id, "den-doodle-lion"),
    adventureId: adventure.id,
    requirementId: requirements[0].id,
    name: "Den Doodle Lion",
    slug: slugify("Den Doodle Lion"),
    sourceUrl: "https://www.scouting.org/cub-scout-activities/den-doodle-lion/",
    summary: "The den doodle is a craft project that can be used to track attendance, reward good behavior, and completion of requirements.",
    location: "Indoor",
    prepMinutes: 10,
    durationMinutes: 15,
    difficulty: 2,
    notes: "Bring simple craft supplies and display the doodle where Lions can add to it.",
    previewDetails:
      "Use a den doodle to welcome scouts, track attendance, and give everyone a visible place in the den. Prep simple craft materials and leave time for each scout to add their piece."
  },
  {
    id: makeId(adventure.id, "the-compliment-game"),
    adventureId: adventure.id,
    requirementId: requirements[1].id,
    name: "The Compliment Game",
    slug: slugify("The Compliment Game"),
    sourceUrl: "https://www.scouting.org/cub-scout-activities/the-compliment-game/",
    summary: "Everyone pays a compliment to each other in a game.",
    location: "Indoor",
    prepMinutes: 5,
    durationMinutes: 10,
    difficulty: 1,
    notes: "Great for circle time and practicing friendly behavior.",
    previewDetails:
      "Run this as a short circle game where each scout gives a compliment to another scout. It works well as a discussion-based activity with minimal supplies."
  },
  {
    id: makeId(adventure.id, "den-flag-lion"),
    adventureId: adventure.id,
    requirementId: requirements[0].id,
    name: "Den Flag Lion",
    slug: slugify("Den Flag Lion"),
    sourceUrl: "https://www.scouting.org/cub-scout-activities/den-flag-lion/",
    summary: "A den flag craft that helps scouts learn names and build den identity.",
    location: "Indoor",
    prepMinutes: 10,
    durationMinutes: 15,
    difficulty: 2,
    notes: "Good alternate for requirement 1 if the den wants a collaborative craft.",
    previewDetails:
      "Make a simple den flag together so each scout contributes a name, symbol, or color. This is a strong alternate for getting to know den members while making something the group can reuse."
  },
  {
    id: makeId(adventure.id, "when-am-i-doing-my-best"),
    adventureId: adventure.id,
    requirementId: requirements[2].id,
    name: "When Am I Doing My Best?",
    slug: slugify("When Am I Doing My Best?"),
    sourceUrl: "https://www.scouting.org/cub-scout-activities/when-am-i-doing-my-best/",
    summary: "Activity to help Cub Scouts identify what it means to do their best.",
    location: "Indoor",
    prepMinutes: 5,
    durationMinutes: 10,
    difficulty: 1,
    notes: "Invite each scout to share one example from school or home.",
    previewDetails:
      "Use simple prompts to help scouts identify what doing their best looks like at school, at home, and in the den. Encourage each scout to share one example."
  }
];

export const demoContent = {
  rank,
  adventure,
  requirements,
  activities
};