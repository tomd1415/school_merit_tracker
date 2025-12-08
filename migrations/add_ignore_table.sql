CREATE TABLE IF NOT EXISTS merit_import_ignore (
  id serial PRIMARY KEY,
  first_name text NOT NULL,
  last_name  text NOT NULL,
  key_lower  text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE merit_import_ignore OWNER TO merit_user;