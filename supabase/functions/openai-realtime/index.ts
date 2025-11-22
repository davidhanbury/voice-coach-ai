import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Upgrade to WebSocket
    const upgrade = req.headers.get("upgrade") || "";
    if (upgrade.toLowerCase() !== "websocket") {
      return new Response("Expected websocket", { status: 426 });
    }

    const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);

    let openaiSocket: WebSocket | null = null;
    let sessionConfigured = false;

    clientSocket.onopen = () => {
      console.log("Client connected, connecting to OpenAI...");
      
      // Connect to OpenAI with API key in Authorization header via protocols
      // Using the OpenAI insecure API key protocol for server-side connections
      const model = "gpt-4o-realtime-preview-2024-10-01";
      const url = `wss://api.openai.com/v1/realtime?model=${model}`;
      
      try {
        openaiSocket = new WebSocket(url, [
          "realtime",
          `openai-insecure-api-key.${OPENAI_API_KEY}`,
          "openai-beta.realtime-v1"
        ]);

        openaiSocket.onopen = () => {
          console.log("Connected to OpenAI Realtime API");
        };

        openaiSocket.onmessage = (event: MessageEvent) => {
          const data = JSON.parse(event.data as string);
          console.log("OpenAI -> Client:", data.type);

          // Configure session after connection
          if (data.type === 'session.created' && !sessionConfigured) {
            sessionConfigured = true;
            const sessionUpdate = {
              type: 'session.update',
              session: {
                modalities: ['text', 'audio'],
                instructions: `You are an empathetic AI therapist conducting a voice interview. Your role is to:
- Listen actively and ask thoughtful follow-up questions
- Help the user explore their thoughts and feelings
- Provide a safe, non-judgmental space
- Guide the conversation naturally
- Be warm, supportive, and professional
- Ask open-ended questions to encourage sharing
- Summarize key points when appropriate
Keep your responses conversational and natural, as if speaking to someone in person.`,
                voice: 'alloy',
                input_audio_format: 'pcm16',
                output_audio_format: 'pcm16',
                input_audio_transcription: {
                  model: 'whisper-1'
                },
                turn_detection: {
                  type: 'server_vad',
                  threshold: 0.5,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 1000
                },
                temperature: 0.8,
                max_response_output_tokens: 4096
              }
            };
            
            console.log("Configuring session...");
            openaiSocket?.send(JSON.stringify(sessionUpdate));
          }

          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(event.data as string);
          }
        };

        openaiSocket.onerror = (error: Event) => {
          console.error("OpenAI WebSocket error:", error);
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(JSON.stringify({
              type: 'error',
              error: { message: 'OpenAI connection error' }
            }));
          }
          clientSocket.close();
        };

        openaiSocket.onclose = () => {
          console.log("OpenAI connection closed");
          clientSocket.close();
        };
      } catch (error) {
        console.error("Error creating OpenAI WebSocket:", error);
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(JSON.stringify({
            type: 'error',
            error: { message: error instanceof Error ? error.message : 'Connection failed' }
          }));
        }
        clientSocket.close();
      }
    };

    // Forward messages from client to OpenAI
    clientSocket.onmessage = (event) => {
      const data = JSON.parse(event.data as string);
      console.log("Client -> OpenAI:", data.type);
      
      if (openaiSocket?.readyState === WebSocket.OPEN) {
        openaiSocket.send(event.data as string);
      }
    };

    clientSocket.onerror = (error) => {
      console.error("Client WebSocket error:", error);
      openaiSocket?.close();
    };

    clientSocket.onclose = () => {
      console.log("Client connection closed");
      openaiSocket?.close();
    };

    return response;
  } catch (error) {
    console.error("Error in openai-realtime function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
