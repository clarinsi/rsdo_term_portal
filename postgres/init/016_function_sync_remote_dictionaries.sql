CREATE OR REPLACE FUNCTION jsonb_array_to_text_array(_js jsonb)
  RETURNS text[]
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
$$SELECT CASE WHEN _js = 'null' THEN NULL ELSE ARRAY(SELECT jsonb_array_elements_text(_js)) END$$;

-- Creates new dictionary from remote instance.
CREATE OR REPLACE FUNCTION dictionary_remote_new (_dictionary JSONB, OUT _dictionary_id dictionary.id%type)
LANGUAGE plpgsql AS $$
DECLARE
  _domain_secondary_names JSONB[] := jsonb_array_to_text_array(_dictionary -> 'domain_secondary_names')::JSONB[];
  _domain_secondary_name JSONB;
  _domain_secondary_id domain_secondary.id%type;
  _language_codes VARCHAR[] := jsonb_array_to_text_array(_dictionary -> 'language_codes');
  _language_id language.id%type;

BEGIN
  -- Disable trigger from updating time_modified.
  SET LOCAL term_portal.skip_update_time_modified TO 'TRUE';

  -- Create new dictionary.
  INSERT INTO dictionary (
    name_sl,
    name_sl_short,
    name_en,
    author,
    issn,
    domain_primary_id,
    time_created,
    time_modified,
    time_content_modified,
    status,
    description,
    entries_have_domain_labels,
    entries_have_label,
    entries_have_definition,
    entries_have_synonyms,
    entries_have_links,
    entries_have_other,
    entries_have_foreign_languages,
    entries_have_foreign_definitions,
    entries_have_foreign_synonyms,
    entries_have_images,
    entries_have_audio,
    entries_have_videos,
    entries_have_terminology_review_flag,
    entries_have_language_review_flag
  )
  VALUES (
    _dictionary ->> 'name_sl',
    _dictionary ->> 'name_sl_short',
    _dictionary ->> 'name_en',
    jsonb_array_to_text_array(_dictionary -> 'author'),
    _dictionary ->> 'issn',
    COALESCE(
      (SELECT id FROM domain_primary WHERE name_sl = _dictionary ->> 'domain_primary_name_sl'),
      (SELECT id FROM domain_primary WHERE name_sl = 'Neopredeljeno')
    ),
    (_dictionary ->> 'time_created')::TIMESTAMPTZ,
    (_dictionary ->> 'time_modified')::TIMESTAMPTZ,
    (_dictionary ->> 'time_content_modified')::TIMESTAMPTZ,
    'published',
    _dictionary ->> 'description',
    (_dictionary ->> 'entries_have_domain_labels')::BOOL,
    (_dictionary ->> 'entries_have_label')::BOOL,
    (_dictionary ->> 'entries_have_definition')::BOOL,
    (_dictionary ->> 'entries_have_synonyms')::BOOL,
    (_dictionary ->> 'entries_have_links')::BOOL,
    (_dictionary ->> 'entries_have_other')::BOOL,
    (_dictionary ->> 'entries_have_foreign_languages')::BOOL,
    (_dictionary ->> 'entries_have_foreign_definitions')::BOOL,
    (_dictionary ->> 'entries_have_foreign_synonyms')::BOOL,
    (_dictionary ->> 'entries_have_images')::BOOL,
    (_dictionary ->> 'entries_have_audio')::BOOL,
    (_dictionary ->> 'entries_have_videos')::BOOL,
    (_dictionary ->> 'entries_have_terminology_review_flag')::BOOL,
    (_dictionary ->> 'entries_have_language_review_flag')::BOOL
  )
  RETURNING id
  INTO _dictionary_id;

  -- Create and/or associate secondary domains.
  FOREACH _domain_secondary_name IN ARRAY _domain_secondary_names LOOP

    SELECT id
    INTO _domain_secondary_id
    FROM domain_secondary
    WHERE name_sl = _domain_secondary_name ->> 'name_sl' AND name_en = _domain_secondary_name ->> 'name_en';

    IF _domain_secondary_id IS NULL THEN
      INSERT INTO domain_secondary (name_sl, name_en)
      VALUES
        (_domain_secondary_name ->> 'name_sl', _domain_secondary_name ->> 'name_en')
      RETURNING id
      INTO _domain_secondary_id;
    END IF;

    INSERT INTO dictionary_domain_secondary (dictionary_id, domain_secondary_id)
    VALUES (_dictionary_id, _domain_secondary_id);

  END LOOP;

  -- Associate languages.
  FOR i IN 1..COALESCE(array_length(_language_codes, 1), 0) LOOP

    SELECT id INTO _language_id FROM language WHERE code = _language_codes[i];

    IF _language_id IS NOT NULL THEN
      INSERT INTO dictionary_language (dictionary_id, language_id, selection_order)
      VALUES (_dictionary_id, _language_id, i);
    END IF;

  END LOOP;

