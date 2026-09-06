# Triage labels

The five canonical triage roles, each label string equal to its name:

| Role | Label | Meaning |
| --- | --- | --- |
| Needs triage | `needs-triage` | Not yet assessed. |
| Needs info | `needs-info` | Blocked on an answer from a human. |
| Ready for agent | `ready-for-agent` | Fully specified; an agent can pick it up cold. |
| Ready for human | `ready-for-human` | Needs a human (credentials, a judgement call, a dashboard). |
| Won't fix | `wontfix` | Closed deliberately. |

Additional labels used by this repo's breakdown:

| Label | Meaning |
| --- | --- |
| `epic` | A parent issue that groups a phase of work. |
| `migration` | Touches the legacy MySQL → Postgres data migration. |
| `parity` | Must match legacy behaviour exactly; carries a golden-data test. |
