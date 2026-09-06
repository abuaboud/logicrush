# Issue tracker

Issues for this repo live in **GitHub Issues** on `abuaboud/logicrush`, and every
issue is also an item on the **LogicRush project board**
(<https://github.com/users/abuaboud/projects/4>).

## Reading

- List: `gh issue list --repo abuaboud/logicrush`
- Read one: `gh issue view <number> --repo abuaboud/logicrush --comments`
- Ready to pick up: `gh issue list --repo abuaboud/logicrush --label ready-for-agent`

## Writing

- Create: `gh issue create --repo abuaboud/logicrush --title "..." --body-file <file> --label ready-for-agent`
- Add to the board: `gh project item-add 4 --owner abuaboud --url <issue-url>`

## Conventions

- Every issue carries an **Acceptance criteria** section and a **Verification**
  section. Verification is the exact command a reviewer runs, plus what a pass
  looks like. An issue without a runnable verification is not ready.
- Blocking edges are recorded in a **Blocked by** section referencing issue
  numbers.
- Epics carry the `epic` label and list their children.

## PRs as a request surface

Off. External pull requests are not part of the triage queue.
