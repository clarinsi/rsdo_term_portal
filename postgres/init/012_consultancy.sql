DROP TABLE IF EXISTS consultancy_entry_consultant;
DROP TABLE IF EXISTS consultancy_entry;
DROP TYPE IF EXISTS consultancy_entry_status;

CREATE TYPE consultancy_entry_status AS ENUM ('new', 'rejected', 'in progress', 'review', 'published');

CREATE TABLE consultancy_entry (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_external INT UNIQUE,
  time_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status consultancy_entry_status NOT NULL DEFAULT 'new',
  author_id INT REFERENCES "user",
  institution VARCHAR,
  description VARCHAR,
  domain_primary_id_initial SMALLINT REFERENCES domain_primary,
  existing_solutions VARCHAR,
  examples_of_use VARCHAR,
  time_published TIMESTAMPTZ,
  title VARCHAR,
  question VARCHAR,
  answer VARCHAR,
  path VARCHAR,
  answer_authors VARCHAR[],
  domain_primary_id SMALLINT REFERENCES domain_primary
);

CREATE TABLE consultancy_entry_consultant (
  entry_id INT NOT NULL REFERENCES consultancy_entry,
  user_id INT NOT NULL REFERENCES "user",
  is_moderator BOOL NOT NULL DEFAULT FALSE,
  PRIMARY KEY (entry_id, user_id)
);
