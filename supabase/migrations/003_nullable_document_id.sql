-- Allow group-level rows that have group_id but no document_id

alter table summaries     alter column document_id drop not null;
alter table flashcards    alter column document_id drop not null;
alter table quizzes       alter column document_id drop not null;
alter table chat_sessions alter column document_id drop not null;

-- Add a check so every row still has at least one of the two FKs
alter table summaries     add constraint summaries_has_owner
  check (document_id is not null or group_id is not null);

alter table flashcards    add constraint flashcards_has_owner
  check (document_id is not null or group_id is not null);

alter table quizzes       add constraint quizzes_has_owner
  check (document_id is not null or group_id is not null);

alter table chat_sessions add constraint chat_sessions_has_owner
  check (document_id is not null or group_id is not null);
