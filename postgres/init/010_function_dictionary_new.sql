-- Creates new own dictionary.
CREATE OR REPLACE FUNCTION dictionary_new (
  _name_sl dictionary.name_sl%type,
  _name_sl_short dictionary.name_sl_short%type,
  _name_en dictionary.name_en%type,
  _author dictionary.author%type,
  _issn dictionary.issn%type,
  _domain_primary_id dictionary.domain_primary_id%type,
  _entries_have_domain_labels dictionary.entries_have_domain_labels%type,
  _entries_have_label dictionary.entries_have_label%type,
  _entries_have_definition dictionary.entries_have_definition%type,
  _entries_have_synonyms dictionary.entries_have_synonyms%type,
  _entries_have_links dictionary.entries_have_links%type,
  _entries_have_other dictionary.entries_have_other%type,
  _entries_have_foreign_languages dictionary.entries_have_foreign_languages%type,
  _entries_have_foreign_definitions dictionary.entries_have_foreign_definitions%type,
  _entries_have_foreign_synonyms dictionary.entries_have_foreign_synonyms%type,
  _entries_have_images dictionary.entries_have_images%type,
  _entries_have_audio dictionary.entries_have_audio%type,
  _entries_have_videos dictionary.entries_have_videos%type,
  _domain_secondary smallint[],
  _domain_secondary_new_name_sl varchar[],
  _domain_secondary_new_name_en varchar[],
  _language int[],
  _creator_id user_role.user_id%type,
  OUT _dictionary_id dictionary.id%type
)
LANGUAGE plpgsql AS $$
DECLARE
  _domain_secondary_id domain_secondary.id%type;
  _secondary_domain_id domain_secondary.id%type;

BEGIN
  -- Check uniqueness of names within own dictionaries.
  IF EXISTS (
    SELECT 1
    FROM dictionary
    WHERE
      count_comments IS NOT NULL AND -- Indicator of own dictionaries.
      (
        name_sl = _name_sl OR
        name_sl_short = _name_sl_short OR
        name_en = _name_en
      )
  ) THEN
    RAISE EXCEPTION 'One of dictionary names not unique among own dictionaries.';
  END IF;

  -- Create new dictionary.
  INSERT INTO dictionary (
    name_sl,
    name_sl_short,
    name_en,
    author,
    issn,
    domain_primary_id,
    count_comments,
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
    entries_have_videos
  )
  VALUES (
    _name_sl,
    _name_sl_short,
    _name_en,
    _author,
    _issn,
    _domain_primary_id,
    0,
    _entries_have_domain_labels,
    _entries_have_label,
    _entries_have_definition,
    _entries_have_synonyms,
    _entries_have_links,
    _entries_have_other,
    _entries_have_foreign_languages,
    _entries_have_foreign_definitions,
    _entries_have_foreign_synonyms,
    _entries_have_images,
    _entries_have_audio,
    _entries_have_videos
  )
  RETURNING id
  INTO _dictionary_id;

  -- Create new secondary domains, if any.
  FOR i IN 1..COALESCE(array_length(_domain_secondary_new_name_sl, 1), 0) LOOP
    INSERT INTO domain_secondary (name_sl, name_en)
    VALUES
      (_domain_secondary_new_name_sl[i], _domain_secondary_new_name_en[i])
    RETURNING id
    INTO _domain_secondary_id;

    _domain_secondary := _domain_secondary || _domain_secondary_id;
  END LOOP;

  -- Associate secondary domains, if any.
  FOREACH _secondary_domain_id IN ARRAY _domain_secondary LOOP
    INSERT INTO dictionary_domain_secondary (dictionary_id, domain_secondary_id)
    VALUES (_dictionary_id, _secondary_domain_id);
  END LOOP;

  -- Associate languages, if any.
  FOR i IN 1..COALESCE(array_length(_language, 1), 0) LOOP
    INSERT INTO dictionary_language (dictionary_id, language_id, selection_order)
    VALUES (_dictionary_id, _language[i], i);
  END LOOP;

  -- Make the creator its administrator.
  INSERT INTO user_role (user_id, role_name, dictionary_id, administration, editing, terminology_review, language_review)
  VALUES (_creator_id, 'editor', _dictionary_id, TRUE, TRUE, TRUE, TRUE);

END
$$
