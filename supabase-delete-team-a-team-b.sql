delete from public.predictions
where match_id in (
  select id from public.matches
  where home_team = 'Team A' and away_team = 'Team B'
);

delete from public.matches
where home_team = 'Team A' and away_team = 'Team B';
