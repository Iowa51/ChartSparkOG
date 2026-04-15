-- Agent Orchestrator tables for AI agent execution tracking
-- Migration: 20260413120000_agent_tables.sql

-- ============================================================
-- agent_executions: tracks each agent run
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  agent_type text NOT NULL CHECK (agent_type IN ('documentation', 'billing', 'quality', 'orchestrator')),
  status text NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'escalated')),
  input_data jsonb,
  output_data jsonb,
  confidence_score numeric(4,3),
  attempts integer DEFAULT 1,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_agent_executions_session_id ON agent_executions(session_id);
CREATE INDEX idx_agent_executions_created_at ON agent_executions(created_at);

ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role bypass for agent_executions"
  ON agent_executions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- agent_decisions: individual decisions made during execution
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES agent_executions(id),
  decision_type text NOT NULL,
  input_data jsonb,
  output_data jsonb,
  reasoning text,
  confidence_score numeric(4,3),
  tool_used text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_agent_decisions_execution_id ON agent_decisions(execution_id);
CREATE INDEX idx_agent_decisions_created_at ON agent_decisions(created_at);

ALTER TABLE agent_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role bypass for agent_decisions"
  ON agent_decisions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- validation_corrections: correction attempts during validation
-- ============================================================
CREATE TABLE IF NOT EXISTS validation_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES agent_executions(id),
  attempt_number integer NOT NULL,
  issues_found jsonb,
  correction_prompt text,
  correction_result jsonb,
  success boolean,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_validation_corrections_execution_id ON validation_corrections(execution_id);
CREATE INDEX idx_validation_corrections_created_at ON validation_corrections(created_at);

ALTER TABLE validation_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role bypass for validation_corrections"
  ON validation_corrections
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- authorization_requests: prior auth tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS authorization_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  payer_id text,
  cpt_code text,
  diagnosis_codes text[],
  status text DEFAULT 'pending',
  request_data jsonb,
  response_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_authorization_requests_session_id ON authorization_requests(session_id);
CREATE INDEX idx_authorization_requests_created_at ON authorization_requests(created_at);

ALTER TABLE authorization_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role bypass for authorization_requests"
  ON authorization_requests
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- quality_reviews: quality assessment results
-- ============================================================
CREATE TABLE IF NOT EXISTS quality_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  execution_id uuid REFERENCES agent_executions(id),
  accuracy_score numeric(4,3),
  completeness_score numeric(4,3),
  consistency_score numeric(4,3),
  safety_score numeric(4,3),
  overall_score numeric(4,3),
  flags jsonb,
  recommendations jsonb,
  requires_supervisor_review boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_quality_reviews_session_id ON quality_reviews(session_id);
CREATE INDEX idx_quality_reviews_created_at ON quality_reviews(created_at);

ALTER TABLE quality_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role bypass for quality_reviews"
  ON quality_reviews
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- clinician_quality_metrics: aggregated quality metrics per clinician
-- ============================================================
CREATE TABLE IF NOT EXISTS clinician_quality_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinician_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_sessions integer DEFAULT 0,
  avg_accuracy numeric(4,3),
  avg_completeness numeric(4,3),
  avg_consistency numeric(4,3),
  avg_safety numeric(4,3),
  avg_overall numeric(4,3),
  escalation_rate numeric(5,4),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_clinician_quality_metrics_clinician_id ON clinician_quality_metrics(clinician_id);
CREATE INDEX idx_clinician_quality_metrics_created_at ON clinician_quality_metrics(created_at);

ALTER TABLE clinician_quality_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role bypass for clinician_quality_metrics"
  ON clinician_quality_metrics
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
