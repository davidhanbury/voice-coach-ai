import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useLiveKit } from "@/hooks/useLiveKit";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface LiveKitVoiceProps {
  roomName: string;
  onTranscriptComplete?: (transcript: string[]) => void;
}

const LiveKitVoice = ({ roomName, onTranscriptComplete }: LiveKitVoiceProps) => {
  const { isConnecting, isConnected, error, transcript, connect, disconnect } = useLiveKit();
  const [sessionStarted, setSessionStarted] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (error) {
      toast({
        title: "Connection Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleStartSession = async () => {
    setSessionStarted(true);
    await connect(roomName);
  };

  const handleEndSession = () => {
    disconnect();
    setSessionStarted(false);
    
    if (onTranscriptComplete) {
      onTranscriptComplete(transcript);
    }

    // Process transcript and navigate to results
    toast({
      title: "Processing Session",
      description: "Generating your personalized treatment plan...",
    });

    // Simulate processing time
    setTimeout(() => {
      navigate('/results');
    }, 2000);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card className="p-8 md:p-12 border-2">
        <div className="flex flex-col items-center space-y-8">
          {/* Microphone Animation */}
          <div className={`relative ${isConnected ? 'animate-pulse' : ''}`}>
            <div className={`
              w-40 h-40 rounded-full flex items-center justify-center
              transition-all duration-300
              ${isConnected 
                ? 'bg-destructive/10 border-4 border-destructive' 
                : 'bg-primary/10 border-4 border-primary'
              }
            `}>
              {isConnecting ? (
                <Loader2 className="h-20 w-20 text-primary animate-spin" />
              ) : isConnected ? (
                <MicOff className="h-20 w-20 text-destructive" />
              ) : (
                <Mic className="h-20 w-20 text-primary" />
              )}
            </div>
            
            {isConnected && (
              <div className="absolute inset-0 rounded-full border-4 border-destructive/30 animate-ping" />
            )}
          </div>

          {/* Status Text */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">
              {isConnecting 
                ? "Connecting..." 
                : isConnected 
                  ? "I'm Listening..." 
                  : "Ready When You Are"
              }
            </h2>
            <p className="text-muted-foreground">
              {isConnecting 
                ? "Setting up your voice session" 
                : isConnected 
                  ? "Take your time and speak freely" 
                  : "Click the button below to begin"
              }
            </p>
          </div>

          {/* Control Button */}
          <Button
            size="lg"
            className="text-lg px-12 py-6"
            variant={isConnected ? "destructive" : "default"}
            onClick={isConnected ? handleEndSession : handleStartSession}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Connecting...
              </>
            ) : isConnected ? (
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
          {!sessionStarted && (
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

          {/* Transcript Preview */}
          {transcript.length > 0 && (
            <div className="w-full mt-4 p-4 bg-muted rounded-lg max-h-40 overflow-y-auto">
              <h4 className="font-semibold mb-2 text-sm">Transcript Preview:</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                {transcript.slice(-5).map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
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
  );
};

export default LiveKitVoice;
