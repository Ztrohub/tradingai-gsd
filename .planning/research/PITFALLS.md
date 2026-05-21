# PITFALLS Research - AI Trade IDX

## Key Risks

1. Data quality mismatch for IDX symbols
- Risk: inconsistent ticker normalization and missing historical bars.
- Mitigation: single symbol canonicalization module + validation checks per ingest.

2. Free-tier instability or ToS constraints
- Risk: provider quota or terms change over time.
- Mitigation: provider abstraction layer and at least two interchangeable data adapters.

3. LLM output drift from strict schema
- Risk: malformed action payload or ambiguous rationale.
- Mitigation: hard JSON schema validation with retry/re-prompt policy.

4. RL overfitting on sparse weekly/daily events
- Risk: policy learns noise and degrades decisions.
- Mitigation: constrain RL role to risk-parameter tuning, not full action selection in v1.

5. P/L accounting inconsistency with stop-loss rule
- Risk: incorrect realized P/L when stop level hit between runs.
- Mitigation: explicit event model for stop/take triggers with deterministic mark rules.

## Guardrails
- Idempotent job execution per date bucket.
- Full audit trail per run (inputs, prompts, outputs, veto decisions).
- Kill switch in UI to disable automation.

---
*Updated: 2026-05-21*
