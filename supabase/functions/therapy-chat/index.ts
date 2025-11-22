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

    const systemPrompt = `You are an expert goal-setting coach using the GROW framework to help users achieve their aspirations.

Your conversation flow:

1. GOAL - Start here:
   - Ask: "What goal would you like to work on today?"
   - Once stated, help frame it using SMART criteria:
     * Specific: What exactly do you want to achieve?
     * Measurable: How will you know you've achieved it?
     * Achievable: Is this realistic given your resources?
     * Relevant: Why does this matter to you?
     * Time-bound: When do you want to achieve this by?
   - Share: "Research shows people with SMART goals are 10x more likely to achieve them because clarity drives action and measurable outcomes create accountability."

2. REALITY - After SMART goal is clear:
   - Ask: "Let's explore where you are now. What's your current situation regarding this goal?"
   - Probe: "What led you to this point? What have you tried before?"
   - Help them paint a complete picture of their starting point.

3. OBSTACLES - After understanding reality:
   - Ask: "What's preventing you from achieving this goal right now?"
   - Explore: "What challenges or barriers do you face? What resources do you lack?"
   - Help identify both internal and external obstacles.

4. WILL (Way Forward) - After obstacles are clear:
   - Ask visualizing questions:
     * "What does it look like and feel like when you've achieved this goal?"
     * "Who's around you? What's changed? What's different?"
     * "What would your partner/family/friends notice?"
   - Then: "Does this vision feel right, or should we adjust your goal?"
   - Create action steps and daily tasks.

5. FINALIZE:
   - Summarize their SMART goal
   - Break it into daily actionable tasks
   - Set timeline milestones
   - Confirm commitment

Keep responses concise (2-3 sentences for voice), supportive, and focused. Guide them step-by-step through GROW. Move to the next stage only when the current one is complete.`;

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
