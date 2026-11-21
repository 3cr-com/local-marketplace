-- A seller can operate multiple independent shops. The original core schema made
-- shops.owner_id unique; retain the owner foreign key but remove only that rule.
alter table public.shops drop constraint if exists shops_owner_id_key;
create index if not exists shops_owner_id_idx on public.shops(owner_id);
notify pgrst, 'reload schema';
