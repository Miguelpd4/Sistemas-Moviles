-- #27 · Marcar un pago como hecho. Lo puede marcar quien paga o quien cobra (no hay pasarela real:
-- se paga por PayPal o Bizum fuera de la app).
create function public.mark_payment_paid(p_payment_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_payment public.payments;
begin
  select * into v_payment from public.payments where id = p_payment_id;
  if not found or (select auth.uid()) not in (v_payment.from_user, v_payment.to_user) then
    raise exception 'NOT_MEMBER';
  end if;
  update public.payments set status = 'pagado', paid_at = now()
    where id = p_payment_id and status = 'pendiente';
end; $$;
revoke execute on function public.mark_payment_paid(uuid) from public, anon;
grant execute on function public.mark_payment_paid(uuid) to authenticated;
