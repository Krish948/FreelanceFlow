create type public.project_order_status as enum ('OPEN','ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED');

create table public.project_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  description text,
  budget numeric(12,2) not null default 0 check (budget >= 0),
  hourly_rate numeric(12,2) check (hourly_rate is null or hourly_rate >= 0),
  deadline date,
  status public.project_order_status not null default 'OPEN',
  freelancer_id uuid,
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.project_orders to authenticated;
grant all on public.project_orders to service_role;
alter table public.project_orders enable row level security;

create trigger project_orders_touch before update on public.project_orders for each row execute function public.touch_updated_at();

create policy "client own orders" on public.project_orders for all to authenticated
  using (user_id = auth.uid() and public.has_role(auth.uid(),'client'))
  with check (user_id = auth.uid() and public.has_role(auth.uid(),'client'));

create policy "freelancers read open orders" on public.project_orders for select to authenticated
  using (public.has_role(auth.uid(),'freelancer') and status = 'OPEN');

create or replace function public.accept_project_order(_order_id uuid) returns public.project_order_status
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Please sign in to accept an order';
  end if;

  if not public.has_role(auth.uid(), 'freelancer') then
    raise exception 'Only freelancers can accept project orders';
  end if;

  update public.project_orders
  set freelancer_id = auth.uid(), status = 'ASSIGNED', assigned_at = now(), updated_at = now()
  where id = _order_id and status = 'OPEN' and freelancer_id is null;

  if not found then
    raise exception 'This project order is no longer available';
  end if;

  return 'ASSIGNED'::public.project_order_status;
end $$;

revoke all on function public.accept_project_order(uuid) from public, anon;
grant execute on function public.accept_project_order(uuid) to authenticated;

notify pgrst, 'reload schema';
