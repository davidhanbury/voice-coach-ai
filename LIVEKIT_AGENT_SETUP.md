# LiveKit AI Agent Setup Guide

## Overview

This guide walks you through setting up a LiveKit Agent that will:
- Join therapy session rooms automatically
- Listen to user's voice input
- Process speech with AI (STT → LLM → TTS)
- Respond with synthesized voice in real-time

## Architecture

```
User Browser → LiveKit Cloud → LiveKit Agent (your server)
                    ↓                    ↓
              [Audio Stream]      [OpenAI API]
                                  - Whisper (STT)
                                  - GPT (Conversation)
                                  - TTS (Voice)
```

## Prerequisites

1. **LiveKit credentials** (already configured in your app)
2. **OpenAI API key** (for Whisper, GPT, and TTS)
3. **Python 3.9+** installed
4. **Server to run the agent** (local dev or cloud deployment)

## Quick Start (Local Development)

### Step 1: Create Agent Project

Create a new directory for your agent:

```bash
mkdir therapy-livekit-agent
cd therapy-livekit-agent
```

### Step 2: Install Dependencies

Create `requirements.txt`:

```txt
livekit-agents>=0.8.0
livekit-plugins-openai>=0.6.0
python-dotenv>=1.0.0
```

Install:

```bash
pip install -r requirements.txt
```

### Step 3: Create Agent Code

Create `agent.py`:

```python
import asyncio
import logging
from typing import Annotated
from livekit import rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    llm,
)
from livekit.plugins import openai

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Define the therapy coach instructions
THERAPY_INSTRUCTIONS = """You are a compassionate and professional behavioral therapy coach conducting an initial assessment interview.

Your role is to:
1. Create a safe, non-judgmental space for the user to share
2. Ask thoughtful follow-up questions to understand their challenges
3. Listen actively and show empathy
4. Gather information about:
   - Current issues and concerns
   - Behavioral patterns they'd like to change
   - Their preferences for coaching/therapy style
   - Goals for treatment

Guidelines:
- Keep responses conversational and warm
- Ask one question at a time
- Validate their feelings
- Don't diagnose or provide treatment during the interview
- Take notes mentally to create a personalized treatment plan later
- If they seem distressed, acknowledge it and offer support

Start by warmly greeting them and explaining that this is a confidential space to discuss what brought them here today."""


async def entrypoint(ctx: JobContext):
    """Main entry point for the LiveKit agent"""
    
    logger.info(f"Agent starting for room: {ctx.room.name}")
    
    # Initialize OpenAI plugin
    initial_ctx = llm.ChatContext().append(
        role="system",
        text=THERAPY_INSTRUCTIONS,
    )
    
    # Create assistant with voice capabilities
    assistant = openai.VoiceAssistant(
        model="gpt-4o-mini",  # Fast and cost-effective
        chat_ctx=initial_ctx,
        # Speech-to-Text settings
        stt_model="whisper-1",
        # Text-to-Speech settings
        tts_model="tts-1",
        tts_voice="nova",  # Warm, empathetic voice
        # Conversation settings
        interrupt_speech_duration=0.6,  # Allow natural interruptions
        interrupt_min_words=3,  # Minimum words before interruption
    )
    
    # Start the assistant
    assistant.start(ctx.room)
    
    # Greet the user when they join
    await asyncio.sleep(1)  # Give them time to connect
    greeting = "Hello! Welcome to your therapy session. This is a safe, confidential space. I'm here to listen and understand what's been on your mind. Take your time, and whenever you're ready, please share what brought you here today."
    await assistant.say(greeting, allow_interruptions=True)
    
    logger.info("Agent ready and greeting sent")


if __name__ == "__main__":
    # Run the agent
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            api_key="your-livekit-api-key",  # From environment
            api_secret="your-livekit-api-secret",  # From environment
            ws_url="wss://your-project.livekit.cloud",  # From environment
        ),
    )
```

### Step 4: Configure Environment

Create `.env`:

```bash
# LiveKit credentials (same as in your Lovable app)
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_API_SECRET=your_api_secret_here
LIVEKIT_URL=wss://your-project.livekit.cloud

# OpenAI credentials
OPENAI_API_KEY=your_openai_api_key_here
```

### Step 5: Update Agent to Use Environment

Update `agent.py` to load from .env:

```python
import os
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            api_key=os.getenv("LIVEKIT_API_KEY"),
            api_secret=os.getenv("LIVEKIT_API_SECRET"),
            ws_url=os.getenv("LIVEKIT_URL"),
        ),
    )
```

### Step 6: Run the Agent

```bash
python agent.py dev
```

You should see:
```
INFO: Agent worker started
INFO: Waiting for jobs...
```

### Step 7: Test the Agent

1. Go to your app's interview page
2. Click "Start Interview"
3. Allow microphone access
4. The agent should join and greet you!
5. Speak naturally - the agent will respond

## Production Deployment

### Option 1: Render.com (Recommended)

