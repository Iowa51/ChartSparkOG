# ChartSpark Managed Billing: Administrative Guide

Welcome to the definitive operational manual for the ChartSpark Managed Billing module. This guide covers the workflows and tools used by practice administrators to manage the claim lifecycle.

## 1. The Claims Manager
The **Claims Manager** (`/billing/claims`) is your central triage hub.

### Workflow Tabs
- **Standard Worklist**: Track claims from Draft → Sent → Accepted → Paid.
- **Denial Recovery**: A specialized "red mode" tab for claims rejected or denied by payers. Prioritize these daily to maximize revenue.

### Manual Overrides
- **Manual Write-off**: Click the red dollar icon in any claim row to permanently close a balance. Use this for unrecoverable denials or small balance adjustments.

## 2. Technical Observability
The **Connectivity Dashboard** (located at the bottom of the Claims Manager) monitors real-time traffic.

### Indicators
- **Edge Connectivity**: Green indicates a live SFTP link to Office Ally.
- **Transaction Stream**: A live log of every 837P transmission and 835 ERA download.
- **RLS/Security**: Confirms that HIPAA tenant isolation is enforced on the database.

## 3. Claim Scrubbing
ChartSpark automatically "scrubs" claims before they are submitted.

- **Soft Warnings**: Yellow indicators for missing but non-blocking data (e.g., secondary insurance info).
- **Hard Blocks**: Red indicators for mission-critical missing data (e.g., NPI, Taxonomy, or ICD-10 codes). **Claims with Hard Blocks cannot be submitted.**

## 4. Troubleshooting SFTP
If the Connectivity Dashboard shows "Link Disconnected":
1. Verify credentials in **Settings > Billing Setup**.
2. Visit `/api/billing/poll` in your browser to trigger a manual heartbeat.
3. Check the "Forensic Logs" via the Connectivity Dashboard for specific error codes.

---
*Support: administrator@chartspark.health*
