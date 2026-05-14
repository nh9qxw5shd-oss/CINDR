-- Atomic ownership claim. Replaces the client-side .or() filter that PostgREST
-- couldn't resolve, and folds the audit-log write into the same transaction.

CREATE OR REPLACE FUNCTION public.claim_ccil_incident(
  p_incident_number text,
  p_claimer ccil_role,
  p_force boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_owner ccil_role;
  v_now timestamptz := now();
BEGIN
  SELECT owner_role INTO v_current_owner
  FROM public.ccil_incidents
  WHERE incident_number = p_incident_number
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Incident not found');
  END IF;

  IF NOT p_force AND v_current_owner IS NOT NULL AND v_current_owner <> p_claimer THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'Already owned by ' || v_current_owner::text,
      'owner', v_current_owner
    );
  END IF;

  UPDATE public.ccil_incidents
  SET owner_role = p_claimer, owner_taken_at = v_now
  WHERE incident_number = p_incident_number;

  INSERT INTO public.ccil_ownership_log (incident_number, role, action)
  VALUES (p_incident_number, p_claimer, 'claimed');

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_ccil_incident(text, ccil_role, boolean)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
