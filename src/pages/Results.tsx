import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Upload, Home, Play } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [transcript, setTranscript] = useState<string[]>([]);
  const [therapistImage, setTherapistImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [actionPlan, setActionPlan] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
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

      setActionPlan(data.actionPlan);
      toast({
        title: "Action Plan Generated",
        description: "Your personalized plan is ready"
      });
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
      // Convert image to base64
      const reader = new FileReader();
      reader.readAsDataURL(therapistImage);
      
      await new Promise((resolve) => {
        reader.onloadend = resolve;
      });

      const imageBase64 = reader.result as string;

      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: { 
          script: actionPlan,
          imageUrl: imageBase64
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      // Check if video generation was successful
      if (data.success && data.videoUrl) {
        setVideoUrl(data.videoUrl);
        toast({
          title: "Video Generated!",
          description: "Your personalized video is ready"
        });
      } else if (data.success === false && data.error === 'connection_failed') {
        // Handle connection errors gracefully
        toast({
          title: "Automatic Generation Unavailable",
          description: "Use the script and image below with VEED or fal.ai to create your video manually.",
          variant: "default"
        });
      } else {
        throw new Error(data.message || 'Video generation failed');
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4">
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
                <strong>Manual Alternative:</strong> If automatic generation fails:
              </p>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                <li>Visit <a href="https://fal.ai/models/fal-ai/ai-avatar" target="_blank" rel="noopener" className="text-primary underline">fal.ai/ai-avatar</a> or <a href="https://www.veed.io" target="_blank" rel="noopener" className="text-primary underline">VEED.io</a></li>
                <li>Upload the coach image from Step 1</li>
                <li>Paste the action plan text from Step 2</li>
                <li>Generate your personalized video</li>
              </ol>
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
    </div>
  );
};

export default Results;