END
$$;

-- Updates dictionary from remote instance.
CREATE OR REPLACE FUNCTION dictionary_remote_update (_dictionary_id dictionary.id%type, _dictionary JSONB)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  _domain_secondary_names JSONB[] := jsonb_array_to_text_array(_dictionary -> 'domain_secondary_names')::JSONB[];
  _domain_secondary_name JSONB;
  _domain_secondary_id domain_secondary.id%type;
  _language_codes VARCHAR[] := jsonb_array_to_text_array(_dictionary -> 'language_codes');
  _language_id language.id%type;

BEGIN
  -- Disable trigger from updating time_modified.
  SET LOCAL term_portal.skip_update_time_modified TO 'TRUE';

  -- Update dictionary table.
  UPDATE dictionary
  SET
    name_sl = _dictionary ->> 'name_sl',
    name_sl_short = _dictionary ->> 'name_sl_short',
    name_en = _dictionary ->> 'name_en',
    author = jsonb_array_to_text_array(_dictionary -> 'author'),
    issn = _dictionary ->> 'issn',
    domain_primary_id = COALESCE(
      (SELECT id FROM domain_primary WHERE name_sl = _dictionary ->> 'domain_primary_name_sl'),
      (SELECT id FROM domain_primary WHERE name_sl = 'Neopredeljeno')
    ),
    time_created = (_dictionary ->> 'time_created')::TIMESTAMPTZ,
    time_modified = (_dictionary ->> 'time_modified')::TIMESTAMPTZ,
    time_content_modified = (_dictionary ->> 'time_content_modified')::TIMESTAMPTZ,
    description = _dictionary ->> 'description',
    entries_have_domain_labels = (_dictionary ->> 'entries_have_domain_labels')::BOOL,
    entries_have_label = (_dictionary ->> 'entries_have_label')::BOOL,
    entries_have_definition = (_dictionary ->> 'entries_have_definition')::BOOL,
    entries_have_synonyms = (_dictionary ->> 'entries_have_synonyms')::BOOL,
    entries_have_links =(_dictionary ->> 'entries_have_links')::BOOL,
    entries_have_other = (_dictionary ->> 'entries_have_other')::BOOL,
    entries_have_foreign_languages = (_dictionary ->> 'entries_have_foreign_languages')::BOOL,
    entries_have_foreign_definitions = (_dictionary ->> 'entries_have_foreign_definitions')::BOOL,
    entries_have_foreign_synonyms = (_dictionary ->> 'entries_have_foreign_synonyms')::BOOL,
    entries_have_images = (_dictionary ->> 'entries_have_images')::BOOL,
    entries_have_audio = (_dictionary ->> 'entries_have_audio')::BOOL,
    entries_have_videos = (_dictionary ->> 'entries_have_videos')::BOOL,
    entries_have_terminology_review_flag = (_dictionary ->> 'entries_have_terminology_review_flag')::BOOL,
    entries_have_language_review_flag = (_dictionary ->> 'entries_have_language_review_flag')::BOOL
  WHERE id = _dictionary_id;

  -- Delete all existing secondary domain associations.
  DELETE
  FROM dictionary_domain_secondary
  WHERE dictionary_id = _dictionary_id;

  -- Create and/or associate new secondary domains, if any.
  FOREACH _domain_secondary_name IN ARRAY _domain_secondary_names LOOP

    SELECT id
    INTO _domain_secondary_id
    FROM domain_secondary
    WHERE name_sl = _domain_secondary_name ->> 'name_sl' AND name_en = _domain_secondary_name ->> 'name_en';

    IF _domain_secondary_id IS NULL THEN
      INSERT INTO domain_secondary (name_sl, name_en)
      VALUES
        (_domain_secondary_name ->> 'name_sl', _domain_secondary_name ->> 'name_en')
      RETURNING id
      INTO _domain_secondary_id;
    END IF;

    INSERT INTO dictionary_domain_secondary (dictionary_id, domain_secondary_id)
    VALUES (_dictionary_id, _domain_secondary_id);

  END LOOP;

  -- Delete all existing language associations.
  DELETE
  FROM dictionary_language
  WHERE dictionary_id = _dictionary_id;

  -- Associate new languages, if any.
  FOR i IN 1..COALESCE(array_length(_language_codes, 1), 0) LOOP

    SELECT id INTO _language_id FROM language WHERE code = _language_codes[i];

    IF _language_id IS NOT NULL THEN
      INSERT INTO dictionary_language (dictionary_id, language_id, selection_order)
      VALUES (_dictionary_id, _language_id, i);
    END IF;

  END LOOP;

