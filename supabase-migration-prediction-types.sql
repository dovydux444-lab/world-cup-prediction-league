alter table public.predictions
  add column if not exists prediction_type text not null default 'exact',
  add column if not exists outcome text;

alter table public.predictions
  alter column home_score drop not null,
  alter column away_score drop not null;

alter table public.predictions
  drop constraint if exists predictions_home_score_check,
  drop constraint if exists predictions_away_score_check,
  add constraint predictions_home_score_check check (home_score is null or (home_score >= 0 and home_score <= 12)),
  add constraint predictions_away_score_check check (away_score is null or (away_score >= 0 and away_score <= 12));

alter table public.predictions
  drop constraint if exists predictions_prediction_type_check,
  add constraint predictions_prediction_type_check check (prediction_type in ('outcome', 'exact'));

alter table public.predictions
  drop constraint if exists predictions_outcome_check,
  add constraint predictions_outcome_check check (outcome is null or outcome in ('home', 'draw', 'away'));

alter table public.predictions
  drop constraint if exists predictions_prediction_shape_check,
  add constraint predictions_prediction_shape_check check (
    (prediction_type = 'outcome' and outcome is not null and home_score is null and away_score is null)
    or
    (prediction_type = 'exact' and outcome is null and home_score is not null and away_score is not null)
  );

update public.predictions
set prediction_type = 'exact',
    outcome = null
where prediction_type is null or prediction_type = 'exact';
