import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar as CalendarIcon, CheckCircle2, Trophy, Flame, Award } from "lucide-react";
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
      if (!user) {
        navigate('/');
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Video Section */}
        {videoUrl && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Your Coach's Message</h2>
              <video 
                controls 
                className="w-full rounded-lg"
                src={videoUrl}
              >
                Your browser does not support the video tag.
              </video>
            </CardContent>
          </Card>
        )}
        
        {/* Celebration Banner */}
        {showCelebration && (
          <Card className="mb-8 bg-gradient-to-r from-primary/20 to-accent/20 border-primary">
            <CardContent className="p-6 text-center">
              <Trophy className="h-12 w-12 mx-auto mb-2 text-primary" />
              <h2 className="text-2xl font-bold">🎉 All Goals Complete! 🎉</h2>
              <p className="text-muted-foreground mt-2">You're crushing it today!</p>
            </CardContent>
          </Card>
        )}
        
        {/* Streak & Awards */}
        {(streakData.current > 0 || awards.length > 0) && (
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {streakData.current > 0 && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Flame className="h-8 w-8 text-orange-500" />
                    <div>
                      <p className="text-2xl font-bold">{streakData.current} Days</p>
                      <p className="text-sm text-muted-foreground">Current Streak</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Longest: {streakData.longest} days
                  </p>
                </CardContent>
              </Card>
            )}
            
            {awards.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Award className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{awards.length}</p>
                      <p className="text-sm text-muted-foreground">Awards Earned</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Latest: {awards[0]?.title || 'None yet'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/calendar')}
            className="gap-2"
          >
            <CalendarIcon className="h-4 w-4" />
            Calendar View
          </Button>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Today's Goals
          </h1>
          <p className="text-lg text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          {totalCount > 0 && (
            <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>{completedCount} of {totalCount} completed</span>
            </div>
          )}
        </div>

        {/* Daily Goals */}
        <Card>
          <CardHeader>
            <CardTitle>Your Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : dailyGoals.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  No goals scheduled for today
                </p>
                <Button onClick={() => navigate('/interview')}>
                  Create Your First Goal
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {dailyGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      checked={goal.completed}
                      onCheckedChange={() => toggleGoalComplete(goal.id, goal.completed)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className={`font-medium ${goal.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {goal.task}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Goal: {goal.goal_title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default Today;
