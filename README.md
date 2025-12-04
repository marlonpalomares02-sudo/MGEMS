# MGEMS Interview Buddy

A web-based interview assistant that provides real-time transcription and AI-powered interview support.

## Features

- **Real-time Transcription**: Uses Deepgram for live audio transcription during interviews
- **Screen Sharing**: Capture and share screen content with audio
- **AI-Powered Assistance**: Integration with DeepSeek and Gemini APIs for intelligent responses
- **Practice Mode**: Practice interview questions and get feedback
- **Accessibility**: Full keyboard navigation and screen reader support
- **Picture-in-Picture**: Floating window for transcription display

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure your API keys
4. Start the server: `node server.js`
5. Open http://localhost:3000 in your browser

## API Configuration

The application requires API keys for:
- **Deepgram**: For real-time audio transcription
- **DeepSeek**: For AI-powered responses
- **Gemini** (optional): Alternative AI provider

## Technical Details

- **Frontend**: Vanilla JavaScript with Web Audio API
- **Backend**: Node.js with Express
- **Real-time Communication**: WebSocket for transcription streaming
- **Audio Processing**: AudioWorklet for low-latency audio processing

## Deepgram Fallback

The application includes a custom Deepgram SDK fallback implementation (`deepgram-fallback.js`) that provides WebSocket-based transcription when the official SDK is unavailable due to CDN blocking or network restrictions.

## License

MIT License