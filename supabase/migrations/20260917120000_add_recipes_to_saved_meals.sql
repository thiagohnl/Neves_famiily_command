-- Recipes on saved meals: structured ingredients + steps, imported from links/photos
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS ingredients jsonb DEFAULT '[]'::jsonb;
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS steps jsonb DEFAULT '[]'::jsonb;
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS servings int;
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS prep_minutes int;
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS cook_minutes int;
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS recipe_source_url text;
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS recipe_image_url text;

-- Public bucket for recipe cover photos (same open policies as profile-photos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-photos', 'recipe-photos', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anyone can view recipe photos') THEN
    CREATE POLICY "Anyone can view recipe photos" ON storage.objects FOR SELECT USING (bucket_id = 'recipe-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anyone can upload recipe photos') THEN
    CREATE POLICY "Anyone can upload recipe photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'recipe-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anyone can update recipe photos') THEN
    CREATE POLICY "Anyone can update recipe photos" ON storage.objects FOR UPDATE USING (bucket_id = 'recipe-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anyone can delete recipe photos') THEN
    CREATE POLICY "Anyone can delete recipe photos" ON storage.objects FOR DELETE USING (bucket_id = 'recipe-photos');
  END IF;
END $$;
