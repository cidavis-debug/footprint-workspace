-- History of what changed when a source's content was replaced or re-fetched.
CREATE TABLE public.source_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.sources(id) ON DELETE SET NULL,
  source_title text NOT NULL,
  version_from integer NOT NULL,
  version_to integer NOT NULL,
  diff jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.source_changes(workspace_id, created_at DESC);
CREATE INDEX ON public.source_changes(source_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.source_changes TO authenticated;
GRANT ALL ON public.source_changes TO service_role;
ALTER TABLE public.source_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage source changes" ON public.source_changes FOR ALL TO authenticated
  USING (public.owns_workspace(workspace_id))
  WITH CHECK (public.owns_workspace(workspace_id));
