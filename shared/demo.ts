import type { Activity, ActivityDirections, Adventure, DenProfile, PackWorkspace, Rank, Requirement } from "./types.js";
import { newGuid, slugify } from "./utils.js";

const rank: Rank = {
  id: newGuid(),
  name: "Lion",
  grade: "Kindergarten",
  slug: "lion",
  sourceUrl: "https://www.scouting.org/programs/cub-scouts/adventures/lion/"
};

const workspace: PackWorkspace = {
  id: newGuid(),
  name: "Pack 110 Planning Workspace"
};

const denProfiles: DenProfile[] = [
  {
    id: newGuid(),
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
    id: newGuid(),
    rankId: rank.id,
    name: "Bobcat Lion",
    slug: "bobcat-lion",
    kind: "required",
    category: "Character & Leadership",
    sourceUrl: "https://www.scouting.org/cub-scout-adventures/bobcat-lion/",
    snapshot: "The Bobcat Adventure is the first required Adventure on the trail to earn the Lion badge of rank."
  },
  {
    id: newGuid(),
    rankId: rank.id,
    name: "Fun on the Run",
    slug: "fun-on-the-run",
    kind: "required",
    category: "Personal Fitness",
    sourceUrl: "https://www.scouting.org/cub-scout-adventures/fun-on-the-run/",
    snapshot: "Fun on the Run helps Lions build healthy habits through movement and simple fitness play."
  },
  {
    id: newGuid(),
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
    id: newGuid(),
    adventureId: adventures[0].id,
    requirementNumber: 1,
    text: "Get to know the members of your den."
  },
  {
    id: newGuid(),
    adventureId: adventures[0].id,
    requirementNumber: 2,
    text: "Have your Lion adult partner or den leader read the Scout Law to you. Demonstrate your understanding of being friendly."
  },
  {
    id: newGuid(),
    adventureId: adventures[0].id,
    requirementNumber: 3,
    text: "Share a time when you have demonstrated the Cub Scout motto “Do Your Best.”"
  }
];

const funRunRequirements: Requirement[] = [
  {
    id: newGuid(),
    adventureId: adventures[1].id,
    requirementNumber: 1,
    text: "With your den, learn and demonstrate a few ways to warm up before moving."
  },
  {
    id: newGuid(),
    adventureId: adventures[1].id,
    requirementNumber: 2,
    text: "With your den, try movement games that build balance, speed, or coordination."
  }
];

const mountainRequirements: Requirement[] = [
  {
    id: newGuid(),
    adventureId: adventures[2].id,
    requirementNumber: 1,
    text: "Explore an outdoor space and talk about what you notice."
  },
  {
    id: newGuid(),
    adventureId: adventures[2].id,
    requirementNumber: 2,
    text: "Practice being prepared for a simple outdoor activity."
  }
];

const requirements: Requirement[] = [...bobcatRequirements, ...funRunRequirements, ...mountainRequirements];

const denDoodleDirections: ActivityDirections = {
  atHomeOption: null,
  before: {
    heading: "Before the meeting",
    steps: [
      { text: "Set out the boards and craft supplies.", bullets: ["Keep scraps sorted.", "Lay out one piece per scout."] }
    ]
  },
  during: {
    heading: "During the activity",
    steps: [
      {
        text: "Build the den doodle together.",
        bullets: ["Let each scout add one part.", "Pause to explain how it will be used each week."]
      }
    ]
  },
  after: {
    heading: "After the activity",
    steps: [
      { text: "Display the finished piece.", bullets: ["Use it at each meeting.", "Note who may need extra encouragement."] }
    ]
  }
};

const animalWarmupsDirections: ActivityDirections = {
  atHomeOption: null,
  before: null,
  during: {
    heading: "During the activity",
    steps: [
      {
        text: "Lead the den through a few warmup moves.",
        bullets: ["Use animal motions.", "Keep the pace brisk and cheerful."]
      }
    ]
  },
  after: {
    heading: "After the activity",
    steps: [{ text: "Finish with a quick check-in.", bullets: ["Ask what movement felt easiest.", "Remind scouts to stay hydrated."] }]
  }
};

