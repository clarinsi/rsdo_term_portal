DROP TABLE IF EXISTS import_file_job;
DROP TYPE IF EXISTS import_file_status;
DROP TYPE IF EXISTS import_file_format;
DROP TABLE IF EXISTS process;
DROP TYPE IF EXISTS process_type;
DROP TABLE IF EXISTS entry_link;
DROP TABLE IF EXISTS entry_domain_label;
DROP TABLE IF EXISTS entry_foreign;
DROP TABLE IF EXISTS entry;
DROP TABLE IF EXISTS dictionary_domain;
DROP TABLE IF EXISTS domain_label;
DROP TYPE IF EXISTS entry_status;
DROP TYPE IF EXISTS entry_link_type;
DROP TYPE IF EXISTS headword_status;

CREATE TYPE headword_status AS ENUM ('no content', 'unverified', 'unconfirmed', 'confirmed');

CREATE TYPE entry_link_type AS ENUM ('related', 'broader', 'narrow');

CREATE TYPE entry_status AS ENUM ('suggestion', 'in_edit', 'complete');

CREATE TABLE domain_label (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR NOT NULL,
  dictionary_id INT REFERENCES dictionary ON DELETE CASCADE, -- Consider indexing this one, since deletion of rows from dictionary will require a scan of this table for references.
  is_visible BOOL NOT NULL DEFAULT TRUE,
  UNIQUE (name, dictionary_id)
);

CREATE TABLE entry (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dictionary_id INT NOT NULL REFERENCES dictionary ON DELETE CASCADE, -- Consider indexing this one, since you're making queries with it in a WHERE clause and since deletion of rows from dictionary will require a scan of this table for references.
  is_valid BOOL NOT NULL DEFAULT FALSE,
  is_published BOOL NOT NULL DEFAULT FALSE,
  is_terminology_reviewed BOOL NOT NULL DEFAULT FALSE,
  is_language_reviewed BOOL NOT NULL DEFAULT FALSE,
  status entry_status NOT NULL DEFAULT 'suggestion',
  term VARCHAR,
  time_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_modified TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version SMALLINT NOT NULL DEFAULT 1,
  version_author INT REFERENCES "user" ON DELETE SET NULL, -- Consider indexing this one, since deletion of rows from user will require a scan of this table for references.
  homonym_sort SMALLINT,
  wordforms headword_status NOT NULL DEFAULT 'no content',
  accent headword_status NOT NULL DEFAULT 'no content',
  pronunciation headword_status NOT NULL DEFAULT 'no content',
  label VARCHAR,
  definition VARCHAR,
  synonym VARCHAR[],
  other VARCHAR,
  image VARCHAR[],
  audio VARCHAR[],
  video VARCHAR[],
  time_most_recent_comment TIMESTAMPTZ
);

CREATE TABLE entry_foreign (
  entry_id INT REFERENCES entry ON DELETE CASCADE, -- Consider indexing this one, since deletion of rows from entry will require a scan of this table for references.
  language_id SMALLINT NOT NULL REFERENCES language,
  term VARCHAR[],
  definition VARCHAR,
  synonym VARCHAR[],
  PRIMARY KEY (entry_id, language_id)
);

CREATE TABLE entry_domain_label (
  entry_id INT REFERENCES entry ON DELETE CASCADE, -- Consider indexing this one, since deletion of rows from entry will require a scan of this table for references.
  domain_label_id INT REFERENCES domain_label ON DELETE CASCADE, -- Consider indexing this one, since deletion of rows from domain_label_id will require a scan of this table for references.
  PRIMARY KEY (entry_id, domain_label_id)
);

CREATE TABLE entry_link (
  entry_id INT REFERENCES entry ON DELETE CASCADE, -- Consider indexing this one, since deletion of rows from entry will require a scan of this table for references.
  type entry_link_type NOT NULL DEFAULT 'related',
  link VARCHAR NOT NULL,
  PRIMARY KEY (entry_id, type, link)
);

CREATE TYPE process_type AS ENUM ('import', 'export'); -- + 'index'?

CREATE TABLE process (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type process_type NOT NULL,
  dictionary_id INT REFERENCES dictionary ON DELETE SET NULL, -- Consider indexing this one, since deletion of rows from dictionary will require a scan of this table for references.
  time_started TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_ended TIMESTAMPTZ,
  report VARCHAR
);

CREATE TYPE import_file_format AS ENUM ('xml', 'csv', 'tsv');

CREATE TYPE import_file_status AS ENUM ('in progress', 'error', 'done');

CREATE TABLE import_file_job (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  time_started TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status import_file_status NOT NULL DEFAULT 'in progress',
  dictionary_id INT REFERENCES dictionary ON DELETE SET NULL, -- Consider indexing this one, since deletion of rows from dictionary will require a scan of this table for references.
  delete_existing_entries BOOL NOT NULL,
  file_format import_file_format NOT NULL,
  count_valid_entries INT NOT NULL DEFAULT 0,
  count_invalid_entries INT NOT NULL DEFAULT 0
);

CREATE TRIGGER entry_update_time_modified
BEFORE UPDATE
ON entry
FOR EACH ROW
WHEN (current_setting('term_portal.skip_update_time_modified', TRUE) IS DISTINCT FROM 'TRUE')
EXECUTE FUNCTION update_time_modified();
