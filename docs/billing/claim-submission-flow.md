# Billing Life-cycle: Claim Submission Workflow

This flow documents the journey of a claim from encounter to payment in the ChartSpark Billing Module.

```mermaid
graph TD
    A[Encounter Creation] --> B[Clinical Documentation]
    B --> C[Superbill Panel]
    C --> D{Claim Scrubber}
    
    D -- Errors Found --> E[Actionable Fixes UI]
    E --> C
    
    D -- Clean --> F[Generate 837P Transaction]
    F --> G[Office Ally SFTP - /inbound]
    G --> H{999 Acknowledgement}
    
    H -- Rejected --> I[Claims Worklist - Rejected Status]
    I --> C
    
    H -- Accepted --> J[Payer Forwarding]
    J --> K{277CA Payer Ack}
    
    K -- Rejected --> L[Denials Worklist - Actionable]
    L --> C
    
    K -- Received by Payer --> M[Adjudication]
    M --> N{835 ERA Received}
    
    N --> O[ERA Inbox]
    O --> P{Auto-Match Logic}
    
    P -- Success --> Q[Post Payment to Ledger]
    P -- Failure --> R[Manual Matching UI]
    R --> Q
    
    Q --> S[Update Claim Status: Paid]
    S --> T[Generate Patient Statement if Balance > 0]
```

## Key Touchpoints
1. **Scrubbing Phase**: Real-time feedback in the Encounter view prevent rejections.
2. **SFTP Handshake**: `office-ally-service.ts` monitors the `/outbound` folder for `999` and `277CA` files.
3. **Revenue Posting**: `era-processor.ts` parses the `835` and matches it against `tenant_id` and `claim_id`.
