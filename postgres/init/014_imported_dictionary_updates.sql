-- changing data type for external_id field
ALTER TABLE IF EXISTS public.entry DROP COLUMN IF EXISTS external_id;
ALTER TABLE IF EXISTS public.entry
    ADD COLUMN external_id character varying(50) COLLATE pg_catalog."C";
COMMENT ON COLUMN public.entry.external_id
    IS 'Used for identifying imported entries. NULL for own.';

-- changing data type for external_url field
ALTER TABLE IF EXISTS public.entry DROP COLUMN IF EXISTS external_url;
ALTER TABLE IF EXISTS public.entry
    ADD COLUMN external_url character varying(255) COLLATE pg_catalog."C";
COMMENT ON COLUMN public.entry.external_url
    IS 'url where original imported entry is available. ';

-- cleaning up entry indexes
DROP INDEX IF EXISTS public.ux_entry_dictionary_external_id;
CREATE UNIQUE INDEX IF NOT EXISTS ux_entry_dictionary_external_id
    ON public.entry USING btree
    (dictionary_id ASC NULLS LAST, external_id COLLATE pg_catalog."C" ASC NULLS LAST)
    TABLESPACE pg_default;

DROP INDEX IF EXISTS public.ux_entry_forign_entry_id_language_id;
CREATE UNIQUE INDEX IF NOT EXISTS ux_entry_forign_entry_id_language_id
    ON public.entry_foreign USING btree
    (entry_id ASC NULLS LAST, language_id ASC NULLS LAST)
    TABLESPACE pg_default;

DROP INDEX IF EXISTS public.ux_language_code;
CREATE UNIQUE INDEX IF NOT EXISTS ux_language_code
    ON public.language USING btree
    (code COLLATE pg_catalog."C" ASC NULLS LAST)
    TABLESPACE pg_default;

-- adding batch procesing
CREATE TABLE IF NOT EXISTS public.batch
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    job_name character varying(255) COLLATE pg_catalog."C" NOT NULL,
    job_state character(1) COLLATE pg_catalog."C" NOT NULL,
    started timestamp(3) with time zone NOT NULL DEFAULT now(),
    thread character varying(36) COLLATE pg_catalog."C" NOT NULL,
    report text COLLATE pg_catalog."default",
    changed timestamp(3) with time zone,
    ended timestamp(3) with time zone,
    CONSTRAINT batch_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;
ALTER TABLE IF EXISTS public.batch OWNER to postgres;
COMMENT ON TABLE public.batch IS 'batch processing status';

CREATE INDEX IF NOT EXISTS "IX_BATCH_NAME_STARTED_STATE"
    ON public.batch USING btree
    (job_name COLLATE pg_catalog."C" ASC NULLS LAST, started ASC NULLS LAST)
    TABLESPACE pg_default;

