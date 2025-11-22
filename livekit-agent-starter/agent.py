"""
LiveKit AI Therapy Agent

This agent joins therapy session rooms and conducts voice-based interviews
using OpenAI's GPT-4 for conversation and voice capabilities.
"""

import asyncio
import logging
import os
from typing import Annotated
from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    llm,
)
from livekit.plugins import openai

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Therapy coach system instructions
THERAPY_INSTRUCTIONS = """You are a compassionate and professional behavioral therapy coach conducting an initial assessment interview.

Your role is to:
1. Create a safe, non-judgmental space for the user to share
2. Ask thoughtful follow-up questions to understand their challenges  
3. Listen actively and show empathy
4. Gather information about:
   - Current issues and concerns they're facing
   - Behavioral patterns they'd like to change
   - Their preferences for coaching and therapy style
   - Goals and outcomes they hope to achieve

Guidelines for the conversation:
- Keep responses conversational, warm, and supportive
- Ask one clear question at a time - don't overwhelm them
- Validate their feelings and experiences
- Use reflective listening ("It sounds like...")
- Don't diagnose or provide treatment during this interview
- If they seem distressed, acknowledge it with compassion
- Naturally transition between topics
- Keep responses under 3 sentences when possible
- Allow them to guide the conversation pace

This is a confidential, judgment-free space. Your goal is to understand their unique situation so you can help create a personalized treatment plan.

Start by warmly greeting them and explaining this is a safe space to discuss what brought them here today."""


async def entrypoint(ctx: JobContext):
    """
    Main entry point for the LiveKit agent.
    Called when a user joins a room and the agent needs to participate.
    """
    
    logger.info(f"🚀 Agent starting for room: {ctx.room.name}")
    
    # Initialize chat context with therapy coach instructions
    initial_ctx = llm.ChatContext().append(
        role="system",
        text=THERAPY_INSTRUCTIONS,
    )
    
    # Create voice assistant with OpenAI
    logger.info("Creating voice assistant...")
    assistant = openai.VoiceAssistant(
        # LLM configuration
        model="gpt-4o-mini",  # Fast, cost-effective, good quality
        chat_ctx=initial_ctx,
        
        # Speech-to-Text settings (Whisper)
        stt_model="whisper-1",
        
        # Text-to-Speech settings
        tts_model="tts-1",  # Use tts-1-hd for higher quality
        tts_voice="nova",    # Warm, empathetic voice - great for therapy
        
        # Conversation flow settings
        interrupt_speech_duration=0.6,  # Allow interruptions after 0.6s
        interrupt_min_words=3,          # Need at least 3 words to interrupt
        
        # VAD (Voice Activity Detection) settings
        min_endpointing_delay=0.5,  # Wait 0.5s of silence before processing
    )
    
    # Track conversation for logging
    chat_history = []
    
    @assistant.on("user_speech_committed")
    def on_user_speech(msg: llm.ChatMessage):
        """Called when user's speech is transcribed"""
        chat_history.append({"role": "user", "content": msg.content})
        logger.info(f"👤 User: {msg.content}")
    
    @assistant.on("agent_speech_committed")
    def on_agent_speech(msg: llm.ChatMessage):
        """Called when agent's response is sent"""
        chat_history.append({"role": "assistant", "content": msg.content})
        logger.info(f"🤖 Agent: {msg.content}")
    
    @assistant.on("agent_started_speaking")
    def on_started_speaking():
        logger.info("🎤 Agent started speaking")
    
    @assistant.on("agent_stopped_speaking")
    def on_stopped_speaking():
        logger.info("🤫 Agent stopped speaking")
    
    # Handle room disconnection
    @ctx.room.on("disconnected")
    def on_disconnect():
        logger.info(f"📝 Session ended for room: {ctx.room.name}")
        logger.info(f"💬 Total exchanges: {len(chat_history)}")
        # TODO: Save chat_history to database or file for transcript
        # This would be sent to ChatGPT to generate treatment plan
    
    # Start the assistant
    logger.info("Starting assistant...")
    assistant.start(ctx.room)
    
    # Wait for participant to connect and settle
    await asyncio.sleep(1.5)
    
    # Greet the user
    greeting = (
        "Hello! Welcome to your therapy session. "
        "I'm here to listen and understand what's been on your mind. "
        "This is a safe, confidential space. "
        "Whenever you're ready, please share what brought you here today."
    )
    
    logger.info(f"👋 Greeting user in room: {ctx.room.name}")
    await assistant.say(greeting, allow_interruptions=True)
    
    logger.info("✅ Agent fully initialized and ready")


def main():
    """Main entry point when running the script"""
    
    # Validate required environment variables
    required_vars = [
        "LIVEKIT_API_KEY",
        "LIVEKIT_API_SECRET", 
        "LIVEKIT_URL",
        "OPENAI_API_KEY"
    ]
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        logger.error(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
        logger.error("Please set these in your .env file")
        return
    
    logger.info("🔧 Configuration loaded from environment")
    logger.info(f"📡 LiveKit URL: {os.getenv('LIVEKIT_URL')}")
    logger.info(f"🔑 API Key: {os.getenv('LIVEKIT_API_KEY')[:8]}...")
    
    # Run the agent worker
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            api_key=os.getenv("LIVEKIT_API_KEY"),
            api_secret=os.getenv("LIVEKIT_API_SECRET"),
            ws_url=os.getenv("LIVEKIT_URL"),
        ),
    )


if __name__ == "__main__":
    main()
