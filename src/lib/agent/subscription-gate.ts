import { AgentMode } from "./types";

export function getAgentMode(subscriptionTier: string): AgentMode {
  return subscriptionTier === "complete" ? "full_pipeline" : "documentation_only";
}

export function isRCMEnabled(subscriptionTier: string): boolean {
  return subscriptionTier === "complete";
}

export function getUpgradeMessage(feature: string): string {
  switch (feature) {
    case "billing":
      return "Upgrade to the Complete plan to have our team handle all claim submission and denied claim recovery for you.";
    case "auditor":
      return "Upgrade to the Complete plan to get dedicated auditor review for every claim before submission.";
    case "reimbursement":
      return "Upgrade to the Complete plan to track reimbursement status and get denied claim recovery.";
    default:
      return "Upgrade to the Complete plan to unlock all RCM features.";
  }
}
