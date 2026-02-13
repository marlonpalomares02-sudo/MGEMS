# MGEMS – Spec Kit + Gemini CLI Quick-Start

## 1. Run any Spec Kit command with Gemini as the agent
```bash
# Interactive spec creation
/speckit.spec

# Generate implementation plan
/speckit.plan

# Create tasks from plan
/speckit.tasks

# Implement a task
/speckit.impl <task-id>
```

## 2. Manual Gemini calls (optional)
```bash
# Headless prompt
.\gemini-here.cmd --prompt "explain the auth flow in server.js"

# Interactive chat
.\gemini-here.cmd
```

## 3. Update agent context after major changes
```powershell
.specify\scripts\powershell\update-agent-context.ps1 gemini
```

## 4. Project rules (from GEMINI.md)
- Node/Express backend, vanilla JS frontend
- Keep routes thin; logic in `routes/` modules
- Use `console.log` for debugging (Render captures stdout)
- Never commit `.env` (only `.env.example`)

Happy spec-driven coding!