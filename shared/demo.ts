import type { Activity, Adventure, DenProfile, PackWorkspace, Rank, Requirement } from "./types.js";
import { makeId, slugify } from "./utils.js";

const rank: Rank = {
  id: "lion",
  name: "Lion",
  grade: "Kindergarten",
  slug: "lion",
  sourceUrl: "https://www.scouting.org/programs/cub-scouts/adventures/lion/"
};

const workspace: PackWorkspace = {
  id: "pack-1",
  name: "Pack 110 Planning Workspace",
  planningNotes: "Internal planning space for den leaders and pack adults."
};

const denProfiles: DenProfile[] = [
  {
    id: "lion-den-1",
    workspaceId: workspace.id,
    rankId: rank.id,
    name: "Lion Den A",
    leaderName: "Den Leader",
    meetingLocation: "Pack meeting room",
    typicalMeetingDay: "Thursday"
  }
];

const adventures: Adventure[] = [
  {
    id: makeId(rank.id, "bobcat-lion"),
    rankId: rank.id,
    name: "Bobcat Lion",
    slug: "bobcat-lion",
    kind: "required",
    category: "Character & Leadership",
    sourceUrl: "https://www.scouting.org/cub-scout-adventures/bobcat-lion/",
    snapshot: "The Bobcat Adventure is the first required Adventure on the trail to earn the Lion badge of rank."
  },
  {
    id: makeId(rank.id, "fun-on-the-run"),
    rankId: rank.id,
    name: "Fun on the Run",
    slug: "fun-on-the-run",
    kind: "required",
    category: "Personal Fitness",
    sourceUrl: "https://www.scouting.org/cub-scout-adventures/fun-on-the-run/",
    snapshot: "Fun on the Run helps Lions build healthy habits through movement and simple fitness play."
  },
  {
    id: makeId(rank.id, "mountain-lion"),
    rankId: rank.id,
    name: "Mountain Lion",
    slug: "mountain-lion",
    kind: "elective",
    category: "Outdoors",
    sourceUrl: "https://www.scouting.org/cub-scout-adventures/mountain-lion/",
    snapshot: "Mountain Lion brings Lions outside for observation, movement, and simple outdoor fun."
  }
];

const bobcatRequirements: Requirement[] = [
  {
    id: makeId(adventures[0].id, "req-1"),
    adventureId: adventures[0].id,
    requirementNumber: 1,
    text: "Get to know the members of your den."
  },
  {
    id: makeId(adventures[0].id, "req-2"),
    adventureId: adventures[0].id,
    requirementNumber: 2,
    text: "Have your Lion adult partner or den leader read the Scout Law to you. Demonstrate your understanding of being friendly."
  },
  {
    id: makeId(adventures[0].id, "req-3"),
    adventureId: adventures[0].id,
    requirementNumber: 3,
    text: "Share a time when you have demonstrated the Cub Scout motto “Do Your Best.”"
  }
];

const funRunRequirements: Requirement[] = [
  {
    id: makeId(adventures[1].id, "req-1"),
    adventureId: adventures[1].id,
    requirementNumber: 1,
    text: "With your den, learn and demonstrate a few ways to warm up before moving."
  },
  {
    id: makeId(adventures[1].id, "req-2"),
    adventureId: adventures[1].id,
    requirementNumber: 2,
    text: "With your den, try movement games that build balance, speed, or coordination."
  }
];

const mountainRequirements: Requirement[] = [
  {
    id: makeId(adventures[2].id, "req-1"),
    adventureId: adventures[2].id,
    requirementNumber: 1,
    text: "Explore an outdoor space and talk about what you notice."
  },
  {
    id: makeId(adventures[2].id, "req-2"),
    adventureId: adventures[2].id,
    requirementNumber: 2,
    text: "Practice being prepared for a simple outdoor activity."
  }
];

const requirements: Requirement[] = [...bobcatRequirements, ...funRunRequirements, ...mountainRequirements];

