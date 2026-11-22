-- NTN-BZR-3: use the approved Bengali public line as the initial Notun Bazar hero.
-- Preserve any administrator-authored replacement headline.
update public.marketplace_brands
set hero_headline = 'পাড়ার দোকান, হাতের কাছে।', updated_at = now()
where slug = 'notun-bazar'
  and hero_headline = 'Little shops. Big discoveries.';

notify pgrst, 'reload schema';
