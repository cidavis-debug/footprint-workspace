ALTER TABLE public.sources ADD COLUMN engineering_analysis_status text NOT NULL DEFAULT 'pending' CHECK (engineering_analysis_status IN ('pending','processing','complete','failed'));
ALTER TABLE public.sources ADD COLUMN engineering_summary text;

CREATE TABLE public.engineering_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('interface','requirement','decision','constraint','assumption')),
  subject text NOT NULL,
  attribute text NOT NULL,
  value text NOT NULL,
  unit text,
  affected_systems text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('proposed','preferred','approved','superseded','unknown')),
  evidence_excerpt text NOT NULL DEFAULT '',
  confidence real NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.engineering_claims(workspace_id);
CREATE INDEX ON public.engineering_claims(source_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engineering_claims TO authenticated;
GRANT ALL ON public.engineering_claims TO service_role;
ALTER TABLE public.engineering_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage claims" ON public.engineering_claims FOR ALL TO authenticated
  USING (public.owns_workspace(workspace_id))
  WITH CHECK (public.owns_workspace(workspace_id) AND EXISTS (SELECT 1 FROM public.sources s WHERE s.id = source_id AND s.workspace_id = engineering_claims.workspace_id));

CREATE TABLE public.engineering_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  new_claim_id uuid NOT NULL REFERENCES public.engineering_claims(id) ON DELETE CASCADE,
  related_claim_id uuid REFERENCES public.engineering_claims(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('possible_conflict','changed_constraint','interface_mismatch','unsupported_assumption')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
  title text NOT NULL,
  summary text NOT NULL,
  affected_systems text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.engineering_alerts(workspace_id);
CREATE UNIQUE INDEX engineering_alerts_open_unique ON public.engineering_alerts(new_claim_id, COALESCE(related_claim_id, '00000000-0000-0000-0000-000000000000'::uuid), alert_type) WHERE status = 'open';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engineering_alerts TO authenticated;
GRANT ALL ON public.engineering_alerts TO service_role;
ALTER TABLE public.engineering_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage alerts" ON public.engineering_alerts FOR ALL TO authenticated
  USING (public.owns_workspace(workspace_id))
  WITH CHECK (public.owns_workspace(workspace_id));