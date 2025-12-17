// Deepgram SDK Fallback Implementation
// This provides minimal Deepgram functionality when the CDN is blocked

(function(global) {
    'use strict';
    
    console.log('Deepgram fallback implementation loaded');
    
    class DeepgramFallback {
        constructor(apiKey, options = {}) {
            this.apiKey = apiKey;
            this.options = options;
            this.websocket = null;
            this.eventHandlers = {};
            console.log('Deepgram fallback initialized');
        }
        
        get transcription() {
            const self = this;
            return {
                live: (options = {}) => {
                    console.log('Creating live transcription connection (fallback)');
                    
                    const liveTranscription = {
                        _websocket: null,
                        _isConnected: false,
                        _pendingMessages: [],
                        _handlers: {},
                        
                        on: (event, callback) => {
                            console.log(`Fallback: Registering event handler for ${event}`);
                            if (!liveTranscription._handlers[event]) {
                                liveTranscription._handlers[event] = [];
                            }
                            liveTranscription._handlers[event].push(callback);
                        },
                        
                        send: (audioData) => {
                            if (liveTranscription._isConnected && liveTranscription._websocket && liveTranscription._websocket.readyState === WebSocket.OPEN) {
                                liveTranscription._websocket.send(audioData);
                            } else {
                                liveTranscription._pendingMessages.push(audioData);
                            }
                        },
                        
                        finish: () => {
                            if (liveTranscription._websocket) {
                                liveTranscription._websocket.close();
                                liveTranscription._websocket = null;
                                liveTranscription._isConnected = false;
                            }
                        },
                        
                        close: () => {
                            liveTranscription.finish();
                        },
                        
                        removeAllListeners: () => {
                            liveTranscription._handlers = {};
                        }
                    };

                    const deepgramUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&diarize=true&punctuate=true&utterances=true&encoding=linear16&sample_rate=16000&channels=1`;
                    
                    // Proxy URL logic
                    const protocol = (typeof window !== 'undefined' && window.location.protocol === 'https:') ? 'wss:' : 'ws:';
                    const host = (typeof window !== 'undefined') ? window.location.host : 'localhost:3000';
                    const proxyUrl = `${protocol}//${host}/api/deepgram-proxy?model=nova-2&language=en-US&smart_format=true&diarize=true&punctuate=true&utterances=true&encoding=linear16&sample_rate=16000&channels=1`;

                    const connect = (url, isProxy) => {
                        console.log(`Attempting connection to ${isProxy ? 'proxy' : 'Deepgram direct'}...`);
                        
                        try {
                            const protocols = isProxy ? [] : ['token', self.apiKey];
                            const ws = new WebSocket(url, protocols);
                            liveTranscription._websocket = ws;
                            
                            ws.onopen = () => {
                                console.log(`WebSocket connected (${isProxy ? 'proxy' : 'direct'})`);
                                liveTranscription._isConnected = true;
                                
                                // Send pending messages
                                while (liveTranscription._pendingMessages.length > 0) {
                                    ws.send(liveTranscription._pendingMessages.shift());
                                }
                                
                                // Trigger open handlers
                                if (liveTranscription._handlers.open) {
                                    liveTranscription._handlers.open.forEach(cb => cb());
                                }
                            };
                            
                            ws.onmessage = (event) => {
                                try {
                                    const data = JSON.parse(event.data);
                                    if (data.type === 'Results' && data.channel) {
                                        // Trigger transcript handlers
                                        if (liveTranscription._handlers.transcript) {
                                            liveTranscription._handlers.transcript.forEach(cb => cb(data));
                                        }
                                        if (liveTranscription._handlers.transcriptReceived) {
                                            liveTranscription._handlers.transcriptReceived.forEach(cb => cb(data));
                                        }
                                    }
                                } catch (error) {
                                    console.error('Error parsing message:', error);
                                }
                            };
                            
                            ws.onerror = (error) => {
                                console.error(`WebSocket error (${isProxy ? 'proxy' : 'direct'}):`, error);
                                
                                if (!isProxy && !liveTranscription._isConnected) {
                                    console.log('Direct connection failed, attempting fallback to proxy...');
                                    connect(proxyUrl, true);
                                } else {
                                    // Trigger error handlers
                                    if (liveTranscription._handlers.error) {
                                        liveTranscription._handlers.error.forEach(cb => cb(error));
                                    }
                                }
                            };
                            
                            ws.onclose = (event) => {
                                console.log(`WebSocket closed (${isProxy ? 'proxy' : 'direct'})`);
                                liveTranscription._isConnected = false;
                                
                                // Only trigger close if we're not retrying
                                if (isProxy || liveTranscription._isConnected) {
                                    if (liveTranscription._handlers.close) {
                                        liveTranscription._handlers.close.forEach(cb => cb(event));
                                    }
                                }
                            };
                            
                        } catch (error) {
                            console.error('Connection setup failed:', error);
                            if (!isProxy) {
                                console.log('Direct connection setup failed, attempting fallback to proxy...');
                                connect(proxyUrl, true);
                            } else {
                                if (liveTranscription._handlers.error) {
                                    liveTranscription._handlers.error.forEach(cb => cb(error));
                                }
                            }
                        }
                    };
                    
                    // Start initial connection
                    connect(deepgramUrl, false);
                    
                    return liveTranscription;
                }
            };
        }
    }
    
    // Export to global scope
    global.Deepgram = DeepgramFallback;
    
    console.log('Deepgram fallback exported to global scope');
    
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);