---
name: clean-git-history
description: Organize implementation work in the RoyalPass frontend or backend repository into focused, reviewable Git commits, especially before committing, rewriting unpushed history, or preparing a push.
---

# Clean Git History

When committing changes in this repository:

- Group files by one coherent concern. Separate persistence/schema, infrastructure, domain workflow, UI workflow, and unrelated fixes when they can be reviewed independently.
- Do not pack a multi-feature request into one commit merely because it was implemented in one pass.
- Prefer commits that compile independently. If a schema migration necessarily spans related persistence models, state that clearly in the commit body.
- Use an imperative conventional subject and a detailed body explaining behavior, important invariants, and operational impact.
- Before rewriting history, confirm the commits are unpushed. Preserve the resulting working tree exactly and never rewrite shared remote history without explicit authorization.
- After splitting or rewriting commits, compare the final tree, run the relevant tests/builds, and report the new commit sequence.

