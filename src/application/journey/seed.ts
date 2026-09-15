import type { JourneyNodeCategory, JourneyNodeStatus, JourneyWorkspaceData } from "@/types/journey-workspace";

export function createJourneySeed(goal?: string): JourneyWorkspaceData {
  const title = goal?.trim() || "Data Analyst";
  const today = kathmanduDate();
  const nodeSeeds: Array<[JourneyNodeCategory, string, JourneyNodeStatus]> = [
      ["skills", "Excel", "completed"], ["skills", "SQL", "in_progress"], ["skills", "Python", "learning"], ["skills", "Data Visualization", "planned"], ["skills", "Statistics", "planned"],
      ["learning", "Online Courses", "learning"], ["learning", "Books", "planned"], ["learning", "Projects", "in_progress"], ["learning", "Certifications", "planned"],
      ["experience", "Personal Projects", "in_progress"], ["experience", "Volunteer / Internship", "planned"], ["experience", "Work Experience", "planned"], ["experience", "Case Studies", "planned"],
      ["goals", "Build Portfolio", "in_progress"], ["goals", "Improve SQL", "learning"], ["goals", "Learn Power BI", "planned"], ["goals", "Get a Junior Role", "planned"],
      ["resources", "Websites", "planned"], ["resources", "Tools", "learning"], ["resources", "People", "planned"], ["resources", "Notes", "in_progress"],
    ];
  return {
    focus: { id: "primary-focus", title, description: "Turn focused learning into meaningful progress.", startedAt: today, status: "active" },
    nodes: nodeSeeds.map(([category, title, status], index) => ({ id: `seed-node-${index}`, category, title, status, completed: status === "completed", ...(status === "completed" ? { completedAt: today } : {}), ...(category === "skills" ? { level: index === 0 ? "advanced" : index === 1 ? "intermediate" : "basic" } : {}) })),
    diary: [
      { id: "seed-diary-1", title: "Completed SQL Intermediate Module", body: "Learned about JOINs, GROUP BY, and aggregate functions. Practiced with real datasets.", type: "learning", entryDate: "2025-09-12", tags: ["Learning", "SQL"], nodeIds: ["seed-node-6"] },
      { id: "seed-diary-2", title: "Built First Project", body: "Created a sales dashboard using Power BI. Learned data cleaning and basic DAX.", type: "project", entryDate: "2025-09-10", tags: ["Project", "Power BI"], nodeIds: ["seed-node-12"] },
      { id: "seed-diary-3", title: "Key Takeaway", body: "Data tells a story. The better the question, the better the insight.", type: "reflection", entryDate: "2025-09-08", tags: ["Reflection", "Mindset"], nodeIds: [] },
    ],
    notes: [{ id: "seed-note-1", body: "Need to practice more SQL joins and window functions.", createdAt: "2025-09-08", pinned: true }],
    nextSteps: [{ id: "seed-step-1", title: "Complete SQL advanced course", completed: false }, { id: "seed-step-2", title: "Build a portfolio project", completed: false }, { id: "seed-step-3", title: "Apply for 5 jobs this month", completed: false }],
  };
}

function kathmanduDate() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
