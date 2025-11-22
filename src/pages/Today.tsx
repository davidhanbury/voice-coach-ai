import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, CheckCircle2, Trophy, Flame, Award, Play } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [streakData, setStreakData] = useState({ current: 0, longest: 0 });
  const [awards, setAwards] = useState<any[]>([]);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchTodayGoals();
    fetchStreaksAndAwards();
    
    // Get video URL from navigation state
    if (location.state?.videoUrl) {
      setVideoUrl(location.state.videoUrl);
    } else {
      // Fetch latest video if not from navigation
      fetchLatestVideo();
    }
  }, []);
  
  useEffect(() => {
    // Check if all goals completed
    const allCompleted = dailyGoals.length > 0 && dailyGoals.every(g => g.completed);
    if (allCompleted && !showCelebration) {
      triggerCelebration();
    }
  }, [dailyGoals]);

  const fetchTodayGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // If no user, still show the page but without goals
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
        goal_title: (goal.goals as any)?.title || 'Untitled Goal'
      })) || [];

      setDailyGoals(goalsWithTitle);
    } catch (error) {
      console.error('Error fetching today goals:', error);
      toast({
        title: "Error",
        description: "Failed to load today's goals",
        variant: "destructive"
      });
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

      // Update streaks when completing a goal
      if (!currentStatus) {
        await updateStreak();
      }
      
      toast({
        title: "Updated",
        description: !currentStatus ? "Goal completed! 🎉" : "Goal unmarked",
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
      if (!user) {
        setLoading(false);
        return;
      }
      
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
      
      // Fetch streak
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
      
      // Fetch awards
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
        
        // Award milestones
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
      description: "Amazing work today! Keep it up!",
    });
    
    setTimeout(() => setShowCelebration(false), 5000);
  };

  const completedCount = dailyGoals.filter(g => g.completed).length;
  const totalCount = dailyGoals.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-24">
      <div className="max-w-md mx-auto px-4">
        {/* New Message Video */}
        <div className="pt-6 pb-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Play className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Message from Your Coach</h3>
              </div>
              <video 
                controls 
                className="w-full rounded-lg"
                src="/coach-message.mp4"
              >
                Your browser does not support the video tag.
              </video>
            </CardContent>
          </Card>
        </div>

        {/* Video Section */}
        {videoUrl && (
          <div className="pt-6 pb-4">
            <Card>
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-3">Your Coach's Message</h2>
                <video 
                  controls 
                  className="w-full rounded-lg"
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
          <div className="pt-6 pb-4">
            <Card className="bg-gradient-to-r from-primary/20 to-accent/20 border-primary">
              <CardContent className="p-4 text-center">
                <Trophy className="h-10 w-10 mx-auto mb-2 text-primary" />
                <h2 className="text-xl font-bold">🎉 All Goals Complete! 🎉</h2>
                <p className="text-muted-foreground text-sm mt-1">You're crushing it today!</p>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Streak & Awards */}
        {(streakData.current > 0 || awards.length > 0) && (
          <div className="grid grid-cols-2 gap-3 py-4">
            {streakData.current > 0 && (
              <Card>
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
              <Card>
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
            <h1 className="text-2xl font-bold text-foreground">Today</h1>
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
            className="gap-2"
          >
            <CalendarIcon className="h-4 w-4" />
            Calendar
          </Button>
        </div>

        {/* Progress Stats */}
        {totalCount > 0 && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Progress</span>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{completedCount}/{totalCount}</span>
              </div>
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Daily Goals */}
        <div className="pb-4">
          {loading ? (
            <div className="text-center text-muted-foreground py-12">Loading...</div>
          ) : dailyGoals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  No goals for today yet
                </p>
                <Button onClick={() => navigate('/interview')} size="sm">
                  Set Your First Goal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {dailyGoals.map((goal) => (
                <Card key={goal.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={goal.completed}
                        onCheckedChange={() => toggleGoalComplete(goal.id, goal.completed)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${goal.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {goal.task}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {goal.goal_title}
                        </p>
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
