-- Add start_time and end_time to activities table
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS start_time time;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS end_time time;

-- Add some sample times to existing activities for demonstration
UPDATE public.activities
SET start_time = '09:00:00', end_time = '15:00:00'
WHERE name = 'Visit the Park';

UPDATE public.activities
SET start_time = '18:00:00', end_time = '20:00:00'
WHERE name = 'Movie Night';