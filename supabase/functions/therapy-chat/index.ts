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
    const { messages } = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Count user messages to track interaction limit
    const userMessageCount = messages.filter((m: any) => m.role === 'user').length;
    const isLastInteraction = userMessageCount >= 4;

    const systemPrompt = `You are an expert goal-setting coach helping someone set meaningful goals. You have a maximum of 4 exchanges to help the user set their goal.

CRITICAL RULES:
- Ask ONLY ONE question per response
- Keep responses to 2-3 sentences maximum for natural voice conversation
- Never ask multiple questions in one response
${isLastInteraction ? '- THIS IS THE FINAL INTERACTION: Summarize their goal, acknowledge their progress, and end the session warmly' : ''}

Your conversation flow (4 interactions total):

Interaction 1 - GOAL:
   Ask: "What goal would you like to work on today?"

Interaction 2 - Clarify Goal (Specific):
   Ask: "What exactly do you want to achieve with this?"

Interaction 3 - Measurement & Timeline (Achievable/Measurable):
   Ask: "How will you know when you've achieved it, and when would you like to reach it?"

Interaction 4 - FINALIZE:
   Provide a brief summary (2-3 sentences): their goal, timeline, and encourage them to start. End with "Your personalized action plan will be ready for you."

Stay supportive, concise, and focused. ONE question only per response.`;

    console.log('Processing chat request with', messages.length, 'messages');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.8,
        max_tokens: 150
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;
    
    console.log('AI response:', reply.substring(0, 50));

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in therapy-chat:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
