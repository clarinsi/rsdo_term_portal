CREATE OR REPLACE FUNCTION entry_update (
  _entry_id entry.id%type,
  _is_valid entry.is_valid%type,
  _is_published entry.is_published%type,
  _is_terminology_reviewed entry.is_terminology_reviewed%type,
  _is_language_reviewed entry.is_language_reviewed%type,
  _status entry.status%type,
  _term entry.term%type,
  _version_author entry.version_author%type,
  _homonym_sort entry.homonym_sort%type,
  _domain_label_name_list VARCHAR[],
  _label entry.label%type,
  _definition entry.definition%type,
  _synonym entry.synonym%type,
  _link_list JSON[],
  _other entry.other%type,
  _foreign_language_content_list JSON[],
  _image entry.image%type,
  _audio entry.audio%type,
  _video entry.video%type,
  OUT _dictionary_id entry.dictionary_id%type
)
LANGUAGE plpgsql AS $$
DECLARE
  _domain_label_id_list INT[] := ARRAY[]::INT[];
  _domain_label_name_to_associate domain_label.name%type;
  _domain_label_id_to_associate domain_label.id%type;
  _link_to_associate JSON;
  _foreign_language_content JSON;
  _foreign_language_id_to_associate language.id%type;

BEGIN
  -- Get associated dictionary's id.
  SELECT dictionary_id
  INTO _dictionary_id
  FROM entry
  WHERE id = _entry_id;

  -- Update entry table.
  UPDATE entry
  SET
    is_valid = _is_valid,
    is_published = _is_published,
    is_terminology_reviewed = _is_terminology_reviewed,
    is_language_reviewed = _is_language_reviewed,
    status = _status,
    term = _term,
    version_author = _version_author,
    homonym_sort = _homonym_sort,
    wordforms = 'no content',
    accent = 'no content',
    pronunciation = 'no content',
    label = _label,
    definition = _definition,
    synonym = _synonym,
    other = _other,
    image = _image,
    audio = _audio,
    video = _video
  WHERE id = _entry_id;

  -- Delete all existing domain label associations.
  DELETE
  FROM entry_domain_label
  WHERE entry_id = _entry_id;

  -- Create new domain labels, if any.
  FOREACH _domain_label_name_to_associate IN ARRAY _domain_label_name_list LOOP
    _domain_label_id_to_associate := (SELECT id FROM domain_label WHERE name = _domain_label_name_to_associate);
    IF _domain_label_id_to_associate IS NULL THEN
      INSERT INTO domain_label (name, dictionary_id) VALUES (_domain_label_name_to_associate, _dictionary_id)
      returning id
      INTO _domain_label_id_to_associate;
    END IF;
    _domain_label_id_list := _domain_label_id_list || _domain_label_id_to_associate;
  END LOOP;

  -- Associate domain labels, if any.
  FOREACH _domain_label_id_to_associate IN ARRAY _domain_label_id_list LOOP
    INSERT INTO entry_domain_label (entry_id, domain_label_id)
    VALUES (_entry_id, _domain_label_id_to_associate);
  END LOOP;

  -- Delete all existing links.
  DELETE
  FROM entry_link
  WHERE entry_id = _entry_id;

  -- Associate links, if any.
  FOREACH _link_to_associate IN ARRAY _link_list LOOP
    INSERT INTO entry_link (entry_id, type, link)
    VALUES (_entry_id, (_link_to_associate ->> 'type')::entry_link_type, _link_to_associate ->> 'link');
  END LOOP;

  -- Delete all existing associated foreign content.
  DELETE
  FROM entry_foreign
  WHERE entry_id = _entry_id;

  -- Associate new foreign content, if any.
  FOREACH _foreign_language_content IN ARRAY _foreign_language_content_list LOOP
    _foreign_language_id_to_associate := (SELECT id FROM language WHERE code = _foreign_language_content ->> 'language');
    INSERT INTO entry_foreign (entry_id, language_id, term, definition, synonym)
    VALUES (
      _entry_id, _foreign_language_id_to_associate,
      json_to_array(_foreign_language_content -> 'terms'),
      _foreign_language_content ->> 'definition',
      json_to_array(_foreign_language_content -> 'synonyms')
    );
  END LOOP;

END
$$
