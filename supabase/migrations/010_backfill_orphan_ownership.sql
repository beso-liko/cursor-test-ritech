-- Backfill missing user_id values on documents/folders created before per-user auth.

-- Documents inherit ownership from their folder when the folder already has an owner.
update documents d
set user_id = g.user_id
from document_groups g
where d.user_id is null
  and d.group_id = g.id
  and g.user_id is not null;

-- Folders inherit the most common owner among documents already assigned in that folder.
with folder_owner as (
  select
    d.group_id,
    d.user_id,
    count(*) as doc_count,
    row_number() over (
      partition by d.group_id
      order by count(*) desc, d.user_id
    ) as rank
  from documents d
  where d.group_id is not null
    and d.user_id is not null
  group by d.group_id, d.user_id
)
update document_groups g
set user_id = fo.user_id
from folder_owner fo
where g.user_id is null
  and g.id = fo.group_id
  and fo.rank = 1;

-- Retry document inheritance after folder owners were backfilled.
update documents d
set user_id = g.user_id
from document_groups g
where d.user_id is null
  and d.group_id = g.id
  and g.user_id is not null;

-- Remaining ungrouped legacy documents predate per-user auth; assign to the
-- account that already owns the majority of content in this project.
with primary_owner as (
  select user_id
  from documents
  where user_id is not null
  group by user_id
  order by count(*) desc
  limit 1
)
update documents d
set user_id = po.user_id
from primary_owner po
where d.user_id is null
  and d.group_id is null;

-- Any leftover folders without owners follow the same primary owner heuristic.
with primary_owner as (
  select user_id
  from documents
  where user_id is not null
  group by user_id
  order by count(*) desc
  limit 1
)
update document_groups g
set user_id = po.user_id
from primary_owner po
where g.user_id is null;

-- Final pass after folder owners are restored.
update documents d
set user_id = g.user_id
from document_groups g
where d.user_id is null
  and d.group_id = g.id
  and g.user_id is not null;
