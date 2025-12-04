const axios = require('axios');

class GeminiAPI {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.baseUrl = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    this.systemPrompt = process.env.SYSTEM_PROMPT || 'You are a helpful AI assistant for conducting technical interviews.';
  }

  async processQuestion(question, context = '', systemPrompt = null, baseUrl = null, apiKey = null) {
    const currentApiKey = apiKey || this.apiKey;
    const currentBaseUrl = baseUrl || this.baseUrl;
    
    if (!currentApiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      // Gemini API uses a different endpoint and request format
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${currentApiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt || this.systemPrompt}\n\nContext: ${context}\n\nQuestion: ${question}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini API error:', error.response?.data || error.message);
      throw new Error('Failed to process question with Gemini');
    }
  }

  async generateQuestions(topic, difficulty = 'medium', count = 5) {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const difficultyPrompts = {
      easy: 'Generate beginner-level questions',
      medium: 'Generate intermediate-level questions',
      hard: 'Generate advanced-level questions'
    };

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: `${difficultyPrompts[difficulty]} about ${topic}. Generate ${count} questions that would be suitable for a technical interview. Format as a numbered list.`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1500,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const questionsText = response.data.candidates[0].content.parts[0].text;
      return questionsText.split('\n').filter(q => q.trim()).map(q => q.replace(/^\d+\.\s*/, ''));
    } catch (error) {
      console.error('Gemini question generation error:', error.response?.data || error.message);
      throw new Error('Failed to generate questions');
    }
  }

  async analyzeResponse(question, response) {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const analysisResponse = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: `You are an expert technical interviewer. Analyze the given response and provide constructive feedback.\n\nQuestion: ${question}\n\nResponse: ${response}\n\nPlease analyze this response and provide feedback on:\n1. Technical accuracy\n2. Completeness of answer\n3. Areas for improvement\n4. Suggestions for follow-up questions`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 800,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return analysisResponse.data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini analysis error:', error.response?.data || error.message);
      throw new Error('Failed to analyze response');
    }
  }
}

module.exports = new GeminiAPI();
