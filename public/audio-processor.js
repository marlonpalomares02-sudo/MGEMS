class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048; // Reduced from 4096 for lower latency
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.sampleCount = 0;
    console.log('AudioProcessor initialized with low-latency settings');
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input.length) return true;

    const channel = input[0];
    // Copy input data to buffer with ultra-low latency for real-time streaming
    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.bufferIndex++] = channel[i];
      this.sampleCount++;

      // Send data ultra-frequently for maximum real-time performance
      if (this.bufferIndex === this.bufferSize || this.sampleCount >= 512) { // Reduced from 1024
        this.port.postMessage({
          type: 'audio-data',
          buffer: this.buffer.slice(0, this.bufferIndex)
        });
        this.bufferIndex = 0;
        this.sampleCount = 0;
      }
    }

    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
