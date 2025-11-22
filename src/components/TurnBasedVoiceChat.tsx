import { useState, useRef, useEffect } from 'react';
import { Mic, Loader2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TurnBasedVoiceChatProps {
  onTranscriptComplete: (transcript: string[]) => void;
}

const TurnBasedVoiceChat = ({ onTranscriptComplete }: TurnBasedVoiceChatProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Start with AI greeting
    const startConversation = async () => {
      await sendAIMessage("Hello! I'm here to listen. How are you feeling today?");
    };
    startConversation();
  }, []);

  const sendAIMessage = async (text: string) => {
    const newMessage: Message = { role: 'assistant', content: text };
    setMessages(prev => [...prev, newMessage]);
    setTranscript(prev => [...prev, `AI: ${text}`]);

    // Convert to speech
    try {
      const { data, error } = await supabase.functions.invoke('text-to-voice', {
        body: { text, voice: 'alloy' }
      });

      if (error) throw error;

      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      setCurrentAudio(audio);
      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      toast({
        title: "Recording",
        description: "Speak now, then click Stop when done",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;

      // 1. Voice to text
      console.log('Transcribing audio...');
      const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio }
      });

      if (transcriptError) throw transcriptError;
      const userText = transcriptData.text;
      console.log('User said:', userText);

      const userMessage: Message = { role: 'user', content: userText };
      setMessages(prev => [...prev, userMessage]);
      setTranscript(prev => [...prev, `User: ${userText}`]);

      // 2. Get AI response
      console.log('Getting AI response...');
      const { data: chatData, error: chatError } = await supabase.functions.invoke('therapy-chat', {
        body: { messages: [...messages, userMessage] }
      });

      if (chatError) throw chatError;
      const aiText = chatData.reply;
      console.log('AI replied:', aiText);

      // 3. Send AI message (which will convert to speech)
      await sendAIMessage(aiText);

    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to process audio',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const endSession = () => {
    currentAudio?.pause();
    onTranscriptComplete(transcript);
    navigate('/', { state: { transcript } });
    
    toast({
      title: "Processing...",
      description: "Creating your personalized goals",
    });
  };

  return (
    <Card className="p-6 md:p-8 bg-card/50 backdrop-blur-sm border-border/50 shadow-lg rounded-2xl">
      <div className="flex flex-col items-center gap-6">
        {/* Microphone Icon */}
        <div className={`relative ${isRecording ? 'animate-pulse' : ''}`}>
          <div className={`w-28 h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
            isProcessing 
              ? 'bg-muted border-4 border-muted-foreground'
              : isRecording 
                ? 'bg-primary/20 border-4 border-primary shadow-primary/20' 
                : 'bg-muted border-4 border-border'
          }`}>
            {isProcessing ? (
              <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground animate-spin" />
            ) : isRecording ? (
              <Mic className="w-10 h-10 md:w-12 md:h-12 text-primary" />
            ) : (
              <Volume2 className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center space-y-2">
          <p className="text-base md:text-lg font-medium text-foreground">
            {isProcessing 
              ? 'Thinking...' 
              : isRecording 
                ? 'Recording - Click Stop when done' 
                : 'Click Record to respond'
            }
          </p>
          <p className="text-sm text-muted-foreground">
            {messages.length === 0 ? 'Starting conversation...' : 'Turn-based voice chat'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!isRecording && !isProcessing && (
            <Button 
              onClick={startRecording}
              size="lg"
              className="min-w-[130px] shadow-md"
            >
              <Mic className="mr-2 h-4 w-4" />
              Record
            </Button>
          )}
          
          {isRecording && (
            <Button 
              onClick={stopRecording}
              variant="destructive"
              size="lg"
              className="min-w-[130px] shadow-md"
            >
              Stop Recording
            </Button>
          )}

          {messages.length > 1 && !isRecording && !isProcessing && (
            <Button 
              onClick={endSession}
              variant="outline"
              size="lg"
              className="shadow-md"
            >
              End Session
            </Button>
          )}
        </div>

        {/* Transcript Preview */}
        {transcript.length > 0 && (
          <div className="w-full mt-6 p-4 bg-muted/30 rounded-xl max-h-44 overflow-y-auto shadow-sm">
            <p className="text-sm font-medium text-foreground mb-2">Conversation:</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              {transcript.slice(-5).map((line, i) => (
                <p key={i} className={line.startsWith('User:') ? 'text-primary font-medium' : ''}>{line}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default TurnBasedVoiceChat;
