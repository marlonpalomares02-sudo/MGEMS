# Data Model

## Chat Item
Fields:
- id: string
- type: interviewer_question | ai_answer | system
- text: string
- createdAt: number
- source: user | ai | system

## UI State Additions
- chatItems: ChatItem[]
- activeTemplateId: string
- knowledgeBaseLastSavedAt: number

## Derived Views
- chatThread: chatItems sorted by createdAt
- pipThread: last N chatItems mapped to compact display
