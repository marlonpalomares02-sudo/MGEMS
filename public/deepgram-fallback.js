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
                    
                    // Create WebSocket connection to Deepgram
                    const deepgramUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&diarize=true&punctuate=true&utterances=true&encoding=linear16&sample_rate=16000&channels=1`;
                    
                    try {
                        console.log('Creating WebSocket connection to Deepgram...');
                        let ws;
                        try {
                            console.log('Creating WebSocket with URL:', deepgramUrl);
                            console.log('Using API key:', self.apiKey ? self.apiKey.substring(0, 8) + '...' : 'NO API KEY');
                            ws = new WebSocket(deepgramUrl, ['token', self.apiKey]);
                            console.log('WebSocket created, readyState:', ws.readyState, 'CONNECTING=0, OPEN=1, CLOSING=2, CLOSED=3');
                            
                            // Add immediate event listeners to track connection
                            ws.onopen = () => console.log('WebSocket opened immediately');
                            ws.onerror = (error) => console.log('WebSocket error immediately:', error);
                            ws.onclose = (event) => console.log('WebSocket closed immediately:', event.code, event.reason);
                            
                        } catch (wsError) {
                            console.error('Failed to create WebSocket:', wsError);
                            throw new Error('WebSocket creation failed: ' + wsError.message);
                        }
                        
                        const liveTranscription = {
                            _websocket: ws,
                            _isConnected: false,
                            _pendingMessages: [],
                            
                            on: (event, callback) => {
                                console.log(`Fallback: Registering event handler for ${event}`);
                                console.log(`Current WebSocket state:`, liveTranscription._websocket?.readyState);
                                
                                if (event === 'open') {
                                    // WebSocket connection is already created, just set up the onopen handler
                                    liveTranscription._websocket.onopen = () => {
                                        console.log('Fallback WebSocket connected successfully');
                                        console.log('WebSocket readyState:', liveTranscription._websocket.readyState);
                                        liveTranscription._isConnected = true;
                                        console.log('Processing', liveTranscription._pendingMessages.length, 'queued messages');
                                        // Send any pending messages
                                        while (liveTranscription._pendingMessages.length > 0) {
                                            const message = liveTranscription._pendingMessages.shift();
                                            console.log('Sending queued audio data, size:', message.byteLength || message.length);
                                            liveTranscription._websocket.send(message);
                                        }
                                        callback();
                                    };
                                    
                                    liveTranscription._websocket.onmessage = (event) => {
                                        try {
                                            const data = JSON.parse(event.data);
                                            console.log('Fallback: Received WebSocket message, type:', data.type);
                                            if (data.type === 'Results' && data.channel && self.eventHandlers.transcript) {
                                                console.log('Fallback: Processing transcript data, handlers:', self.eventHandlers.transcript?.length || 0);
                                                self.eventHandlers.transcript.forEach(handler => handler(data));
                                            }
                                        } catch (error) {
                                            console.error('Fallback: Error parsing WebSocket message', error);
                                        }
                                    };
                                    
                                    liveTranscription._websocket.onerror = (error) => {
                                        console.error('Fallback WebSocket error', error);
                                        if (self.eventHandlers.error) {
                                            self.eventHandlers.error.forEach(handler => handler(error));
                                        }
                                    };
                                    
                                    liveTranscription._websocket.onclose = (event) => {
                                        console.log('Fallback WebSocket closed', event);
                                        liveTranscription._isConnected = false;
                                        if (self.eventHandlers.close) {
                                            self.eventHandlers.close.forEach(handler => handler(event));
                                        }
                                    };
                                } else if (event === 'transcript' || event === 'transcriptReceived') {
                                    if (!self.eventHandlers.transcript) {
                                        self.eventHandlers.transcript = [];
                                    }
                                    self.eventHandlers.transcript.push(callback);
                                } else if (event === 'error') {
                                    if (!self.eventHandlers.error) {
                                        self.eventHandlers.error = [];
                                    }
                                    self.eventHandlers.error.push(callback);
                                } else if (event === 'close') {
                                    if (!self.eventHandlers.close) {
                                        self.eventHandlers.close = [];
                                    }
                                    self.eventHandlers.close.push(callback);
                                }
                            },
                            
                            send: (audioData) => {
                                console.log('Fallback: send() called, connection state:', liveTranscription._isConnected, 'readyState:', liveTranscription._websocket?.readyState);
                                if (liveTranscription._isConnected && liveTranscription._websocket && liveTranscription._websocket.readyState === WebSocket.OPEN) {
                                    console.log('Fallback: Sending audio data, size:', audioData.byteLength || audioData.length);
                                    liveTranscription._websocket.send(audioData);
                                    console.log('Fallback: Audio data sent via WebSocket');
                                } else {
                                    console.warn('Fallback: WebSocket not ready, queuing audio data. Queue size:', liveTranscription._pendingMessages.length + 1);
                                    liveTranscription._pendingMessages.push(audioData);
                                }
                            },
                            
                            finish: () => {
                                console.log('Fallback: Finishing transcription');
                                if (liveTranscription._websocket) {
                                    liveTranscription._websocket.close();
                                    liveTranscription._websocket = null;
                                    liveTranscription._isConnected = false;
                                }
                            },
                            
                            close: () => {
                                console.log('Fallback: Closing transcription connection');
                                liveTranscription.finish();
                            },
                            
                            removeAllListeners: () => {
                                console.log('Fallback: Removing all event listeners');
                                self.eventHandlers = {};
                            }
                        };
                        
                        return liveTranscription;
                        
                    } catch (error) {
                        console.error('Fallback: Failed to create WebSocket connection', error);
                        throw error;
                    }
                }
            };
        }
    }
    
    // Export to global scope
    global.Deepgram = DeepgramFallback;
    
    console.log('Deepgram fallback exported to global scope');
    
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);