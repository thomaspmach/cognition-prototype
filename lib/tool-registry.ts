export type ToolId = "kyc" | "refunds" | "feature-flags";
export type WorkspaceRole = "viewer" | "reviewer";

type ToolMetadata = {
  id: ToolId;
  name: string;
  description: string;
  responsibleTeam: string;
  accessRequirements: readonly WorkspaceRole[];
};

export type WorkspaceTool = ToolMetadata &
  (
    | { availability: "foundation" | "available"; route: `/tools/${string}` }
    | { availability: "preview"; route: null }
  );

export const toolRegistry = [
  {
    id: "kyc",
    name: "KYC Case Review",
    description: "Review onboarding cases, assign reviewers and record decisions.",
    responsibleTeam: "Compliance",
    accessRequirements: ["viewer", "reviewer"],
    availability: "available",
    route: "/tools/kyc",
  },
  {
    id: "refunds",
    name: "Refunds Dashboard",
    description: "A planned view of refund requests and resolution activity.",
    responsibleTeam: "Operations",
    accessRequirements: ["viewer", "reviewer"],
    availability: "preview",
    route: null,
  },
  {
    id: "feature-flags",
    name: "Feature Flag Admin",
    description: "A planned home for feature rollouts and release configuration.",
    responsibleTeam: "Engineering",
    accessRequirements: ["reviewer"],
    availability: "preview",
    route: null,
  },
] as const satisfies readonly WorkspaceTool[];

export const availabilityLabels = {
  available: "Available",
  foundation: "UI foundation",
  preview: "Preview only",
} as const;

export function filterTools(query: string): readonly WorkspaceTool[] {
  const normalized = query.trim().toLocaleLowerCase();
  return toolRegistry.filter((tool) =>
    `${tool.name} ${tool.description} ${tool.responsibleTeam}`
      .toLocaleLowerCase()
      .includes(normalized),
  );
}
