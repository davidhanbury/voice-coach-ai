import { useState, useEffect } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LiveKitConnection {
  room: Room | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  transcript: string[];
  connect: (roomName: string) => Promise<void>;
  disconnect: () => void;
}

export const useLiveKit = (): LiveKitConnection => {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const { toast } = useToast();

  const connect = async (roomName: string) => {
    try {
      setIsConnecting(true);
      setError(null);

      console.log('Getting LiveKit token for room:', roomName);

      // Get LiveKit token from edge function (public endpoint, no auth required)
      const { data, error: tokenError } = await supabase.functions.invoke('livekit-token', {
        body: { roomName }
      });

      if (tokenError) {
        throw new Error(`Failed to get token: ${tokenError.message}`);
      }

      if (!data?.token || !data?.url) {
        throw new Error('Invalid response from token endpoint');
      }

      console.log('Token received, connecting to LiveKit...');

      // Create and connect to room
      const newRoom = new Room();
      
      // Set up event listeners
      newRoom.on(RoomEvent.Connected, () => {
        console.log('Connected to LiveKit room');
        setIsConnected(true);
        setIsConnecting(false);
        toast({
          title: 'Connected',
          description: 'Voice session started successfully',
        });
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from LiveKit room');
        setIsConnected(false);
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('Track subscribed:', track.kind, 'from', participant.identity);
        
        if (track.kind === Track.Kind.Audio) {
          const audioElement = track.attach();
          document.body.appendChild(audioElement);
        }
      });

      newRoom.on(RoomEvent.DataReceived, (payload, participant) => {
        const decoder = new TextDecoder();
        const message = decoder.decode(payload);
        console.log('Data received from', participant?.identity, ':', message);
        
        try {
          const data = JSON.parse(message);
          if (data.type === 'transcript' && data.text) {
            setTranscript(prev => [...prev, `${participant?.identity}: ${data.text}`]);
          }
        } catch (e) {
          console.error('Failed to parse data message:', e);
        }
      });

      // Connect to the room
      await newRoom.connect(data.url, data.token);
      
      // Enable microphone
      await newRoom.localParticipant.setMicrophoneEnabled(true);
      
      setRoom(newRoom);
      
    } catch (err) {
      console.error('Failed to connect to LiveKit:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
      setError(errorMessage);
      setIsConnecting(false);
      toast({
        title: 'Connection Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const disconnect = () => {
    if (room) {
      console.log('Disconnecting from LiveKit room');
      room.disconnect();
      setRoom(null);
      setIsConnected(false);
      toast({
        title: 'Disconnected',
        description: 'Voice session ended',
      });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [room]);

  return {
    room,
    isConnecting,
    isConnected,
    error,
    transcript,
    connect,
    disconnect,
  };
};
