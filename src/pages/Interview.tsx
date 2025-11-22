import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Interview = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleStartInterview = () => {
    setIsRecording(true);
    toast({
      title: "Interview Started",
      description: "Speak naturally - I'm here to listen and understand.",
    });
    // TODO: Initialize LiveKit connection
  };

  const handleStopInterview = () => {
    setIsRecording(false);
    setIsProcessing(true);
    toast({
      title: "Processing Your Session",
      description: "Creating your personalized treatment plan...",
    });
    
    // TODO: Stop LiveKit, send transcript to ChatGPT, generate VEED video
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      navigate('/results');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top duration-700">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Voice Interview Session
          </h1>
          <p className="text-lg text-muted-foreground">
            Take your time. Share what's on your mind, and I'll help create a plan that works for you.
          </p>
        </div>

        {/* Recording Interface */}
        <Card className="p-8 md:p-12 border-2 animate-in fade-in zoom-in duration-700 delay-200">
          <div className="flex flex-col items-center space-y-8">
            {/* Microphone Animation */}
            <div className={`relative ${isRecording ? 'animate-pulse' : ''}`}>
              <div className={`
                w-40 h-40 rounded-full flex items-center justify-center
                transition-all duration-300
                ${isRecording 
                  ? 'bg-destructive/10 border-4 border-destructive' 
                  : 'bg-primary/10 border-4 border-primary'
                }
              `}>
                {isProcessing ? (
                  <Loader2 className="h-20 w-20 text-primary animate-spin" />
                ) : isRecording ? (
                  <MicOff className="h-20 w-20 text-destructive" />
                ) : (
                  <Mic className="h-20 w-20 text-primary" />
                )}
              </div>
              
              {isRecording && (
                <div className="absolute inset-0 rounded-full border-4 border-destructive/30 animate-ping" />
              )}
            </div>

            {/* Status Text */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">
                {isProcessing 
                  ? "Analyzing Your Session..." 
                  : isRecording 
                    ? "I'm Listening..." 
                    : "Ready When You Are"
                }
              </h2>
              <p className="text-muted-foreground">
                {isProcessing 
                  ? "Creating your personalized treatment plan" 
                  : isRecording 
                    ? "Take your time and speak freely" 
                    : "Click the button below to begin"
                }
              </p>
            </div>

            {/* Control Button */}
            <Button
              size="lg"
              className="text-lg px-12 py-6"
              variant={isRecording ? "destructive" : "default"}
              onClick={isRecording ? handleStopInterview : handleStartInterview}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : isRecording ? (
                <>
                  <MicOff className="mr-2 h-5 w-5" />
                  End Session
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-5 w-5" />
                  Start Interview
                </>
              )}
            </Button>

            {/* Instructions */}
            {!isRecording && !isProcessing && (
              <div className="mt-8 p-6 bg-muted rounded-lg max-w-md">
                <h3 className="font-semibold mb-3 text-center">During Your Session</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Share your current challenges and concerns</li>
                  <li>• Describe behaviors you'd like to change</li>
                  <li>• Tell me how you prefer to work with a coach</li>
                  <li>• Be as open and honest as you feel comfortable</li>
                </ul>
              </div>
            )}
          </div>
        </Card>

        {/* Privacy Note */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Your session is private and secure. All information is encrypted and used solely 
          to create your personalized treatment plan.
        </p>
      </div>
    </div>
  );
};

export default Interview;
