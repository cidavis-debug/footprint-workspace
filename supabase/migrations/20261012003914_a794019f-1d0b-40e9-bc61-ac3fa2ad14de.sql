ALTER TABLE public.workspaces ADD COLUMN parent_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
CREATE INDEX idx_workspaces_parent ON public.workspaces(parent_id);

CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.collections (workspace_id, name) VALUES (NEW.id, 'General');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_workspace_created
AFTER INSERT ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.handle_new_workspace();