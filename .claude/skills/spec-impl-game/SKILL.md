---
name: spec-impl-game
description: Implements an approved game spec using the exact /spec-impl flow, then runs the skin-designer and mobile-porter subagents sequentially (never in parallel) to audit the newly implemented game.
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Agent, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*)
---

# /spec-impl-game — Implement a game spec + post-implementation audits

## Session context

Current repository state:
!`git status --short`

Current branch:
!`git branch --show-current`

Specs available in this folder:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist"`

Branch-creation config:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, no config file)"`

---

## Instructions

### Phases 1–4 — Delegate to /spec-impl

Read `.claude/skills/spec-impl/SKILL.md` and follow its **Phases 1–4 exactly**, using `$ARGUMENTS` as the received argument and the session context above. All of its rules apply unchanged: stops on missing/non-approved specs, working-tree check, branch creation, pauses after every step, never commit.

If the /spec-impl flow stops for any reason (spec not found, state not Approved, user aborts, unresolved ambiguity), **stop here. Do not run Phase 5.**

---

### Phase 5 — Post-implementation audits (sequential)

Run this phase only after the /spec-impl flow has shown its final `✅ All steps of the plan are implemented.` message.

1. Determine the game id from the implemented spec (engine path `lib/games/<id>/` or its row in `references/implemented-games.md`).
2. Launch the `skin-designer` subagent (Agent tool, foreground). Prompt: game id, path of the implemented spec, and a note that the game was just implemented. **Wait for it to finish** and summarize its result to the user (specs written in `specs/skins/`, compliance verdict).
3. Only after step 2 has finished, launch the `mobile-porter` subagent the same way. Wait for it and summarize its result (specs written in `specs/mobile/`).
4. **Never launch both agents in the same message or in parallel.**
5. If an agent fails, report the error and continue with the next one (the audits are independent).
6. Finish with:

```
✅ Implementation + audits done.

Next steps:
  1. Verify the spec's acceptance criteria one by one.
  2. Review the draft specs generated in specs/skins/ and specs/mobile/.
  3. Update the spec's state to "Implemented" and make the final commit.
```

Never commit on the user's behalf.
