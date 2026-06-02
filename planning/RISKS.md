# RISKS
| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| AI note generator hallucinates clinical facts | Catastrophic (malpractice) | Certain today | Tier 0 gate (#6); fix before any AI ships |
| OneDrive corrupts git | High | High | Move repos out of OneDrive first (#4) |
| Trusting an AI's narrative of state over ground truth | High | Burned twice | Verify-first (#2) |
| Built features stay dark (entitlement lock) | High | Certain now | Create/seed `features`/`user_features` (pack-01 Phase B) |
| Wrong-account push / wrong deploy source (old UI) | High | Med | `gh auth switch` (#5); verify deploy source (#9) |
| Branch reconciliation loses commits | Severe | Med | Backup tag; cherry-pick/merge only; no shared-history rewrite without approval |
| High-stakes change ships without the full review suite | Severe | Med | Milestone audit gate (#10) on trunk merge / deploy / security-PHI-clinical packs |
