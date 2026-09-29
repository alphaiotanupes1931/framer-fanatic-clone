select cron.schedule(
  'weekly-profile-completion-reminders',
  '0 15 * * 2',
  $$select net.http_post(
    url:='https://project--16fbc371-fc48-45be-a38e-cfde7916c8b6.lovable.app/api/public/hooks/weekly-profile-reminders',
    headers:='{"Content-Type": "application/json", "apikey": "sb_publishable_WPK9ifUEWUnMOysUYbaEYQ_CTED8D-C"}'::jsonb,
    body:='{}'::jsonb,
    timeout_milliseconds:=300000
  ) as request_id;$$
);