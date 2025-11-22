import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Upload, Home, Play } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [transcript, setTranscript] = useState<string[]>([]);
  const [therapistImage, setTherapistImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [actionPlan, setActionPlan] = useState<string>("");
  const [goalData, setGoalData] = useState<{mainGoal: string, description: string, dailyTasks: string[]} | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

  useEffect(() => {
    // Get transcript from navigation state
    if (location.state?.transcript) {
      setTranscript(location.state.transcript);
    } else {
      toast({
        title: "No transcript found",
        description: "Please complete an interview first",
        variant: "destructive"
      });
      navigate('/interview');
    }
  }, [location.state, navigate, toast]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTherapistImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateActionPlan = async () => {
    if (transcript.length === 0) {
      toast({
        title: "No transcript",
        description: "Complete an interview first",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingPlan(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-action-plan', {
        body: { transcript }
      });

      if (error) throw error;

      // Store the structured goal data
      setGoalData(data);
      
      // Create a readable action plan text for display and video
      const planText = `${data.mainGoal}\n\n${data.description}\n\nDaily Actions:\n${data.dailyTasks.map((task: string, i: number) => `${i + 1}. ${task}`).join('\n')}`;
      setActionPlan(planText);

      // Save goal to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user && data.mainGoal) {
        const today = new Date().toISOString().split('T')[0];
        
        // Create the main goal
        const { data: goalRecord, error: goalError } = await supabase
          .from('goals')
          .insert({
            user_id: user.id,
            title: data.mainGoal,
            description: data.description,
            smart_goal: {},
            category: 'personal'
          })
          .select()
          .single();

        if (goalError) {
          console.error('Error creating goal:', goalError);
          throw new Error('Failed to create goal');
        } else if (goalRecord) {
          // Create daily tasks linked to this goal
          const dailyGoals = data.dailyTasks.map((task: string) => ({
            goal_id: goalRecord.id,
            task,
            date: today,
            completed: false
          }));

          const { error: dailyError } = await supabase
            .from('daily_goals')
            .insert(dailyGoals);

          if (dailyError) {
            console.error('Error creating daily goals:', dailyError);
            throw new Error('Failed to create daily goals');
          }
          
          // Navigate to Today page after successful creation
          toast({
            title: "Goals Created!",
            description: "Navigating to your daily tasks...",
          });
          
          setTimeout(() => {
            navigate('/today');
          }, 1500);
        }
      } else {
        toast({
          title: "Action Plan Generated",
          description: "Your personalized plan is ready"
        });
      }
    } catch (error) {
      console.error('Error generating action plan:', error);
      toast({
        title: "Error",
        description: "Failed to generate action plan",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const generateVideo = async () => {
    if (!actionPlan) {
      toast({
        title: "Generate plan first",
        description: "Please generate the action plan before creating the video",
        variant: "destructive"
      });
      return;
    }

    if (!therapistImage) {
      toast({
        title: "Upload image",
        description: "Please upload a therapist image",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingVideo(true);
    try {
      // Upload image to Supabase storage first
      const fileName = `${Date.now()}-${therapistImage.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('therapist-images')
        .upload(fileName, therapistImage, {
          contentType: therapistImage.type,
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload image');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('therapist-images')
        .getPublicUrl(fileName);

      console.log('Image uploaded, public URL:', publicUrl);

      // Call edge function with public URL
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: { 
          script: actionPlan,
          imageUrl: publicUrl
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      // Check if video generation was successful
      if (data.success && data.videoUrl) {
        setVideoUrl(data.videoUrl);
        if (data.audioUrl) {
          setAudioUrl(data.audioUrl);
        }
        
        // Save video to database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('video_results').insert({
            user_id: user.id,
            video_url: data.videoUrl,
            action_plan: actionPlan
          });
        }
        
        toast({
          title: "Video Generated!",
          description: "Navigating to Today's Goals...",
        });
        
        // Navigate to Today page after 2 seconds
        setTimeout(() => {
          navigate('/today', { state: { videoUrl: data.videoUrl } });
        }, 2000);
      } else if (data && data.success === false) {
        console.error('Video generation error data:', data);
        if (data.audioUrl) {
          setAudioUrl(data.audioUrl);
        }

        let description = data.message || 'Automatic generation is unavailable. Use the script and audio below with fal.ai or VEED to create your video manually.';
        
        if (data.error === 'connection_failed') {
          description = 'The video service is temporarily unavailable. You can still use the script and audio below to create your video manually.';
        } else if (data.error === 'generation_timeout') {
          description = 'Video generation took too long and timed out. Please try again later, or use the script and audio below manually.';
        }

        toast({
          title: "Automatic Generation Unavailable",
          description,
          variant: "default"
        });
        
        // Do not throw here so we avoid the generic failure toast
        return;
      } else {
        throw new Error(data?.message || 'Video generation failed');
      }
    } catch (error) {
      console.error('Error generating video:', error);
      toast({
        title: "Video Generation Failed",
        description: "Download the script below and use it with VEED or fal.ai to create your video.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const downloadActionPlan = () => {
    if (!actionPlan) return;
    
    const blob = new Blob([actionPlan], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'action-plan.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: "Your action plan is downloading..."
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4 pb-24">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Your Personalized Action Plan
          </h1>
          <p className="text-lg text-muted-foreground">
            Generate a video summary with your AI coach
          </p>
        </div>

        {/* Step 1: Upload Therapist Image */}
        <Card className="p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Step 1: Upload Coach Image</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="therapist-image">Choose an image of your coach</Label>
              <Input
                id="therapist-image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="mt-2"
              />
            </div>
            {imagePreview && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                <img 
                  src={imagePreview} 
                  alt="Therapist preview" 
                  className="w-32 h-32 object-cover rounded-lg border"
                />
              </div>
            )}
          </div>
        </Card>

        {/* Step 2: Generate Action Plan */}
        <Card className="p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Step 2: Generate Action Plan</h2>
          <Button 
            onClick={generateActionPlan} 
            disabled={isGeneratingPlan || transcript.length === 0}
            className="mb-4"
          >
            {isGeneratingPlan ? "Generating..." : "Generate Action Plan"}
          </Button>
          
          {actionPlan && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <p className="font-semibold">Your Action Plan:</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={downloadActionPlan}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download as TXT
                </Button>
              </div>
              <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                {actionPlan}
              </div>
            </div>
          )}
        </Card>

        {/* Step 3: Generate Video */}
        <Card className="p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Step 3: Generate Video</h2>
          <div className="space-y-4">
            <Button 
              onClick={generateVideo}
              disabled={isGeneratingVideo || !actionPlan || !therapistImage}
              size="lg"
            >
              {isGeneratingVideo ? "Generating Video..." : "Try Automatic Generation"}
            </Button>
            
            <div className="p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Process:</strong> Your video is generated in two steps:
              </p>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                <li>Converting action plan to audio using OpenAI TTS</li>
                <li>Creating video with fal.ai VEED Fabric 1.0 (image + audio)</li>
              </ol>
              <p className="text-sm text-muted-foreground mt-2">
                This may take 1-2 minutes to complete.
              </p>

              {audioUrl && (
                <div className="mt-3 p-3 rounded-md border border-dashed bg-muted/60">
                  <p className="text-sm text-muted-foreground mb-1">
                    We successfully generated your audio. You can open it and use it directly in fal.ai or VEED:
                  </p>
                  <a
                    href={audioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary underline"
                  >
                    <Play className="h-4 w-4" />
                    Open audio in new tab
                  </a>
                </div>
              )}
            </div>
          </div>
          
          {videoUrl && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Your Personalized Video:</h3>
              <video 
                controls 
                className="w-full rounded-lg border"
                src={videoUrl}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button 
            variant="outline"
            onClick={() => navigate('/')}
          >
            <Home className="mr-2 h-5 w-5" />
            Return Home
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/today')}
          >
            View Today's Goals
          </Button>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default Results;
