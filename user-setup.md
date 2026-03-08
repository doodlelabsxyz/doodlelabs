  ---
  How to manually assign roles in Supabase Dashboard

  Step 1 — Create the auth user:
  Authentication → Users → "+ Invite user" or "+ Add user" → enter email + password →     
  confirm

  Step 2 — Set role in user_metadata (so middleware redirects correctly):
  Authentication → Users → click the user → scroll to "User Metadata" → edit JSON:        
  { "role": "writer" }
  Valid values: admin, writer, designer, videographer, editor, poster, client

  Step 3 — Insert into public.users (SQL Editor):
  INSERT INTO public.users (id, name, initials, role, email, avatar_color, active)        
  VALUES (
    'PASTE-UUID-FROM-AUTH',
    'Full Name',
    'FN',
    'writer',
    'email@example.com',
    'hsl(268,60%,68%)',
    true
  );

  Step 4 — For client role only, also link to client:
  INSERT INTO public.client_users (user_id, client_id)
  VALUES ('PASTE-UUID', 'PASTE-CLIENT-ID');

  Get the UUID: Authentication → Users → click user → copy "User UID" from top


    UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb  
  WHERE id = 'a55e3424-2aa9-4e2b-ad54-60bec2ecf522';