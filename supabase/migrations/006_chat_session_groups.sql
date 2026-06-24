-- Allow group-only chat sessions (document_id was previously NOT NULL)
alter table chat_sessions alter column document_id drop not null;

-- Drop the old unconditional unique constraint on document_id
-- (PostgreSQL auto-names it <table>_<column>_key)
alter table chat_sessions drop constraint if exists chat_sessions_document_id_key;

-- Partial unique indexes: one session per document, one session per group
create unique index if not exists chat_sessions_document_unique
  on chat_sessions (document_id) where document_id is not null;

create unique index if not exists chat_sessions_group_unique
  on chat_sessions (group_id) where group_id is not null;

-- Ensure every row is owned by either a document or a group
alter table chat_sessions
  add constraint chat_sessions_has_owner
  check (document_id is not null or group_id is not null);
