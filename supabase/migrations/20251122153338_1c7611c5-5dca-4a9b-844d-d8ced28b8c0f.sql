-- Add notes field to goals table
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add color field to goals for color-coding
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';

-- Add category field to goals for filtering
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS category TEXT;

-- Create video_results table to store generated videos
CREATE TABLE IF NOT EXISTS public.video_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  action_plan TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.video_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own videos"
ON public.video_results FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own videos"
ON public.video_results FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create streaks table to track user progress
CREATE TABLE IF NOT EXISTS public.streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own streaks"
ON public.streaks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own streaks"
ON public.streaks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks"
ON public.streaks FOR UPDATE
USING (auth.uid() = user_id);

-- Create awards table for achievements
CREATE TABLE IF NOT EXISTS public.awards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own awards"
ON public.awards FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own awards"
ON public.awards FOR INSERT
WITH CHECK (auth.uid() = user_id);