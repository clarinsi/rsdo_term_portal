DROP TABLE IF EXISTS user_role CASCADE;
DROP TABLE IF EXISTS user_token_remember_me;
DROP TABLE IF EXISTS user_token_activation;
DROP TABLE IF EXISTS "user" CASCADE;
DROP TYPE IF EXISTS user_role_name;
DROP TYPE IF EXISTS user_hits_per_page;
DROP TYPE IF EXISTS user_status;

CREATE TYPE user_status AS ENUM ('registered', 'active', 'inactive');

CREATE TYPE user_hits_per_page AS ENUM ('10', '20', '50', '100');

CREATE TYPE user_language AS ENUM ('sl', 'en');

CREATE TYPE user_role_name AS ENUM ('portal admin', 'dictionaries admin', 'consultancy admin', 'consultant', 'editor');

CREATE TABLE "user" (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username VARCHAR NOT NULL UNIQUE,
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  email VARCHAR NOT NULL UNIQUE,
  status user_status NOT NULL DEFAULT 'registered',
  bcrypt_hash VARCHAR NOT NULL,
  time_registered TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_activated TIMESTAMPTZ,
  hits_per_page user_hits_per_page NOT NULL DEFAULT '10',
  language user_language NOT NULL DEFAULT 'sl'
);

CREATE TABLE user_token_activation (
  token VARCHAR PRIMARY KEY,
  user_id INT NOT NULL REFERENCES "user",
  time_created TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_token_remember_me (
  token VARCHAR PRIMARY KEY,
  user_id INT NOT NULL REFERENCES "user",
  time_created TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_role (
  user_id INT NOT NULL REFERENCES "user",
  role_name user_role_name NOT NULL,
  domains VARCHAR,
  dictionary_id INT REFERENCES dictionary ON DELETE CASCADE, -- Consider indexing this one, since deletion of rows from dictionary will require a scan of this table for references.
  administration BOOL,
  editing BOOL,
  terminology_review BOOL,
  language_review BOOL,
  CHECK (
    CASE
      WHEN role_name != 'consultant'
        THEN domains IS NULL
      ELSE TRUE
    END
  ),
  CHECK (
    CASE
      WHEN role_name = 'editor'
        THEN dictionary_id IS NOT NULL
          AND administration IS NOT NULL
          AND editing IS NOT NULL
          AND terminology_review IS NOT NULL
          AND language_review IS NOT NULL
        ELSE dictionary_id IS NULL
          AND administration IS NULL
          AND editing IS NULL
          AND terminology_review IS NULL
          AND language_review IS NULL
    END
  )
);
