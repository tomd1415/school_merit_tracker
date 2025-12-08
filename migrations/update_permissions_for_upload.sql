-- Allow app role to use/create in public
GRANT USAGE ON SCHEMA public TO merit_user;
GRANT CREATE ON SCHEMA public TO merit_user;  -- needed if the app creates tables (merit_import_ignore)

-- Ensure it can access existing objects
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO merit_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO merit_user;

-- Keep permissions for future tables/sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO merit_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO merit_user;