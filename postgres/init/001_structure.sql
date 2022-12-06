DROP TABLE IF EXISTS dictionary_language;
DROP TABLE IF EXISTS dictionary_domain_secondary;
DROP TABLE IF EXISTS dictionary;
DROP TABLE IF EXISTS language;
DROP TABLE IF EXISTS domain_secondary;
DROP TABLE IF EXISTS domain_primary;
DROP TYPE IF EXISTS dictionary_status;

CREATE TABLE domain_primary (
  id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name_sl VARCHAR NOT NULL UNIQUE,
  name_en VARCHAR NOT NULL UNIQUE,
  udk_code VARCHAR NOT NULL UNIQUE,
  cerif_name VARCHAR NOT NULL,
  cerif_code VARCHAR NOT NULL,
  eurovoc_name VARCHAR NOT NULL,
  eurovoc_code VARCHAR NOT NULL
);

CREATE TABLE domain_secondary (
  id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name_sl VARCHAR NOT NULL,
  name_en VARCHAR NOT NULL,
  approved BOOL NOT NULL DEFAULT FALSE,
  UNIQUE (name_sl, name_en)
);

CREATE TABLE language (
  id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code VARCHAR NOT NULL UNIQUE,
  name_sl VARCHAR NOT NULL UNIQUE,
  name_en VARCHAR NOT NULL UNIQUE
);

CREATE TYPE dictionary_status AS ENUM ('closed', 'reviewed', 'published');

CREATE TABLE dictionary (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name_sl VARCHAR NOT NULL,
  name_sl_short VARCHAR NOT NULL,
  name_en VARCHAR NOT NULL,
  author VARCHAR[],
  issn VARCHAR,
  domain_primary_id SMALLINT NOT NULL REFERENCES domain_primary,
  time_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_modified TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Include updating this one on changing related link tables.
  time_content_modified TIMESTAMPTZ, -- This one is updated manually and not through triggers.
  time_published TIMESTAMPTZ,
  status dictionary_status NOT NULL DEFAULT 'closed',
  count_entries INT NOT NULL DEFAULT 0, -- This one is updated manually and not through triggers.
  count_comments INT,
  description VARCHAR,
  entries_have_domain_labels BOOL NOT NULL DEFAULT FALSE,
  entries_have_label BOOL NOT NULL DEFAULT FALSE,
  entries_have_definition BOOL NOT NULL DEFAULT TRUE,
  entries_have_synonyms BOOL NOT NULL DEFAULT FALSE,
  entries_have_links BOOL NOT NULL DEFAULT FALSE,
  entries_have_other BOOL NOT NULL DEFAULT FALSE,
  entries_have_foreign_languages BOOL NOT NULL DEFAULT TRUE,
  entries_have_foreign_definitions BOOL NOT NULL DEFAULT FALSE,
  entries_have_foreign_synonyms BOOL NOT NULL DEFAULT FALSE,
  entries_have_images BOOL NOT NULL DEFAULT FALSE,
  entries_have_audio BOOL NOT NULL DEFAULT FALSE,
  entries_have_videos BOOL NOT NULL DEFAULT FALSE,
  entries_have_terminology_review_flag BOOL NOT NULL DEFAULT FALSE,
  entries_have_language_review_flag BOOL NOT NULL DEFAULT FALSE
);

CREATE TABLE dictionary_domain_secondary (
  dictionary_id INT REFERENCES dictionary ON DELETE CASCADE, -- Consider indexing this one, since deletion of rows from dictionary will require a scan of this table for references.
  domain_secondary_id SMALLINT REFERENCES domain_secondary,
  PRIMARY KEY (dictionary_id, domain_secondary_id)
);

CREATE TABLE dictionary_language (
  dictionary_id INT REFERENCES dictionary ON DELETE CASCADE, -- Consider indexing this one, since deletion of rows from dictionary will require a scan of this table for references.
  language_id SMALLINT REFERENCES language,
  selection_order SMALLINT,
  PRIMARY KEY (dictionary_id, language_id)
);

CREATE OR REPLACE FUNCTION update_time_modified()
RETURNS TRIGGER AS $$
BEGIN
  NEW.time_modified = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dictionary_update_time_modified
BEFORE UPDATE
ON dictionary
FOR EACH ROW
WHEN (current_setting('term_portal.skip_update_time_modified', TRUE) IS DISTINCT FROM 'TRUE')
EXECUTE FUNCTION update_time_modified();
