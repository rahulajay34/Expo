# SUBAGENT REGISTRY & COMMUNICATION LOG

## Active Agents:
<!-- Will be populated when agents are spawned -->

## Communication Protocol:
- All agents MUST write their plans to /agents/plans/ before implementing
- All agents MUST read other agents' plans before starting work
- Conflicts are resolved by Lead Orchestrator
- Every agent updates MASTER_CHECKPOINT.md after completing a task
- Every agent writes to /agents/communications/ when making decisions that affect others
