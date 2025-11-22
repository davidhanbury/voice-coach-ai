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
    const { transcript } = await req.json();
    
    if (!transcript || !Array.isArray(transcript)) {
      throw new Error('Invalid transcript format');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Create a system prompt for extracting action plan
    const systemPrompt = `You are an expert goal coach. Analyze the conversation transcript and create a personalized action plan.

Extract and format:
1. The user's SMART goal (Specific, Measurable, Achievable, Relevant, Time-bound)
2. Current reality/situation
3. Key obstacles identified
4. Vision of success
5. 5-7 concrete daily action steps to achieve the goal

Format the output as a natural, encouraging script for a video presentation. 
Use "you" and "your" to speak directly to the viewer.
Keep it under 300 words.
Start with affirming their goal, then outline the action steps in a clear, motivating way.`;

    // Combine transcript into a single conversation
    const conversationText = transcript.map((msg: string) => msg).join('\n');

    console.log('Generating action plan from transcript');

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
          { role: 'user', content: conversationText }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const actionPlan = data.choices[0].message.content;
    
    console.log('Action plan generated successfully');

    return new Response(JSON.stringify({ actionPlan }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-action-plan:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
