-- ================================================================
-- AgencyOS — Notifications + Audit System
-- Run AFTER schema.sql and client-team.sql in Supabase SQL Editor
-- ================================================================

-- ───────────────────────────────────────────────────────────────
-- 1. audit_log table
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  table_name TEXT NOT NULL,
  record_id  TEXT NOT NULL,
  action     TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  actor_id   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  old_data   JSONB,
  new_data   JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_admin_select" ON public.audit_log FOR SELECT
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_audit_table   ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_actor   ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_log(created_at DESC);

-- ───────────────────────────────────────────────────────────────
-- 2. Enable Realtime for notifications
-- ───────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ───────────────────────────────────────────────────────────────
-- 3. Helper: safe notification insert (bypasses RLS via SECURITY DEFINER)
-- ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.insert_notification(
  p_type       TEXT,
  p_title      TEXT,
  p_body       TEXT,
  p_content_id TEXT  DEFAULT NULL,
  p_for_user   UUID  DEFAULT NULL,
  p_for_roles  TEXT[] DEFAULT '{}'
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (type, title, body, content_id, for_user_id, for_roles)
  VALUES (p_type, p_title, p_body, p_content_id, p_for_user, p_for_roles);
END;
$$;

-- ───────────────────────────────────────────────────────────────
-- 4. Helper: safe audit insert (bypasses RLS via SECURITY DEFINER)
-- ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.insert_audit(
  p_table  TEXT,
  p_id     TEXT,
  p_action TEXT,
  p_old    JSONB DEFAULT NULL,
  p_new    JSONB DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.audit_log (table_name, record_id, action, actor_id, old_data, new_data)
  VALUES (p_table, p_id, p_action, auth.uid(), p_old, p_new);
END;
$$;

-- ================================================================
-- TRIGGER: tasks INSERT → notify assigned user + audit
-- ================================================================
CREATE OR REPLACE FUNCTION public.trg_task_inserted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_title TEXT;
  v_client TEXT;
BEGIN
  SELECT cp.title, c.name
    INTO v_title, v_client
    FROM public.content_pieces cp
    JOIN public.clients c ON c.id = cp.client_id
   WHERE cp.id = NEW.content_id;

  PERFORM public.insert_notification(
    'task-assigned',
    'New task: ' || NEW.title,
    COALESCE(v_title, '') || ' · ' || COALESCE(v_client, ''),
    NEW.content_id,
    NEW.assigned_to,
    '{}'
  );

  PERFORM public.insert_audit('tasks', NEW.id, 'INSERT', NULL, to_jsonb(NEW));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_inserted ON public.tasks;
CREATE TRIGGER trg_task_inserted
  AFTER INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.trg_task_inserted();

-- ================================================================
-- TRIGGER: tasks UPDATE → audit
-- ================================================================
CREATE OR REPLACE FUNCTION public.trg_task_updated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.insert_audit('tasks', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_updated ON public.tasks;
CREATE TRIGGER trg_task_updated
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.trg_task_updated();

-- ================================================================
-- TRIGGER: content_pieces INSERT → audit
-- ================================================================
CREATE OR REPLACE FUNCTION public.trg_content_inserted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.insert_audit('content_pieces', NEW.id, 'INSERT', NULL, to_jsonb(NEW));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_content_inserted ON public.content_pieces;
CREATE TRIGGER trg_content_inserted
  AFTER INSERT ON public.content_pieces
  FOR EACH ROW EXECUTE FUNCTION public.trg_content_inserted();

-- ================================================================
-- TRIGGER: content_pieces UPDATE → audit + smart notifications on status change
-- ================================================================
CREATE OR REPLACE FUNCTION public.trg_content_updated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_client  TEXT;
  v_user    UUID;
BEGIN
  PERFORM public.insert_audit('content_pieces', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));

  -- Only notify when status actually changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_client FROM public.clients WHERE id = NEW.client_id;

  CASE NEW.status

    WHEN 'client-review' THEN
      -- Notify every client user linked to this client
      FOR v_user IN
        SELECT cu.user_id FROM public.client_users cu WHERE cu.client_id = NEW.client_id
      LOOP
        PERFORM public.insert_notification(
          'approval-needed',
          'Content ready for your review',
          NEW.title || ' · ' || COALESCE(v_client, ''),
          NEW.id, v_user, '{}'
        );
      END LOOP;

    WHEN 'approved' THEN
      -- Notify admin role (broadcast)
      PERFORM public.insert_notification(
        'content-approved',
        'Content approved by client',
        NEW.title || ' · ' || COALESCE(v_client, ''),
        NEW.id, NULL, ARRAY['admin']
      );

    WHEN 'brief-ready' THEN
      -- Notify the assigned writer for this client
      SELECT user_id INTO v_user
        FROM public.client_team
       WHERE client_id = NEW.client_id AND role = 'writer'
       LIMIT 1;
      IF v_user IS NOT NULL THEN
        PERFORM public.insert_notification(
          'task-assigned',
          'Brief ready — start writing',
          NEW.title || ' · ' || COALESCE(v_client, ''),
          NEW.id, v_user, '{}'
        );
      END IF;

    WHEN 'in-design' THEN
      -- video/reel → videographer; graphic/story → designer
      DECLARE v_role TEXT;
      BEGIN
        v_role := CASE WHEN NEW.type IN ('video','reel') THEN 'videographer' ELSE 'designer' END;
        SELECT user_id INTO v_user
          FROM public.client_team
         WHERE client_id = NEW.client_id AND role = v_role
         LIMIT 1;
        IF v_user IS NOT NULL THEN
          PERFORM public.insert_notification(
            'task-assigned',
            'Ready for ' || v_role,
            NEW.title || ' · ' || COALESCE(v_client, ''),
            NEW.id, v_user, '{}'
          );
        END IF;
      END;

    WHEN 'in-editing' THEN
      SELECT user_id INTO v_user
        FROM public.client_team
       WHERE client_id = NEW.client_id AND role = 'editor'
       LIMIT 1;
      IF v_user IS NOT NULL THEN
        PERFORM public.insert_notification(
          'task-assigned',
          'Ready for editing',
          NEW.title || ' · ' || COALESCE(v_client, ''),
          NEW.id, v_user, '{}'
        );
      END IF;

    WHEN 'ready-for-review' THEN
      SELECT user_id INTO v_user
        FROM public.client_team
       WHERE client_id = NEW.client_id AND role = 'poster'
       LIMIT 1;
      IF v_user IS NOT NULL THEN
        PERFORM public.insert_notification(
          'task-assigned',
          'Ready for scheduling/posting',
          NEW.title || ' · ' || COALESCE(v_client, ''),
          NEW.id, v_user, '{}'
        );
      END IF;

    ELSE
      NULL;
  END CASE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_content_updated ON public.content_pieces;
CREATE TRIGGER trg_content_updated
  AFTER UPDATE ON public.content_pieces
  FOR EACH ROW EXECUTE FUNCTION public.trg_content_updated();

-- ================================================================
-- TRIGGER: feedback_comments INSERT → notify admin when client posts + audit
-- ================================================================
CREATE OR REPLACE FUNCTION public.trg_feedback_inserted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_title  TEXT;
  v_client TEXT;
BEGIN
  SELECT cp.title, c.name
    INTO v_title, v_client
    FROM public.content_pieces cp
    JOIN public.clients c ON c.id = cp.client_id
   WHERE cp.id = NEW.content_id;

  IF NEW.author_type = 'client' THEN
    PERFORM public.insert_notification(
      'client-note',
      'Client feedback: ' || LEFT(NEW.text, 50),
      COALESCE(v_title, '') || ' · ' || COALESCE(v_client, ''),
      NEW.content_id,
      NULL,
      ARRAY['admin']
    );
  END IF;

  PERFORM public.insert_audit('feedback_comments', NEW.id, 'INSERT', NULL, to_jsonb(NEW));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_feedback_inserted ON public.feedback_comments;
CREATE TRIGGER trg_feedback_inserted
  AFTER INSERT ON public.feedback_comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_feedback_inserted();

-- ================================================================
-- TRIGGER: invoices INSERT/UPDATE → audit
-- ================================================================
CREATE OR REPLACE FUNCTION public.trg_invoice_changed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.insert_audit('invoices', NEW.id, 'INSERT', NULL, to_jsonb(NEW));
  ELSE
    PERFORM public.insert_audit('invoices', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_insert ON public.invoices;
DROP TRIGGER IF EXISTS trg_invoice_update ON public.invoices;
CREATE TRIGGER trg_invoice_insert
  AFTER INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.trg_invoice_changed();
CREATE TRIGGER trg_invoice_update
  AFTER UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.trg_invoice_changed();
