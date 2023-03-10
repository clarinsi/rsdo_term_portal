-- Script to set portal for importing dictionaries from Termania (Amebis) 
-- Script inserts linked_portal, linked_dictionary & dictionary records.
-- After running this script the batch job batch_update_linked.js will be importing from Termania.

do $$
DECLARE 
	linkedTermaniaId INT;
	linkedDictId INT;
	rsdoDictId INT;
	zd RECORD;
	author VARCHAR[] := ARRAY['ZRC'];

BEGIN
    -- if portal entry doesnt exist for ZrcTerm create one and remember its ID
	SELECT id INTO linkedTermaniaId FROM public.linked_portal WHERE code='AT';
	IF linkedTermaniaId IS NULL THEN
		INSERT INTO public.linked_portal(
			is_enabled, time_last_synced, code, name, url_update/*, url_index*/)
			VALUES (true, NULL, 'TA', 'Termania', 'https://api.termania.net/rsdo/1.0/dictionaries/$SOURCE_ID/entries?lastSynced=$SINCE'/*, 'https://api-demo.termania.net/rsdo/1.0/dictionaries'*/)
			RETURNING id into linkedTermaniaId;
	END IF;
	RAISE NOTICE 'Termania linked portal id = %', linkedTermaniaId;
	
	-- for each ZrcTerm dictionary create an enttry in dictionariies and one in linked dictionaries
	-- we need to remeber both ID's
	-- we create a temporary table for looping through ZrcTem dictionaries
	DROP TABLE IF EXISTS importDict;
	CREATE TEMP TABLE importDict(
		source_id VARCHAR(50),
		code VARCHAR(50),
		description VARCHAR,
		author VARCHAR,
		domain_udk_code VARCHAR,
		CONSTRAINT importDict_pkey PRIMARY KEY (source_id)
	);
	INSERT INTO importDict (source_id, code, description, author, domain_udk_code) VALUES
    ('OBRSLO', 'Obramboslovje', 'Vojaški slovar študentov obramboslovja', 'Fakulteta za družbene vede', '355'),
    ('1000102', 'Astronomija', 'Angleško-slovenski astronomski slovar', 'Raziskovalni program Astrofizika in fizika atmosfere na Fakulteti za matematiko in fiziko Univerze v Ljubljani ', '52'),
    ('1000126', 'Konjeništvo', 'Angleško-slovenski glosar s področja konjeništva', 'Sintia Marič', '796/799');

	FOR zd IN SELECT z.*, d.id AS domain_id 
				FROM importDict AS z 
				LEFT JOIN public.domain_primary AS d ON d.udk_code = z.domain_udk_code
	LOOP
		IF zd.domain_id IS NULL THEN
			RAISE NOTICE 'domain not found for %', zd.source_id;
			CONTINUE WHEN TRUE;
		END IF;
		SELECT id INTO linkedDictId FROM public.linked_dictionary 
		WHERE source_dictionary_id=zd.source_id AND linked_portal_id = linkedTermaniaId;	
		IF linkedDictId IS NULL THEN
			RAISE NOTICE 'inserting %, domain = %', zd.source_id, zd.domain_id;
			--CONTINUE WHEN TRUE;
			INSERT INTO public.dictionary(
				name_sl, name_sl_short, name_en, 
				author, issn, domain_primary_id, status 
				)
			VALUES (
				zd.description, zd.code, zd.description,
				ARRAY[zd.author], null, zd.domain_id, 'published'
			   ) RETURNING id into rsdoDictId;
			INSERT INTO public.linked_dictionary(
				name, linked_portal_id, target_dictionary_id, is_enabled, time_last_synced, source_dictionary_id)
			VALUES (zd.description, linkedTermaniaId, rsdoDictId, TRUE, NULL, zd.source_id);	
			COMMIT;
		ELSE
			RAISE NOTICE 'updating %', zd.source_id;
			CONTINUE WHEN TRUE;
		END IF;
	END LOOP;
	DROP TABLE IF EXISTS importDict;
end; $$