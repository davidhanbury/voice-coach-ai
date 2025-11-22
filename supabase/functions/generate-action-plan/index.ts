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
          { 
            role: 'system', 
            content: 'You are a supportive life coach. You extract clear goals and actionable tasks from conversations. Always respond with valid JSON only.'
          },
          { 
            role: 'user', 
            content: `Based on this coaching conversation transcript, extract the user's main goal and create 3-5 specific, actionable daily tasks.

Transcript:
${conversationText}

You must respond with valid JSON in this exact format:
{
  "mainGoal": "Clear statement of their main goal",
  "description": "Brief context about what they want to achieve (1-2 sentences)",
  "dailyTasks": [
    "First specific actionable task",
    "Second specific actionable task",
    "Third specific actionable task"
  ]
}

Rules:
- mainGoal should be clear and specific (e.g., "Improve my fitness" or "Learn Spanish")
- Each dailyTask must be a single, concrete action they can do today
- Keep tasks simple and achievable
- Return ONLY valid JSON, no other text`
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    
    console.log('Action plan generated successfully:', result);

    return new Response(JSON.stringify(result), {
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
