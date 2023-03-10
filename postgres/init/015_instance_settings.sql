DROP TABLE IF EXISTS instance_settings;

CREATE TABLE instance_settings (
  name VARCHAR PRIMARY KEY,
  value VARCHAR NOT NULL
);

INSERT INTO instance_settings (name, value)
VALUES
  ('portal_name_sl', 'Terminološki portal'),
  ('portal_name_en', 'Terminology Portal'),
  ('portal_code', 'XX'),
  ('portal_description_sl', 'Terminološki portal je samostojna, odprto dostopna spletna storitev, v katero so vključeni terminološki viri na portalu. Registriranim uporabnikom je na voljo tudi luščilnik terminoloških kandidatov iz specializiranih korpusov, konkordančnik za pregledovanje izbranih besedil, označevalnik terminov v izbranih besedilih, urejevalnik terminoloških virov, terminološka svetovalnica in stran s pomočjo in navodili za uporabo posameznih funkcij portala. Terminološki portal je moderiran.'),
  ('portal_description_en', 'Terminology portal is an independent openly accessible on-line service that offers the use of terminology resources published on the portal. Registered users can also use an extractor to extract term candidates from specialized corpora, a concordance tool to review selected texts, a term mark-up tool, edit terminology resource with an editor, take advantage of terminology consulting and access a help page with instructions for use of all Portal functions. The Terminology Portal is moderated.'),
  ('is_extraction_enabled', 'T'),
  ('is_dictionaries_enabled', 'T'),
  ('is_consultancy_enabled', 'T'),
  ('min_entries_per_dictionary', '1'),
  ('dictionary_publish_approval', 'F'),
  ('keep_num_of_exports_per_dictionary', '-1'),
  ('dictionary_auto_save_frequency', 'disabled'), -- The other kinds being 'monthly' and 'yearly'.
  ('num_of_history_entires_per_entry', '-1'),
  ('can_publish_entries_in_edit', 'F'),
  ('consultancy_type', 'own'), -- The other kind would be 'ZRC'.
  ('zrc_email', 'termin@zrc-sazu.si'),
  ('zrc_url', 'https://zrc-sazu.si/sites/default/files/xml/term-exp.xml');

CREATE OR REPLACE FUNCTION generate_short_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name_sl_short := (SELECT value FROM instance_settings WHERE name = 'portal_code') || NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dictionary_generate_short_name
BEFORE INSERT
ON dictionary
FOR EACH ROW
WHEN (NEW.name_sl_short IS NULL)
EXECUTE FUNCTION generate_short_name();
