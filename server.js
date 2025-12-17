const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });
const deepgramWss = new WebSocket.Server({ noServer: true });

// Handle WebSocket upgrades
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

  if (pathname.startsWith('/api/deepgram-proxy')) {
    deepgramWss.handleUpgrade(request, socket, head, (ws) => {
      deepgramWss.emit('connection', ws, request);
    });
  } else {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

// Deepgram Proxy handling
deepgramWss.on('connection', (ws, req) => {
  console.log('Deepgram Proxy connected from:', req.socket.remoteAddress);
  
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
  if (!deepgramApiKey) {
    console.error('Deepgram API key not configured on server');
    ws.close(1008, 'Deepgram API key not configured');
    return;
  }

  // Extract query params from req.url
  const query = req.url.split('?')[1];
  const deepgramUrl = `wss://api.deepgram.com/v1/listen?${query}`;
  
  console.log('Connecting to Deepgram upstream...');
  
  const deepgram = new WebSocket(deepgramUrl, {
    headers: {
      Authorization: `Token ${deepgramApiKey}`
    }
  });

  deepgram.on('open', () => {
    console.log('Connected to Deepgram upstream');
  });

  deepgram.on('message', (data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });

  deepgram.on('close', (code, reason) => {
    console.log('Deepgram upstream closed:', code, reason);
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  deepgram.on('error', (error) => {
    console.error('Deepgram upstream error:', error);
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1011, 'Deepgram upstream error');
    }
  });

  ws.on('message', (data) => {
    if (deepgram.readyState === WebSocket.OPEN) {
      deepgram.send(data);
    }
  });

  ws.on('close', (code, reason) => {
    console.log('Client closed proxy connection:', code, reason);
    if (deepgram.readyState === WebSocket.OPEN) {
      deepgram.close();
    }
  });
  
  ws.on('error', (error) => {
    console.error('Client proxy error:', error);
    if (deepgram.readyState === WebSocket.OPEN) {
      deepgram.close();
    }
  });
});

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
