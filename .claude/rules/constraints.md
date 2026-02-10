# Project Constraints

These are non-negotiable rules. Claude must not creatively reinterpret or work around them.

## Security

- Never commit secrets, credentials, or API keys

## Governance

- Never modify `.claude/rules/` without explicit human approval

## Safety

- Confirm before destructive operations (delete, drop, overwrite)
- Ask when uncertain rather than assume

## Session Discipline

- Commit atomically at each completed unit of work — do not ask, just commit
- Update `status.md` before ending a session — do not ask, just update
- Use conventional commit format: `type(scope): description`