END
$$;

-- Sync remote dictionaries (but not entries).
CREATE OR REPLACE FUNCTION sync_remote_dictionaries (
  _linked_portal_id linked_portal.id%type,
  _dictionaries JSONB[]
)
RETURNS void
LANGUAGE PLPGSQL
AS $$
DECLARE
  _dictionary JSONB;
  _source_dictionary_id linked_dictionary.source_dictionary_id%type;
  _target_dictionary_id linked_dictionary.target_dictionary_id%type;
  _remote_dictionary_ids VARCHAR[] := ARRAY[]::VARCHAR[];
  _time_modified_old dictionary.time_modified%type;
  _time_modified_new dictionary.time_modified%type;

BEGIN
  -- For each of the provided dictionaries: create | update | skip.
  FOREACH _dictionary IN ARRAY _dictionaries LOOP
    _source_dictionary_id := _dictionary ->> 'id';
    _remote_dictionary_ids = _remote_dictionary_ids || _source_dictionary_id;

    SELECT target_dictionary_id INTO _target_dictionary_id FROM linked_dictionary WHERE source_dictionary_id = _source_dictionary_id;

    -- Check if dictionary doesn't exist yet.
    IF _target_dictionary_id IS NULL THEN
      -- Create new dictionary.
      SELECT dictionary_remote_new(_dictionary) INTO _target_dictionary_id;
      
      -- Create new linked dictionary.
      INSERT INTO linked_dictionary(name, linked_portal_id, source_dictionary_id, target_dictionary_id)
      VALUES (_dictionary ->> 'name_sl', _linked_portal_id, _source_dictionary_id, _target_dictionary_id);

    ELSE
      -- Dictionary already exists.
      -- Compare modification times to determine if update is required.
      SELECT time_modified INTO _time_modified_old FROM dictionary WHERE id = _target_dictionary_id;
      _time_modified_new := _dictionary ->> 'time_modified';

      -- Skip this dictionary, if modification times match.
      CONTINUE WHEN _time_modified_new = _time_modified_old;

      -- Update dictionary.
      PERFORM dictionary_remote_update(_target_dictionary_id, _dictionary);

      -- Update linked dictionary.
      UPDATE linked_dictionary
      SET name = _dictionary ->> 'name_sl'
      WHERE target_dictionary_id = _target_dictionary_id;

    END IF;

  END LOOP;

  -- Delete any existing dictionaries that were not provided to be synced.
  DELETE FROM dictionary
  WHERE id IN (
    SELECT target_dictionary_id
    FROM linked_dictionary
    WHERE linked_portal_id = _linked_portal_id AND source_dictionary_id <> ALL (_remote_dictionary_ids)
  );

END
$$;
