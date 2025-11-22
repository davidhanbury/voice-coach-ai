# Therapy LiveKit Agent - Quick Start

This is a LiveKit AI agent that conducts voice-based therapy interviews using OpenAI.

## Quick Start (5 minutes)

### 1. Install Python Requirements

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
- **LiveKit**: Get from [cloud.livekit.io](https://cloud.livekit.io/) → Settings → Keys
- **OpenAI**: Get from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### 3. Run the Agent

For development (auto-reload):
```bash
python agent.py dev
```

For production:
```bash
python agent.py start
```

You should see:
```
🔧 Configuration loaded from environment
📡 LiveKit URL: wss://...
🔑 API Key: APIxxxxx...
INFO: Agent worker started
INFO: Waiting for jobs...
```

### 4. Test with Your App

1. Go to your therapy app's interview page
2. Click "Start Interview"
3. Allow microphone access
4. The agent will join and greet you!
5. Start speaking - it will respond

## Deployment

See `LIVEKIT_AGENT_SETUP.md` for full deployment instructions for:
- Render.com (recommended)
- Railway.app
- Fly.io
- Docker
- Self-hosted

## Customization

### Change Voice

Edit `agent.py`, line ~60:

```python
tts_voice="nova",  # Options: alloy, echo, fable, onyx, nova, shimmer
```

### Modify Conversation Style

Edit `THERAPY_INSTRUCTIONS` in `agent.py` to change:
- Tone and personality
- Question types
- Session structure

### Adjust Response Speed

```python
model="gpt-4o-mini",  # Fast & cheap (recommended)
# or
model="gpt-4o",       # Higher quality, slower, more expensive
```

## Troubleshooting

**Agent doesn't connect:**
- Check `.env` file has correct credentials
- Verify LiveKit URL starts with `wss://`
- Ensure agent is running (`python agent.py dev`)

**No audio from agent:**
- Check OpenAI API key is valid
- Verify internet connection
- Look for errors in agent logs

**Agent responses too slow:**
- Use `gpt-4o-mini` instead of `gpt-4`
- Reduce `THERAPY_INSTRUCTIONS` length
- Check OpenAI API rate limits

## Cost Estimates

Per 30-minute session:
- **Whisper (STT)**: ~$0.18 (30 min × $0.006/min)
- **GPT-4o-mini**: ~$0.05 (assuming 5K tokens)
- **TTS**: ~$0.45 (3K words × $0.015/1K)
- **Total**: ~$0.68 per session

LiveKit: Free tier includes 10,000 participant minutes/month

## Resources

- [Full Setup Guide](LIVEKIT_AGENT_SETUP.md)
- [LiveKit Agents Docs](https://docs.livekit.io/agents/)
- [OpenAI Plugin Docs](https://docs.livekit.io/agents/plugins/openai/)
