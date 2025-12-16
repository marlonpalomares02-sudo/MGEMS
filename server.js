const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log('Client connected from:', req.socket.remoteAddress);
  
  // Send welcome message
  ws.send(JSON.stringify({ 
    type: 'connection', 
    data: { status: 'connected', timestamp: new Date().toISOString() }
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);
      
      // Handle different message types
      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', data: { timestamp: Date.now() } }));
          break;
        case 'echo':
          ws.send(JSON.stringify({ type: 'echo', data: data.data }));
          break;
        default:
          // Echo back for testing
          ws.send(JSON.stringify({ type: 'echo', data }));
      }
      
    } catch (error) {
      console.error('Error parsing message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('close', (code, reason) => {
    console.log('Client disconnected:', code, reason);
  });
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/config', (req, res) => {
  res.json({
    deepseek: { envKey: process.env.DEEPSEEK_API_KEY },
    deepgram: { envKey: process.env.DEEPGRAM_API_KEY },
    gemini: { envKey: process.env.GEMINI_API_KEY }
  });
});

// AI API proxy to bypass CORS
app.post('/api/ai-proxy', async (req, res) => {
  try {
    const { url, method, headers, body } = req.body;
    
    console.log('AI Proxy Request:', { url, method, headers, body });
    
    // Only allow specific AI API endpoints
    const allowedUrls = [
      'https://api.deepseek.com/v1/chat/completions',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
    ];
    
    if (!allowedUrls.some(allowed => url.startsWith(allowed))) {
      console.log('URL not allowed:', url);
      return res.status(400).json({ error: 'URL not allowed' });
    }
    
    console.log('Making request to:', url);
    const response = await fetch(url, {
      method: method || 'POST',
      headers: headers || { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    console.log('External API response status:', response.status);
    const data = await response.json();
    console.log('External API response data:', data);
    
    res.json(data);
    
  } catch (error) {
    console.error('AI proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