const activities: Activity[] = [
  {
    id: makeId(adventures[0].id, "den-doodle-lion"),
    adventureId: adventures[0].id,
    requirementId: bobcatRequirements[0].id,
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
    id: makeId(adventures[0].id, "den-flag-lion"),
    adventureId: adventures[0].id,
    requirementId: bobcatRequirements[0].id,
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
    id: makeId(adventures[0].id, "the-compliment-game"),
    adventureId: adventures[0].id,
    requirementId: bobcatRequirements[1].id,
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
    id: makeId(adventures[0].id, "when-am-i-doing-my-best"),
    adventureId: adventures[0].id,
    requirementId: bobcatRequirements[2].id,
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
  },
  {
    id: makeId(adventures[1].id, "animal-warmups"),
    adventureId: adventures[1].id,
    requirementId: funRunRequirements[0].id,
    name: "Animal Warmups",
    slug: slugify("Animal Warmups"),
    sourceUrl: "https://www.scouting.org/cub-scout-activities/animal-warmups/",
    summary: "Scouts move like animals while learning simple warm-up motions.",
    location: "Indoor or Outdoor",
    prepMinutes: 5,
    durationMinutes: 10,
    difficulty: 1,
    notes: "Use this first to get energy focused before active games.",
    previewDetails:
      "Lead the den through a quick series of animal-themed warmups like bear crawls, flamingo balance, and frog jumps to make stretching feel playful."
  },
  {
    id: makeId(adventures[1].id, "balance-trail"),
    adventureId: adventures[1].id,
    requirementId: funRunRequirements[1].id,
    name: "Balance Trail",
    slug: slugify("Balance Trail"),
    sourceUrl: "https://www.scouting.org/cub-scout-activities/balance-trail/",
    summary: "Build a simple movement course that asks scouts to balance, hop, and change direction.",
    location: "Indoor or Outdoor",
    prepMinutes: 10,
    durationMinutes: 15,
    difficulty: 2,
    notes: "Tape lines on the floor or use cones outdoors.",
    previewDetails:
      "Set up a short balance and movement path that lets scouts practice control, speed changes, and coordination while cheering each other on."
  },
  {
    id: makeId(adventures[1].id, "relay-cheers"),
    adventureId: adventures[1].id,
    requirementId: funRunRequirements[1].id,
    name: "Relay Cheers",
    slug: slugify("Relay Cheers"),
    sourceUrl: "https://www.scouting.org/cub-scout-activities/relay-cheers/",
    summary: "A short relay game that mixes movement with positive den encouragement.",
    location: "Outdoor",
    prepMinutes: 5,
    durationMinutes: 12,
    difficulty: 1,
    notes: "Strong alternative when the den has room to run.",
    previewDetails:
      "Use a short relay with simple tasks and built-in cheers so scouts move quickly and celebrate one another without making the game too competitive."
  },
  {
    id: makeId(adventures[2].id, "nature-noticing-walk"),
    adventureId: adventures[2].id,
    requirementId: mountainRequirements[0].id,
    name: "Nature Noticing Walk",
    slug: slugify("Nature Noticing Walk"),
    sourceUrl: "https://www.scouting.org/cub-scout-activities/nature-noticing-walk/",
    summary: "Take a short walk and ask scouts to notice sounds, colors, and movement outdoors.",
    location: "Outdoor",
    prepMinutes: 5,
    durationMinutes: 15,
    difficulty: 1,
    notes: "Good for a calm outdoor reset.",
    previewDetails:
      "Walk slowly through an outdoor space and ask scouts to point out what they hear, see, and smell so they practice observation without rushing."
  },
  {
    id: makeId(adventures[2].id, "what-goes-outside"),
    adventureId: adventures[2].id,
    requirementId: mountainRequirements[1].id,
    name: "What Goes Outside?",
    slug: slugify("What Goes Outside?"),
    sourceUrl: "https://www.scouting.org/cub-scout-activities/what-goes-outside/",
    summary: "Talk through simple gear and clothing choices for a short outdoor activity.",
    location: "Indoor",
    prepMinutes: 5,
    durationMinutes: 10,
    difficulty: 1,
    notes: "Useful if weather moves the den indoors.",
    previewDetails:
      "Use pictures or actual gear to help scouts talk about what they should wear or carry for a simple outdoor walk, even if the conversation happens inside."
  }
];

export const demoContent = {
  workspace,
  denProfiles,
  rank,
  adventures,
  adventure: adventures[0],
  requirements,
  activities
};