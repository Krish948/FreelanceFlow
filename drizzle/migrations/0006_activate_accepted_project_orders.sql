alter table public.project_orders
  add column if not exists project_id uuid references public.projects(id);

create unique index if not exists project_orders_project_id_unique
  on public.project_orders(project_id)
  where project_id is not null;

drop policy if exists "client own orders" on public.project_orders;
drop policy if exists "clients read own orders" on public.project_orders;
drop policy if exists "clients create orders" on public.project_orders;
drop policy if exists "clients edit open orders" on public.project_orders;
drop policy if exists "clients delete open orders" on public.project_orders;
drop policy if exists "freelancers read open orders" on public.project_orders;

create policy "clients read own orders" on public.project_orders for select to authenticated
  using (user_id = auth.uid() and public.has_role(auth.uid(),'client'));
create policy "clients create orders" on public.project_orders for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.has_role(auth.uid(),'client')
    and status = 'OPEN'
    and freelancer_id is null
    and project_id is null
  );
create policy "clients edit open orders" on public.project_orders for update to authenticated
  using (
    user_id = auth.uid()
    and public.has_role(auth.uid(),'client')
    and status = 'OPEN'
    and freelancer_id is null
    and project_id is null
  )
  with check (
    user_id = auth.uid()
    and public.has_role(auth.uid(),'client')
    and status = 'OPEN'
    and freelancer_id is null
    and project_id is null
  );
create policy "clients delete open orders" on public.project_orders for delete to authenticated
  using (
    user_id = auth.uid()
    and public.has_role(auth.uid(),'client')
    and status = 'OPEN'
    and freelancer_id is null
    and project_id is null
  );
create policy "freelancers read open orders" on public.project_orders for select to authenticated
  using (
    public.has_role(auth.uid(),'freelancer')
    and status = 'OPEN'
    and freelancer_id is null
    and project_id is null
    and deadline is not null
    and deadline >= current_date
  );

drop function if exists public.accept_project_order(uuid);

create function public.accept_project_order(_order_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_order public.project_orders%rowtype;
  v_client_id uuid;
  v_project_id uuid;
  v_email text;
  v_name text;
  v_company text;
  v_phone text;
  v_address text;
begin
  if auth.uid() is null then
    raise exception 'Please sign in to accept an order';
  end if;

  if not public.has_role(auth.uid(), 'freelancer') then
    raise exception 'Only freelancers can accept project orders';
  end if;

  select *
  into v_order
  from public.project_orders
  where id = _order_id
    and status = 'OPEN'
    and freelancer_id is null
    and project_id is null
  for update;

  if not found then
    raise exception 'This project order is no longer available';
  end if;

  if v_order.deadline is null then
    raise exception 'The client must add a deadline before this order can be accepted';
  end if;
  if v_order.deadline < current_date then
    raise exception 'The deadline for this project order has passed';
  end if;
  if not public.has_role(v_order.user_id, 'client') then
    raise exception 'Project orders must belong to a client account';
  end if;

  select lower(u.email)
  into v_email
  from auth.users u
  where u.id = v_order.user_id and u.email_confirmed_at is not null;

  if v_email is null then
    raise exception 'The client must verify their email before the order can be accepted';
  end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text || ':' || v_email));

  select p.name, p.business_name, p.phone, p.address
  into v_name, v_company, v_phone, v_address
  from public.profiles p
  where p.id = v_order.user_id;

  select c.id
  into v_client_id
  from public.clients c
  where c.user_id = auth.uid() and lower(c.email) = v_email
  order by c.created_at
  limit 1;

  if v_client_id is null then
    insert into public.clients (
      user_id, name, company, email, phone, address, default_hourly_rate
    )
    values (
      auth.uid(),
      coalesce(nullif(trim(v_name), ''), split_part(v_email, '@', 1)),
      nullif(trim(v_company), ''),
      v_email,
      v_phone,
      v_address,
      coalesce(v_order.hourly_rate, 0)
    )
    returning id into v_client_id;
  end if;

  insert into public.projects (
    user_id, client_id, name, description, status, budget,
    hourly_rate, start_date, deadline, shared_with_client
  )
  values (
    auth.uid(), v_client_id, v_order.name, v_order.description, 'ACTIVE',
    v_order.budget, v_order.hourly_rate, current_date, v_order.deadline, true
  )
  returning id into v_project_id;

  update public.project_orders
  set freelancer_id = auth.uid(),
      status = 'ASSIGNED',
      assigned_at = now(),
      project_id = v_project_id,
      updated_at = now()
  where id = v_order.id;

  return v_project_id;
end $$;

revoke all on function public.accept_project_order(uuid) from public, anon;
grant execute on function public.accept_project_order(uuid) to authenticated;

notify pgrst, 'reload schema';
