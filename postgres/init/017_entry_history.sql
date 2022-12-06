DROP TABLE IF EXISTS entry_version_history;

CREATE TABLE entry_version_history (
  entry_id INT REFERENCES entry ON DELETE CASCADE,
  version SMALLINT,
  version_time TIMESTAMPTZ,
  version_snapshot JSONB NOT NULL,
  PRIMARY KEY (entry_id, version)
);

CREATE OR REPLACE FUNCTION create_entry_version_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  _num_of_history_entires_per_entry SMALLINT;
BEGIN
  -- Create a snapshot of old entry data.
  INSERT INTO entry_version_history (entry_id, version, version_time, version_snapshot)
  VALUES (
    OLD.id,
    OLD.version,
    OLD.time_modified,
    (
      SELECT
        jsonb_strip_nulls(
          jsonb_build_object(
            'is_valid', e.is_valid,
            'is_published', e.is_published,
            'is_terminology_reviewed', e.is_terminology_reviewed,
            'is_language_reviewed', e.is_language_reviewed,
            'status', e.status,
            'term', e.term,
            'version', e.version,
            'version_author', e.version_author,
            'homonym_sort', e.homonym_sort,
            'label', e.label,
            'definition', e.definition,
            'synonyms', e.synonym,
            'other', e.other,
            'image', e.image,
            'audio', e.audio,
            'video', e.video,
            'domain_labels', ARRAY(
              SELECT name
              FROM entry_domain_label edl
              LEFT JOIN domain_label dl ON dl.id = edl.domain_label_id
              WHERE entry_id = e.id
            ),
            'links', ARRAY(
              SELECT jsonb_build_object(
                'type', type,
                'link', link
              )
              FROM entry_link
              WHERE entry_id = e.id
            ),
            'foreign_entries', ARRAY(
              SELECT jsonb_strip_nulls(
                jsonb_build_object(
                  'language_id', language_id,
                  'term', term,
                  'definition', definition,
                  'synonym', synonym
                )
              )
              FROM entry_foreign
              WHERE entry_id = e.id
            )
          )
        )
      FROM entry e
      WHERE e.id = OLD.id
    )
  );

  -- Get the current limit of snapshots per entry.
  SELECT value::smallint
  INTO _num_of_history_entires_per_entry
  FROM instance_settings
  WHERE name = 'num_of_history_entires_per_entry';

  -- Prune any (oldest) snapshots of this entry over the limit.
  IF _num_of_history_entires_per_entry >= 0 THEN
    DELETE FROM entry_version_history
    WHERE entry_id = OLD.id AND version IN (
      SELECT version
      FROM entry_version_history
      WHERE entry_id = OLD.id
      ORDER BY version DESC
      OFFSET _num_of_history_entires_per_entry
    );
  END IF;

  -- Increase version.
  NEW.version = OLD.version + 1;

  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER entry_version_history_create_snapshot
BEFORE UPDATE
ON entry
FOR EACH ROW
WHEN (current_setting('term_portal.skip_create_version_history_snapshot', TRUE) IS DISTINCT FROM 'TRUE')
EXECUTE FUNCTION create_entry_version_snapshot();
