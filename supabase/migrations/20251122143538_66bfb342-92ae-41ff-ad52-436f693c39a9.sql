-- Create goals table
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  smart_goal JSONB NOT NULL,
  reality TEXT,
  obstacles TEXT[],
  vision TEXT,
  timeline TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily_goals table
CREATE TABLE public.daily_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  task TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;

-- Create policies for goals
CREATE POLICY "Users can view their own goals" 
ON public.goals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals" 
ON public.goals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" 
ON public.goals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" 
ON public.goals 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for daily_goals
CREATE POLICY "Users can view their own daily goals" 
ON public.daily_goals 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.goals 
  WHERE goals.id = daily_goals.goal_id 
  AND goals.user_id = auth.uid()
));

CREATE POLICY "Users can create their own daily goals" 
ON public.daily_goals 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.goals 
  WHERE goals.id = daily_goals.goal_id 
  AND goals.user_id = auth.uid()
));

CREATE POLICY "Users can update their own daily goals" 
ON public.daily_goals 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.goals 
  WHERE goals.id = daily_goals.goal_id 
  AND goals.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own daily goals" 
ON public.daily_goals 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.goals 
  WHERE goals.id = daily_goals.goal_id 
  AND goals.user_id = auth.uid()
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_goals_updated_at
BEFORE UPDATE ON public.goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();