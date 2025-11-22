import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AudioRecorder, encodeAudioForAPI, playAudioData, clearAudioQueue } from '@/utils/RealtimeAudio';
import { useNavigate } from 'react-router-dom';

interface OpenAIVoiceInterfaceProps {
  roomName: string;
  onTranscriptComplete: (transcript: string[]) => void;
}

const OpenAIVoiceInterface = ({ roomName, onTranscriptComplete }: OpenAIVoiceInterfaceProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleStartSession = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Initialize audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });

      // Connect to edge function WebSocket
      const wsUrl = `wss://lbxkcrdzyfidbwulyagu.supabase.co/functions/v1/openai-realtime`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = async () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);

        // Start recording microphone
        recorderRef.current = new AudioRecorder((audioData) => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: encodeAudioForAPI(audioData)
            }));
          }
        });
        
        await recorderRef.current.start();
        
        toast({
          title: "Session Started",
          description: "You can start speaking now",
        });
      };

      wsRef.current.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log('Received:', data.type);

        switch (data.type) {
          case 'response.audio.delta':
            setIsSpeaking(true);
            const binaryString = atob(data.delta);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            if (audioContextRef.current) {
              await playAudioData(audioContextRef.current, bytes);
            }
            break;

          case 'response.audio.done':
            setIsSpeaking(false);
            break;

          case 'conversation.item.input_audio_transcription.completed':
            if (data.transcript) {
              setTranscript(prev => [...prev, `User: ${data.transcript}`]);
            }
            break;

          case 'response.audio_transcript.delta':
            if (data.delta) {
              setTranscript(prev => {
                const lastItem = prev[prev.length - 1];
                if (lastItem?.startsWith('AI: ')) {
                  const updated = [...prev];
                  updated[updated.length - 1] = lastItem + data.delta;
                  return updated;
                }
                return [...prev, `AI: ${data.delta}`];
              });
            }
            break;

          case 'error':
            console.error('OpenAI error:', data.error);
            setError(data.error.message);
            break;
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error occurred');
        setIsConnecting(false);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
        setIsConnecting(false);
      };

    } catch (err) {
      console.error('Error starting session:', err);
      setError(err instanceof Error ? err.message : 'Failed to start session');
      setIsConnecting(false);
    }
  };

  const handleEndSession = () => {
    // Stop recording
    recorderRef.current?.stop();
    
    // Close WebSocket
    wsRef.current?.close();
    
    // Clear audio queue
    clearAudioQueue();
    
    // Close audio context
    audioContextRef.current?.close();
    
    // Reset state
    setIsConnected(false);
    setIsSpeaking(false);
    
    // Pass transcript and navigate
    onTranscriptComplete(transcript);
    navigate('/results', { state: { transcript } });
    
    toast({
      title: "Session Ended",
      description: "Processing your interview...",
    });
  };

  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      wsRef.current?.close();
      clearAudioQueue();
      audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  return (
    <Card className="p-8 bg-card/50 backdrop-blur border-border/50">
      <div className="flex flex-col items-center gap-8">
        {/* Microphone Icon */}
        <div className={`relative ${isConnected && isSpeaking ? 'animate-pulse' : ''}`}>
          <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
            isConnected 
              ? isSpeaking 
                ? 'bg-primary/20 border-4 border-primary' 
                : 'bg-muted border-4 border-primary/50'
              : 'bg-muted/50 border-4 border-border'
          }`}>
            {isConnecting ? (
              <Loader2 className="w-12 h-12 text-muted-foreground animate-spin" />
            ) : isConnected ? (
              <Mic className="w-12 h-12 text-primary" />
            ) : (
              <MicOff className="w-12 h-12 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-foreground">
            {isConnecting 
              ? 'Connecting...' 
              : isConnected 
                ? isSpeaking 
                  ? 'AI is speaking...' 
                  : 'Listening...'
                : 'Ready to start'
            }
          </p>
          {isConnected && (
            <p className="text-sm text-muted-foreground">
              Speak naturally. The AI will respond when you're done.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          {!isConnected ? (
            <Button 
              onClick={handleStartSession}
              disabled={isConnecting}
              size="lg"
              className="min-w-[200px]"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Start Interview'
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleEndSession}
              variant="destructive"
              size="lg"
              className="min-w-[200px]"
            >
              End Session
            </Button>
          )}
        </div>

        {/* Transcript Preview */}
        {transcript.length > 0 && (
          <div className="w-full mt-8 p-4 bg-muted/50 rounded-lg max-h-48 overflow-y-auto">
            <p className="text-sm font-medium text-foreground mb-2">Transcript Preview:</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              {transcript.slice(-5).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default OpenAIVoiceInterface;
