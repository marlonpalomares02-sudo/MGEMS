---
description: "Task list for UI optimization, knowledge base, PIP, and chat separation"
---

# Tasks: UI optimization, knowledge base, PIP, chat separation

**Input**: specs/001-ui-knowledge-pip-chat/plan.md, research.md, data-model.md, contracts/chat-events.md  
**Prerequisites**: plan.md

## Phase 1: Setup (Shared Infrastructure)
- [ ] T001 Confirm chat event model and UI state additions in public/script.js
- [ ] T002 [P] Add DOM hooks in public/index.html for separated chat stream
- [ ] T003 [P] Add base styling for chat separation and improved layout in public/style.css

## Phase 2: User Story 1 — UI Optimization (Priority: P1)
**Goal**: Make questions, transcription, and answers easier to scan
**Independent Test**: Manual UI walkthrough and layout check in browser
- [ ] T004 [US1] Refactor main layout sections in public/index.html for clearer hierarchy
- [ ] T005 [US1] Update spacing, typography, and card styles in public/style.css
- [ ] T006 [US1] Update rendering logic for questions list in public/script.js

## Phase 3: User Story 2 — Knowledge Base Smart Questions (Priority: P1)
**Goal**: Generate questions from active template + portfolio
**Independent Test**: Save template, generate questions, verify template context is used
- [ ] T007 [US2] Update template save/load flow in public/script.js
- [ ] T008 [US2] Ensure template + portfolio data feed prompt in generateQuestions in public/script.js
- [ ] T009 [US2] Update Knowledge Base UI hints in public/index.html and public/style.css

## Phase 4: User Story 3 — Chat Separation (Priority: P1)
**Goal**: Separate interviewer questions and AI answers in chatbox
**Independent Test**: Generate question and answer, verify distinct chat items
- [ ] T010 [US3] Add chat item state and helpers in public/script.js
- [ ] T011 [US3] Render interviewer vs AI entries in main chat area in public/script.js
- [ ] T012 [US3] Update question generation flow to create interviewer chat items in public/script.js

## Phase 5: User Story 4 — PIP Chat Separation (Priority: P2)
**Goal**: PIP shows interviewer questions and AI answers as separate entries
**Independent Test**: Toggle PIP and verify chat stream mirrors main UI
- [ ] T013 [US4] Update PIP markup in public/index.html for separated entries
- [ ] T014 [US4] Update PIP rendering in public/script.js (updatePipTranscription/updatePipAI)
- [ ] T015 [US4] Align PIP styling with new chat separation in public/style.css

## Phase 6: Polish & Verification
- [ ] T016 [P] Clean up unused UI states and labels in public/script.js
- [ ] T017 Run manual checks per quickstart.md
