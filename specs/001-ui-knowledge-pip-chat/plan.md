# Implementation Plan: UI optimization, knowledge base smart questions, PIP chat separation

**Branch**: `001-ui-knowledge-pip-chat` | **Date**: 2026-02-13 | **Spec**: specs/001-ui-knowledge-pip-chat/spec.md
**Input**: User request to optimize UI, improve knowledge base and PIP, and separate interviewer questions from AI answers in chatbox

## Summary
- Rework the main UI layout to make questions, transcription, and answers easier to scan
- Improve the Knowledge Base editor so smart questions are generated from the active template and portfolio data
- Upgrade PIP mode to show separate interviewer questions and AI agent answers like a chat stream
- Ensure question generation and chat separation stay consistent across main UI and PIP

## Technical Context
**Language/Version**: JavaScript (Node.js 20 runtime, browser JS)  
**Primary Dependencies**: Express, ws, cors, dotenv  
**Storage**: localStorage for UI config and templates  
**Testing**: No automated tests defined  
**Target Platform**: Web browser + Node.js server  
**Project Type**: Web application (frontend in public/, backend in server.js)  
**Performance Goals**: UI updates under 100ms, PIP refresh under 200ms  
**Constraints**: No build step, vanilla JS/CSS, keep API keys in localStorage only  
**Scale/Scope**: Single-user session per browser instance

## Constitution Check
- No constitution rules defined yet; proceed with standard quality checks and update when constitution is finalized

## Project Structure

### Documentation (this feature)
```text
specs/001-ui-knowledge-pip-chat/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── chat-events.md
```

### Source Code (repository root)
```text
public/
├── index.html
├── style.css
├── script.js
└── knowledge-base.js

server.js
```

**Structure Decision**: Single web app with server.js backend and static frontend assets in public/

## Phase 0 — Research
- Review current UI layout, knowledge base flow, PIP behavior, and question generation pipeline
- Identify where interviewer and AI answers are currently combined

## Phase 1 — Design
- Define UI layout changes for main screen, questions list, and chatbox separation
- Define PIP layout changes for separate interviewer/AI panes
- Specify chat event model and rendering order
- Decide how smart question generation uses template + portfolio inputs

## Phase 2 — Implementation
- Update index.html structure to add chatbox separation and improved knowledge base UI affordances
- Update style.css to improve layout density, typography hierarchy, and PIP readability
- Update script.js to create distinct interviewer question entries and AI answer entries
- Update knowledge-base.js/template handling to drive smarter question generation
- Ensure PIP mirrors the separated chat stream

## Phase 3 — Verification
- Manual UI walkthrough: generate questions, view chat separation, toggle PIP
- Verify knowledge base template changes affect generated questions and AI answers
