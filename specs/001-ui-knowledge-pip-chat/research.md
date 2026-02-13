# Research Notes

## Current UI Structure
- Main layout is defined in public/index.html with sections for screen share, transcription, and questions
- PIP overlay is styled in public/style.css and controlled in public/script.js
- Knowledge Base panel is a modal form in index.html with template management controls

## Knowledge Base and Smart Questions
- Template content and settings are stored in localStorage under weeb-assistant-template
- generateQuestions builds a prompt from the active template and the transcription context
- Template-specific knowledge base is stored in window.TEMPLATE_KNOWLEDGE_BASE and used for AI answers

## Chat and Answer Flow
- Interviewer transcription and AI answers are mixed in the transcription area
- generateQuestions injects the first question into transcription via addInterviewerQuestionToTranscription
- AI answers are rendered inside question cards and pushed to PIP

## PIP Mode
- PIP shows transcription and AI content, but it does not visually separate interviewer questions vs AI answers in a chat stream
- PIP update functions are updatePipTranscription and updatePipAI

## Gaps vs Requested Outcome
- No dedicated chatbox with separate interviewer questions and AI answers
- Smart questions are generated but not visually linked to a chat thread
- Knowledge base editor is functional but not optimized for quick iteration