const activities: Activity[] = [
  {
    id: newGuid(),
    adventureId: adventures[0].id,
    requirementId: bobcatRequirements[0].id,
    name: "Den Doodle Lion",
    slug: slugify("Den Doodle Lion"),
    sourceUrl: "https://www.scouting.org/cub-scout-activities/den-doodle-lion/",
    summary: "The den doodle is a craft project that can be used to track attendance, reward good behavior, and completion of requirements.",
    meetingSpace: "indoor",
    energyLevel: 2,
    supplyLevel: 4,
    prepLevel: 2,
    durationMinutes: 15,
    supplyNote: "Supply List Note: Den doodles can be made from different materials and there are several different designs. This is one example of a den doodle that can be made. It stands on its own and is four feet tall.",
    materials: ["Simple craft supplies", "Large display space"],
    directions: denDoodleDirections,
    hasAdditionalResources: true,
    previewDetails:
      "Use a den doodle to welcome scouts, track attendance, and give everyone a visible place in the den. Prep simple craft materials and leave time for each scout to add their piece."
  },
  {
    id: newGuid(),
    adventureId: adventures[0].id,
    requirementId: bobcatRequirements[0].id,
    name: "Den Flag Lion",
    slug: slugify("Den Flag Lion"),
    sourceUrl: "https://www.scouting.org/cub-scout-activities/den-flag-lion/",
    summary: "A den flag craft that helps scouts learn names and build den identity.",
    meetingSpace: "indoor",
    energyLevel: 2,
    supplyLevel: 3,
    prepLevel: 2,
    durationMinutes: 15,
    materials: ["Paper or cardstock", "Markers or crayons", "Tape or glue"],
    previewDetails:
      "Make a simple den flag together so each scout contributes a name, symbol, or color. This is a strong alternate for getting to know den members while making something the group can reuse."
  },
  {
    id: newGuid(),
    adventureId: adventures[0].id,
    requirementId: bobcatRequirements[1].id,
    name: "The Compliment Game",
    slug: slugify("The Compliment Game"),
    sourceUrl: "https://www.scouting.org/cub-scout-activities/the-compliment-game/",
    summary: "Everyone pays a compliment to each other in a game.",
    meetingSpace: "indoor",
    energyLevel: 1,
    supplyLevel: 2,
    prepLevel: 1,
    durationMinutes: 10,
    materials: ["Open circle seating", "Optional talking prompt card"],
    previewDetails:
      "Run this as a short circle game where each scout gives a compliment to another scout. It works well as a discussion-based activity with minimal supplies."
  },
  {
    id: newGuid(),
    adventureId: adventures[0].id,
    requirementId: bobcatRequirements[2].id,
    name: "When Am I Doing My Best?",
    slug: slugify("When Am I Doing My Best?"),
    sourceUrl: "https://www.scouting.org/cub-scout-activities/when-am-i-doing-my-best/",
    summary: "Activity to help Cub Scouts identify what it means to do their best.",
    meetingSpace: "indoor",
    energyLevel: 1,
    supplyLevel: 2,
    prepLevel: 1,
    durationMinutes: 10,
    materials: ["Prompt questions", "Scout Law reference"],
    previewDetails:
      "Use simple prompts to help scouts identify what doing their best looks like at school, at home, and in the den. Encourage each scout to share one example."
  },
  {
    id: newGuid(),
    adventureId: adventures[1].id,
    requirementId: funRunRequirements[0].id,
    name: "Animal Warmups",
    slug: slugify("Animal Warmups"),
    sourceUrl: "https://www.scouting.org/cub-scout-activities/animal-warmups/",
    summary: "Scouts move like animals while learning simple warm-up motions.",
    meetingSpace: "indoor-or-outdoor",
    energyLevel: 3,
    supplyLevel: 1,
    prepLevel: 1,
    durationMinutes: 10,
    supplyNote: "The activity works best with open movement space and optionally some music or a timer.",
    materials: ["Open floor space", "Optional music or timer"],
    directions: animalWarmupsDirections,
    previewDetails:
      "Lead the den through a quick series of animal-themed warmups like bear crawls, flamingo balance, and frog jumps to make stretching feel playful."
  },
  {
    id: newGuid(),
    adventureId: adventures[1].id,
    requirementId: funRunRequirements[1].id,
    name: "Balance Trail",
    slug: slugify("Balance Trail"),
    sourceUrl: "https://www.scouting.org/cub-scout-activities/balance-trail/",
    summary: "Build a simple movement course that asks scouts to balance, hop, and change direction.",
    meetingSpace: "indoor-or-outdoor",
    energyLevel: 4,
    supplyLevel: 2,
    prepLevel: 2,
    durationMinutes: 15,
    materials: ["Tape or cones", "Open floor space"],
    previewDetails:
      "Set up a short balance and movement path that lets scouts practice control, speed changes, and coordination while cheering each other on."
  },
  {
    id: newGuid(),
    adventureId: adventures[1].id,
    requirementId: funRunRequirements[1].id,
    name: "Relay Cheers",
    slug: slugify("Relay Cheers"),
    sourceUrl: "https://www.scouting.org/cub-scout-activities/relay-cheers/",
    summary: "A short relay game that mixes movement with positive den encouragement.",
    meetingSpace: "outdoor",
    energyLevel: 5,
    supplyLevel: 1,
    prepLevel: 1,
    durationMinutes: 12,
    materials: ["Outdoor running space", "Simple relay markers"],
    previewDetails:
      "Use a short relay with simple tasks and built-in cheers so scouts move quickly and celebrate one another without making the game too competitive."
  },
  {
    id: newGuid(),
    adventureId: adventures[2].id,
    requirementId: mountainRequirements[0].id,
    name: "Nature Noticing Walk",
    slug: slugify("Nature Noticing Walk"),
    sourceUrl: "https://www.scouting.org/cub-scout-activities/nature-noticing-walk/",
    summary: "Take a short walk and ask scouts to notice sounds, colors, and movement outdoors.",
    meetingSpace: "outdoor",
    energyLevel: 2,
    supplyLevel: 1,
    prepLevel: 1,
    durationMinutes: 15,
    materials: ["Outdoor space", "Optional nature cards"],
    previewDetails:
      "Walk slowly through an outdoor space and ask scouts to point out what they hear, see, and smell so they practice observation without rushing."
  },
  {
    id: newGuid(),
    adventureId: adventures[2].id,
    requirementId: mountainRequirements[1].id,
    name: "What Goes Outside?",
    slug: slugify("What Goes Outside?"),
    sourceUrl: "https://www.scouting.org/cub-scout-activities/what-goes-outside/",
    summary: "Talk through simple gear and clothing choices for a short outdoor activity.",
    meetingSpace: "indoor",
    energyLevel: 1,
    supplyLevel: 2,
    prepLevel: 1,
    durationMinutes: 10,
    materials: ["Pictures or actual gear examples"],
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