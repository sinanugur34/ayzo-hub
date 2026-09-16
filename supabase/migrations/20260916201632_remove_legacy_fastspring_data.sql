-- Remove legacy FastSpring billing data.
-- AYZO billing is Creem-only.

delete from public.webhook_events
where provider = 'fastspring';

delete from public.subscriptions
where provider = 'fastspring';

delete from public.billing_customers
where provider = 'fastspring';
