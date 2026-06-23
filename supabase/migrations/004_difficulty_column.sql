-- Add difficulty level to flashcards (easy / medium / hard)
alter table flashcards add column if not exists difficulty text not null default 'medium'
  check (difficulty in ('easy', 'medium', 'hard'));
