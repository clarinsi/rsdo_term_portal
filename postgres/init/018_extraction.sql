CREATE TYPE extraction_status AS ENUM ('new', 'in progress', 'failed', 'finished');

CREATE TYPE extraction_job_type AS ENUM ('doc to conllu', 'conllus to term candidates', 'concordancer', 'oss term candidates');

CREATE TYPE extraction_job_status AS ENUM ('pending', 'skipped', 'in progress', 'failed', 'finished');

CREATE TABLE extraction (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INT NOT NULL REFERENCES "user",
  name VARCHAR NOT NULL,
  status extraction_status NOT NULL DEFAULT 'new',
  corpus_id UUID,
  oss_params JSONB,
  time_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_started TIMESTAMPTZ,
  time_finished TIMESTAMPTZ,
  CHECK (
    CASE
      WHEN oss_params IS NULL THEN TRUE
      ELSE corpus_id IS NULL
    END
  )
);

CREATE TABLE extraction_job (
  extraction_id INT REFERENCES extraction ON DELETE CASCADE, -- Consider indexing this one, since deletion of rows from extraction will require a scan of this table for references.
  job_type extraction_job_type,
  filename VARCHAR,
  remote_job_id BIGINT,
  status extraction_job_status NOT NULL DEFAULT 'pending',
  time_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_started TIMESTAMPTZ,
  time_finished TIMESTAMPTZ,
  PRIMARY KEY (extraction_id, job_type, filename),
  CHECK (
    CASE
      WHEN job_type = 'doc to conllu' THEN filename != ''
      ELSE filename = ''
    END
  ),
  CHECK (
    CASE
      WHEN
        job_type = 'concordancer' OR
        status = 'pending' OR
        (status = 'failed' AND time_started IS NULL)
        THEN remote_job_id IS NULL
      ELSE remote_job_id IS NOT NULL
    END
  )
);
