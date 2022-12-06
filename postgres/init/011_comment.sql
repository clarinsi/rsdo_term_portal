DROP TABLE IF EXISTS comment;
DROP TYPE IF EXISTS comment_status;
DROP TYPE IF EXISTS comment_context_type;

CREATE TYPE comment_context_type AS ENUM (
  'portal',
  'dictionary',
  'consultancy',
  'entry_dict_int',
  'entry_dict_ext',
  'entry_consult_int'
  -- 'entry_consult_ext'
);

CREATE TYPE comment_status AS ENUM ('visible', 'hidden');

CREATE TABLE comment (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message VARCHAR NOT NULL,
  author_id INT NOT NULL REFERENCES "user",
  time_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context_type comment_context_type NOT NULL,
  context_id INT,
  status comment_status NOT NULL DEFAULT 'visible',
  quoted_comment_id INT REFERENCES comment,
  CHECK (
    CASE
      WHEN context_type IN (
        'portal',
        'consultancy'
      ) THEN context_id IS NULL
      ELSE context_id IS NOT NULL
    END
  )
);

CREATE OR REPLACE FUNCTION update_time_most_recent_comment()
RETURNS TRIGGER AS $$
BEGIN
  -- Disable trigger from updating time_modified.
  SET LOCAL term_portal.skip_update_time_modified TO 'TRUE';
  -- Disable trigger from creating version history snapshot.
  SET LOCAL term_portal.skip_create_version_history_snapshot TO 'TRUE';

  UPDATE entry
  SET time_most_recent_comment =
    CASE
      WHEN TG_OP = 'INSERT' AND NEW.status = 'visible' THEN NEW.time_created
      ELSE (
        SELECT MAX(time_created)
        FROM comment
        WHERE
          context_type IN ('entry_dict_int', 'entry_dict_ext')
          AND context_id = NEW.context_id
          AND status = 'visible'
      )
    END
  WHERE id = NEW.context_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entry_update_time_most_recent_comment
AFTER INSERT OR UPDATE
ON comment
FOR EACH ROW
WHEN (NEW.context_type IN ('entry_dict_int', 'entry_dict_ext'))
EXECUTE FUNCTION update_time_most_recent_comment();
