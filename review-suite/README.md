# review-suite — your 9-agent audit prompts
Drop your existing agent prompt files here so CC can read them off disk (they reference repo paths):

```
review-suite/
├─ quality/    (the ~7 code-quality domain agents + Codex review prompt)
└─ security/   (the ~7 security agents + Codex review prompt)
```

Run as a milestone gate only (see planning/REVIEW-SUITE.md): before a trunk merge, before a deploy,
and on any security/PHI/clinical pack. Pass = zero open criticals.
