CREATE OR REPLACE FUNCTION json_to_array (json)
RETURNS TEXT[]
AS $$
SELECT COALESCE(array_agg(x), 
  CASE WHEN $1 IS NULL THEN NULL ELSE ARRAY[]::TEXT[] END)
FROM json_array_elements_text($1) t(x);
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION entry_new (
  _dictionary_id entry.dictionary_id%type,
  _is_valid entry.is_valid%type,
  _status entry.status%type,
  _term entry.term%type,
  _version_author entry.version_author%type,
  _homonym_sort entry.homonym_sort%type,
  _wordforms entry.wordforms%type,
  _accent entry.accent%type,
  _pronunciation entry.pronunciation%type,
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
  OUT _entry_id entry.id%type
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
  -- Create new entry.
  INSERT INTO entry (
    dictionary_id,
    is_valid,
    status,
    term,
    version_author,
    homonym_sort,
    wordforms,
    accent,
    pronunciation,
    label,
    definition,
    synonym,
    other,
    image,
    audio,
    video
  )
  VALUES (
    _dictionary_id,
    _is_valid,
    _status,
    _term,
    _version_author,
    _homonym_sort,
    -- It would be better if instead of hardcoding the string, it said:
    -- If value is NULL, insert the default value.
    COALESCE(_wordforms, 'no content'),
    COALESCE(_accent, 'no content'),
    COALESCE(_pronunciation, 'no content'),
    _label,
    _definition,
    _synonym,
    _other,
    _image,
    _audio,
    _video
  )
  RETURNING id
  INTO _entry_id;

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

  -- Associate links, if any.
  FOREACH _link_to_associate IN ARRAY _link_list LOOP
    INSERT INTO entry_link (entry_id, type, link)
    VALUES (_entry_id, (_link_to_associate ->> 'type')::entry_link_type, _link_to_associate ->> 'link');
  END LOOP;

  -- Associate languages, if any.
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
