DROP TABLE IF EXISTS linked_dictionary;
DROP TABLE IF EXISTS linked_portals;

CREATE TABLE linked_portal (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  code CHAR(2) NOT NULL UNIQUE,
  is_enabled BOOL NOT NULL DEFAULT FALSE,
  url_update VARCHAR NOT NULL UNIQUE,
  url_index VARCHAR UNIQUE, -- Initial comment: 'url for obtaining list of available dictionaries'.
  time_last_synced TIMESTAMPTZ
);

CREATE TABLE linked_dictionary (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR NOT NULL,
  linked_portal_id INT NOT NULL,
  source_dictionary_id VARCHAR NOT NULL,
  target_dictionary_id INT NOT NULL REFERENCES dictionary ON DELETE CASCADE, -- Consider indexing this one, since deletion of rows from dictionary will require a scan of this table for references.
  is_enabled BOOL NOT NULL DEFAULT FALSE,
  time_last_synced TIMESTAMPTZ,
  UNIQUE (linked_portal_id, source_dictionary_id)
);
