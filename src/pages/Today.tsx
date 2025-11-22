import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, CheckCircle2, Trophy, Flame, Award, Loader2, Edit2, Check, X } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import confetti from "canvas-confetti";

interface DailyGoal {
  id: string;
  task: string;
  completed: boolean;
  goal_id: string;
  goal_title?: string;
}

const Today = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [streakData, setStreakData] = useState({ current: 0, longest: 0 });
  const [awards, setAwards] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // Check if we have a transcript from the interview
    if (location.state?.transcript) {
      generateGoalsFromTranscript(location.state.transcript);
    } else {
      fetchTodayGoals();
    }
    fetchStreaksAndAwards();
    fetchLatestVideo();
  }, []);
  
  useEffect(() => {
    const allCompleted = dailyGoals.length > 0 && dailyGoals.every(g => g.completed);
    if (allCompleted && !showCelebration) {
      triggerCelebration();
    }
  }, [dailyGoals]);

  const generateGoalsFromTranscript = async (transcript: string[]) => {
    setIsGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/interview');
        return;
      }

      // Generate action plan
      const { data: actionPlanData, error: planError } = await supabase.functions.invoke('generate-action-plan', {
        body: { transcript }
      });

      if (planError) throw planError;
      const actionPlan = actionPlanData.actionPlan;

      // Generate video with placeholder image
      const placeholderImage = "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop";
      
      const { data: videoData, error: videoError } = await supabase.functions.invoke('generate-video', {
        body: { 
          script: actionPlan,
          imageUrl: placeholderImage
        }
      });

      if (!videoError && videoData?.success && videoData?.videoUrl) {
        setVideoUrl(videoData.videoUrl);
        
        // Save to database
        await supabase.from('video_results').insert({
          user_id: user.id,
          video_url: videoData.videoUrl,
          action_plan: actionPlan
        });
      }

      // Parse action plan into goals
      const goalLines = actionPlan.split('\n').filter((line: string) => 
        line.match(/^\d+\./) || line.match(/^-/)
      );

      if (goalLines.length > 0) {
        // Create a single goal entry for this action plan
        const { data: goalData, error: goalError } = await supabase
          .from('goals')
          .insert({
            user_id: user.id,
            title: 'My Goal',
            smart_goal: { actionPlan }
          })
          .select()
          .single();

        if (!goalError && goalData) {
          // Create daily goals from action plan
          const dailyGoalsToInsert = goalLines.map((line: string) => ({
            goal_id: goalData.id,
            date: today,
            task: line.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').trim(),
            completed: false
          }));

          await supabase.from('daily_goals').insert(dailyGoalsToInsert);
        }
      }

      await fetchTodayGoals();
      
      toast({
        title: "Goals Created!",
        description: "Your personalized goals are ready",
      });
    } catch (error) {
      console.error('Error generating goals:', error);
      toast({
        title: "Error",
        description: "Failed to create goals",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const fetchTodayGoals = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('daily_goals')
        .select(`
          id,
          task,
          completed,
          goal_id,
          goals:goal_id (
            title
          )
        `)
        .eq('date', today);

      if (error) throw error;

      const goalsWithTitle = data?.map(goal => ({
        ...goal,
        goal_title: (goal.goals as any)?.title || 'My Goal'
      })) || [];

      setDailyGoals(goalsWithTitle);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGoalComplete = async (goalId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('daily_goals')
        .update({ completed: !currentStatus })
        .eq('id', goalId);

      if (error) throw error;

      setDailyGoals(prev => 
        prev.map(g => g.id === goalId ? { ...g, completed: !currentStatus } : g)
      );

      if (!currentStatus) {
        await updateStreak();
      }
      
      toast({
        title: !currentStatus ? "Complete! 🎉" : "Unmarked",
        description: !currentStatus ? "Keep going!" : undefined,
      });
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const startEdit = (goal: DailyGoal) => {
    setEditingId(goal.id);
    setEditText(goal.task);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = async (goalId: string) => {
    if (!editText.trim()) return;

    try {
      const { error } = await supabase
        .from('daily_goals')
        .update({ task: editText.trim() })
        .eq('id', goalId);

      if (error) throw error;

      setDailyGoals(prev =>
        prev.map(g => g.id === goalId ? { ...g, task: editText.trim() } : g)
      );

      setEditingId(null);
      setEditText("");

      toast({
        title: "Updated",
        description: "Goal updated successfully",
      });
    } catch (error) {
      console.error('Error updating goal:', error);
      toast({
        title: "Error",
        description: "Failed to update goal",
        variant: "destructive"
      });
    }
  };

  const fetchLatestVideo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from('video_results')
        .select('video_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!error && data) {
        setVideoUrl(data.video_url);
      }
    } catch (error) {
      console.error('Error fetching video:', error);
    }
  };
  
  const fetchStreaksAndAwards = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: streakData } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (streakData) {
        setStreakData({
          current: streakData.current_streak || 0,
          longest: streakData.longest_streak || 0
        });
      }
      
      const { data: awardsData } = await supabase
        .from('awards')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });
      
      if (awardsData) {
        setAwards(awardsData);
      }
    } catch (error) {
      console.error('Error fetching streaks/awards:', error);
    }
  };
  
  const updateStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: existingStreak } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (existingStreak) {
        const lastDate = existingStreak.last_completed_date;
        let newStreak = existingStreak.current_streak || 0;
        
        if (lastDate === yesterdayStr) {
          newStreak += 1;
        } else if (lastDate !== today) {
          newStreak = 1;
        }
        
        const newLongest = Math.max(newStreak, existingStreak.longest_streak || 0);
        
        await supabase
          .from('streaks')
          .update({
            current_streak: newStreak,
            longest_streak: newLongest,
            last_completed_date: today,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
        
        setStreakData({ current: newStreak, longest: newLongest });
        
        if (newStreak === 7) {
          await createAward('Week Warrior', 'Completed 7 days in a row!', 'Flame');
        } else if (newStreak === 30) {
          await createAward('Month Master', 'Completed 30 days in a row!', 'Trophy');
        }
      } else {
        await supabase.from('streaks').insert({
          user_id: user.id,
          current_streak: 1,
          longest_streak: 1,
          last_completed_date: today
        });
        setStreakData({ current: 1, longest: 1 });
      }
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };
  
  const createAward = async (title: string, description: string, icon: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase.from('awards').insert({
        user_id: user.id,
        title,
        description,
        icon
      });
      
      toast({
        title: `🏆 ${title}`,
        description: description,
      });
      
      fetchStreaksAndAwards();
    } catch (error) {
      console.error('Error creating award:', error);
    }
  };
  
  const triggerCelebration = () => {
    setShowCelebration(true);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    
    toast({
      title: "🎉 All Goals Complete!",
      description: "Amazing work today!",
    });
    
    setTimeout(() => setShowCelebration(false), 5000);
  };

  const completedCount = dailyGoals.filter(g => g.completed).length;
  const totalCount = dailyGoals.length;

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 flex items-center justify-center pb-24">
        <Card className="p-8 max-w-md mx-4">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Creating Your Goals</h2>
              <p className="text-sm text-muted-foreground">This may take a minute...</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-24">
      <div className="max-w-md mx-auto px-4">
        {/* Video Section */}
        {videoUrl && (
          <div className="pt-6 pb-4">
            <Card className="overflow-hidden shadow-lg border-primary/20">
              <CardContent className="p-0">
                <video 
                  controls 
                  className="w-full aspect-video"
                  src={videoUrl}
                >
                  Your browser does not support the video tag.
                </video>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Celebration Banner */}
        {showCelebration && (
          <div className="pt-6 pb-4 animate-in slide-in-from-top">
            <Card className="bg-gradient-to-r from-primary/20 to-accent/20 border-primary shadow-lg">
              <CardContent className="p-4 text-center">
                <Trophy className="h-10 w-10 mx-auto mb-2 text-primary" />
                <h2 className="text-xl font-bold">🎉 All Complete! 🎉</h2>
                <p className="text-muted-foreground text-sm mt-1">You're crushing it!</p>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Streak & Awards */}
        {(streakData.current > 0 || awards.length > 0) && (
          <div className="grid grid-cols-2 gap-3 py-4">
            {streakData.current > 0 && (
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <Flame className="h-7 w-7 text-orange-500 mb-2" />
                    <p className="text-xl font-bold">{streakData.current}</p>
                    <p className="text-xs text-muted-foreground">Day Streak</p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {awards.length > 0 && (
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <Award className="h-7 w-7 text-primary mb-2" />
                    <p className="text-xl font-bold">{awards.length}</p>
                    <p className="text-xs text-muted-foreground">Awards</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between py-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Goals</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date().toLocaleDateString('en-US', { 
                month: 'short',
                day: 'numeric'
              })}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/calendar')}
            className="gap-2 shadow-sm"
          >
            <CalendarIcon className="h-4 w-4" />
            Calendar
          </Button>
        </div>

        {/* Progress Stats */}
        {totalCount > 0 && (
          <div className="mb-4 p-4 bg-muted/30 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Progress</span>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold">{completedCount}/{totalCount}</span>
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Daily Goals */}
        <div className="pb-4">
          {loading ? (
            <div className="text-center text-muted-foreground py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading...</p>
            </div>
          ) : dailyGoals.length === 0 ? (
            <Card className="shadow-md">
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  No goals for today yet
                </p>
                <Button onClick={() => navigate('/interview')} size="sm" className="shadow-sm">
                  Set Your First Goal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {dailyGoals.map((goal) => (
                <Card key={goal.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={goal.completed}
                        onCheckedChange={() => toggleGoalComplete(goal.id, goal.completed)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        {editingId === goal.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(goal.id);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                            />
                            <Button size="icon" variant="ghost" onClick={() => saveEdit(goal.id)} className="h-8 w-8">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-8 w-8">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <p className={`font-medium text-sm ${goal.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              {goal.task}
                            </p>
                            {!goal.completed && (
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => startEdit(goal)}
                                className="h-8 w-8 shrink-0"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default Today;
