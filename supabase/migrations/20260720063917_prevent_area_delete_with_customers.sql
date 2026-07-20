create or replace function public.prevent_area_delete_with_customers()
returns trigger
language plpgsql
as $$
declare
  customer_count integer;
begin
  select count(*) into customer_count
  from public.customers
  where company_id = old.company_id
    and area = old.name;

  if customer_count > 0 then
    raise exception 'This area has % customer(s) assigned to it. Reassign or remove them before deleting.', customer_count;
  end if;

  return old;
end;
$$;

create trigger trg_prevent_area_delete_with_customers
before delete on public.areas
for each row
execute function public.prevent_area_delete_with_customers();