1. **Create new Web Service** on Render
2. **Connect your GitHub repo** with the agent code
3. **Configure**:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python agent.py start`
4. **Add Environment Variables**:
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
   - `LIVEKIT_URL`
   - `OPENAI_API_KEY`
5. **Deploy**

### Option 2: Railway.app

1. **New Project** → **Deploy from GitHub**
2. **Add variables**:
   - Same as above
3. **Configure start command**: `python agent.py start`
4. **Deploy**

### Option 3: Fly.io

Create `fly.toml`:

```toml
app = "therapy-agent"

[build]
  builder = "paketobuildpacks/builder:base"

[env]
  PORT = "8080"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    port = 443
```

Deploy:
```bash
fly launch
fly secrets set LIVEKIT_API_KEY=xxx LIVEKIT_API_SECRET=xxx LIVEKIT_URL=xxx OPENAI_API_KEY=xxx
fly deploy
```

### Option 4: Docker (Self-Hosted)

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agent.py .

CMD ["python", "agent.py", "start"]
```

Build and run:
```bash
docker build -t therapy-agent .
docker run -e LIVEKIT_API_KEY=xxx -e LIVEKIT_API_SECRET=xxx -e LIVEKIT_URL=xxx -e OPENAI_API_KEY=xxx therapy-agent
```

## Customizing the Agent

### Change Voice

Available TTS voices:
- `alloy` - Neutral, balanced
- `echo` - Male, clear
- `fable` - British accent
- `onyx` - Deep, authoritative
- `nova` - **Warm, empathetic (recommended for therapy)**
- `shimmer` - Friendly, energetic

Update in `agent.py`:
```python
assistant = openai.VoiceAssistant(
    tts_voice="nova",  # Change here
)
```

### Adjust Conversation Style

Modify `THERAPY_INSTRUCTIONS` to change:
- Tone and personality
- Question types
- Session structure
- Areas of focus

### Add Session Logging

```python
# In entrypoint function
chat_messages = []

@assistant.on("user_speech_committed")
def on_user_speech(msg: llm.ChatMessage):
    chat_messages.append({"role": "user", "content": msg.content})
    logger.info(f"User: {msg.content}")

@assistant.on("agent_speech_committed")  
def on_agent_speech(msg: llm.ChatMessage):
    chat_messages.append({"role": "assistant", "content": msg.content})
    logger.info(f"Agent: {msg.content}")

# Save transcript at end of session
@ctx.room.on("disconnected")
def on_disconnect():
    # Save chat_messages to database or file
    logger.info(f"Session ended. Transcript: {chat_messages}")
```

### Cost Optimization

For lower costs:

```python
assistant = openai.VoiceAssistant(
    model="gpt-4o-mini",  # Cheaper than gpt-4
    tts_model="tts-1",     # Standard quality (vs tts-1-hd)
)
```

## Monitoring & Debugging

### View Agent Logs

The agent logs to console. Check:
- Room connections
- Speech recognition results
- LLM responses
- Errors

### LiveKit Dashboard

Monitor in your LiveKit dashboard:
- Active rooms
- Connected participants (user + agent)
- Audio quality metrics
- Bandwidth usage

### Common Issues

**Agent doesn't join room:**
- Check LiveKit credentials match
- Verify agent is running (`python agent.py dev`)
- Check firewall/network settings

**Audio quality issues:**
- Reduce `tts_model` to `tts-1` (faster)
- Check internet connection
- Monitor LiveKit dashboard for packet loss

**Agent responses too slow:**
- Use `gpt-4o-mini` instead of `gpt-4`
- Reduce `THERAPY_INSTRUCTIONS` length
- Check OpenAI API status

**Interruptions not working:**
- Adjust `interrupt_speech_duration`
- Check microphone sensitivity
- Ensure VAD (Voice Activity Detection) is enabled

## Integration with Your App

Your Lovable app is already configured to:
1. ✅ Generate LiveKit tokens
2. ✅ Connect users to rooms
3. ✅ Enable microphone
4. ✅ Handle audio streams

Once the agent is running, it will:
1. Automatically detect new rooms
2. Join as a participant
3. Start conversing with users
4. Transcripts can be captured for treatment plan generation

## Next Steps

1. **Test locally** with `python agent.py dev`
2. **Deploy to production** using one of the options above
3. **Monitor sessions** in LiveKit dashboard
4. **Collect transcripts** to feed into ChatGPT for treatment plan generation
5. **Create VEED videos** from treatment plans

## Resources

- [LiveKit Agents Documentation](https://docs.livekit.io/agents/)
- [OpenAI Plugin for LiveKit](https://docs.livekit.io/agents/plugins/openai/)
- [LiveKit Python SDK](https://docs.livekit.io/client-sdk-python/)
- [Voice Assistant Examples](https://github.com/livekit/agents/tree/main/examples)

## Support

For issues:
1. Check agent logs for errors
2. Verify all credentials are correct
3. Test with LiveKit's sample apps first
4. Consult LiveKit Discord community
