-- Script to set portal for importing dictionaries from Terminologišče (ZRC-SAZU)
-- Script inserts linked_portal, linked_dictionary & dictionary records.
-- After running this script the batch job batch_update_linked.js will be importing from Terminologišče.

do $$
DECLARE 
	linkedZrcTermId INT;
	linkedDictId INT;
	rsdoDictId INT;
	zd RECORD;
	author VARCHAR[] := ARRAY['ZRC'];

BEGIN
    -- if portal entry doesnt exist for ZrcTerm create one and remember its ID
	SELECT id INTO linkedZrcTermId FROM public.linked_portal WHERE code='ZT';	
	IF linkedZrcTermId IS NULL THEN
		INSERT INTO public.linked_portal(
			is_enabled, time_last_synced, code, name, url_update/*, url_index*/)
			VALUES (true, NULL, 'ZT', 'ZRC-SAZU/Terminologišče', 'https://iskalnik4ts.zrc-sazu.si/rsdo/updates?dictionaryId=$SOURCE_ID&since=$SINCE'/*, 'https://iskalnik4ts.zrc-sazu.si/rsdo/dictionaries'*/)
			RETURNING id into linkedZrcTermId;
	END IF;
	RAISE NOTICE 'ZrcTerm linked portal id = %', linkedZrcTermId;
	
	-- for each ZrcTerm dictionary create an enttry in dictionariies and one in linked dictionaries
	-- we need to remeber both ID's
	-- we create a temporary table for looping through ZrcTem dictionaries
	DROP TABLE IF EXISTS zrcTermDic;
	CREATE TEMP TABLE zrcTermDic(
		source_id VARCHAR(50),
		code VARCHAR(50),
		description VARCHAR,
		domain_udk_code VARCHAR,		
		CONSTRAINT dictionary_pkey PRIMARY KEY (source_id)
	);
	INSERT INTO zrcTermDic (source_id, code, description, domain_udk_code) VALUES
		('farmacija','ZTFARMAC','Farmacevtski terminološki slovar ZRC-SAZU/Terminologišče', '61'),
		('betonske_konstrukcije','ZTBETON','Terminološki slovar betonskih konstrukcij ZRC-SAZU/Terminologišče', '624'),
		('pravo','ZTPRAVO','Pravni terminološki slovar ZRC-SAZU/Terminologišče', '34'),
		('avtomatika','ZTAVTOMAT','Terminološki slovar avtomatike ZRC-SAZU/Terminologišče', '621.3'),
		('urbanizem','ZTURBAN','Urbanistični terminološki slovar ZRC-SAZU/Terminologišče', '711'),
		('umetnost','ZTUMETN','Terminološki slovar uporabne umetnosti – pohištvo, ure, orožje ZRC-SAZU/Terminologišče', '93/94'),
		('tolkala','ZTTOLKAL','Tolkalni terminološki slovar ZRC-SAZU/Terminologišče', '93/94'),
		('botanika','ZTBOTAN','Botanični terminološki slovar ZRC-SAZU/Terminologišče', '58'),
		('smucanje','ZTSMUČ','Slovenski smučarski slovar ZRC-SAZU/Terminologišče', '796/799'),
		('gledalisce','ZTGLED','Gledališki terminološki slovar ZRC-SAZU/Terminologišče', '93/94'),
		('cebelarstvo','ZTCEBEL','Čebelarski terminološki slovar ZRC-SAZU/Terminologišče', '59'),
		('geologija','ZTGEOLOG','Geološki terminološki slovar ZRC-SAZU/Terminologišče', '55'),
		('gemologija','ZTGEMOLOG','Gemološki terminološki slovar ZRC-SAZU/Terminologišče', '622'),
		('geografija','ZTGEOGRAF','Geografski terminološki slovar ZRC-SAZU/Terminologišče', '338'),
		('planinstvo','ZTPLANIN','Planinski terminološki slovar ZRC-SAZU/Terminologišče', '796/799');
		
	FOR zd IN SELECT z.*, d.id AS domain_id 
				FROM zrcTermDic AS z 
				LEFT JOIN public.domain_primary AS d ON d.udk_code = z.domain_udk_code
	LOOP
		IF zd.domain_id IS NULL THEN
			RAISE NOTICE 'domain not found for %', zd.source_id;
			CONTINUE WHEN TRUE;
		END IF;
		SELECT id INTO linkedDictId FROM public.linked_dictionary 
		WHERE source_dictionary_id=zd.source_id AND linked_portal_id = linkedZrcTermId;	
		IF linkedDictId IS NULL THEN
			RAISE NOTICE 'inserting %, domain = %', zd.source_id, zd.domain_id;
			--CONTINUE WHEN TRUE;
			INSERT INTO public.dictionary(
				name_sl, name_sl_short, name_en, 
				author, issn, domain_primary_id, status 
				)
			VALUES (
				zd.description, zd.code, zd.description,
				author, null, zd.domain_id, 'published'
			   ) RETURNING id into rsdoDictId;
			INSERT INTO public.linked_dictionary(
				name, linked_portal_id, target_dictionary_id, is_enabled, time_last_synced, source_dictionary_id)
			VALUES (zd.description, linkedZrcTermId, rsdoDictId, TRUE, NULL, zd.source_id);	
			COMMIT;
		ELSE
			RAISE NOTICE 'updating %', zd.source_id;
			CONTINUE WHEN TRUE;
		END IF;
	END LOOP;
	DROP TABLE IF EXISTS zrcTermDic;
end; $$