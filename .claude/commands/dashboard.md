---
description: "Launch Memento real-time monitoring dashboard with license validation"
tools_allowed: ["Bash"]
---

🚀 **MEMENTO DASHBOARD** - Real-time system monitoring with license gate security

This command launches Memento's terminal-based monitoring dashboard with mandatory license validation.

**CRITICAL SECURITY ENFORCEMENT:**
- ALL access goes through license validation gate first
- Dashboard is BLOCKED until valid license confirmed  
- Regular license checking prevents access with expired/revoked licenses
- No web server - pure terminal interface eliminates attack surface

**Dashboard Features:**
- 🖥️ **System Performance**: CPU, memory, uptime, thread count
- ⚙️ **Process Status**: dotnet process monitoring, memory tracking  
- 🚨 **Violation Detection**: Memory leak alerts, policy violations
- 🗄️ **Database Health**: Connection status, RAG system monitoring

**Security Model:**
This demonstrates Memento's "Gate System" approach where user functionality is BLOCKED (not warned) until license validation succeeds. This same pattern protects all Memento capabilities.

```bash
dotnet run --project src/Memento.CLI dashboard
```

**License Requirements:**
- Valid license key (Trial, Standard, Professional, Enterprise, or Black Site)
- Active license status (not expired or revoked)  
- Grace period support when license server temporarily unavailable
- Hardware fingerprint validation for license binding

**Non-Interactive Mode:**
When run in Claude Code (non-interactive), shows 5 monitoring snapshots then exits. Perfect for system health verification during development.