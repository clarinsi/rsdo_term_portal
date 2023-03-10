CREATE TYPE dictionary_export_status AS ENUM ('pending', 'in progress', 'failed', 'finished');

CREATE TYPE dictionary_export_file_format AS ENUM ('xml', 'csv', 'tsv', 'tbx');

CREATE TABLE dictionary_export (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dictionary_id INT NOT NULL REFERENCES dictionary ON DELETE CASCADE, -- Consider indexing this one, since you're making queries with it in a WHERE clause and since deletion of rows from dictionary will require a scan of this table for references.
  status dictionary_export_status NOT NULL DEFAULT 'pending',
  time_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_started TIMESTAMPTZ,
  time_finished TIMESTAMPTZ,
  entry_count INT,
  is_valid_filter BOOL,
  is_published_filter BOOL,
  is_terminology_reviewed_filter BOOL,
  is_language_reviewed_filter BOOL,
  status_filter entry_status,
  export_file_format dictionary_export_file_format NOT NULL
);
