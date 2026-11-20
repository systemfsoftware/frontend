---
title: Commit hooks for repositories where agents do most of the committing
date: 2026-11-19
module: git-hooks
problem_type: workflow-pattern
tags: [husky, lint-staged, commitlint, git, agents]
---

# Commit hooks for repositories where agents do most of the committing

## Invariant

A pre-commit hook writes nothing to the object store except what the commit itself needs, and finishes in about two seconds. A commit-msg hook is structural only.

## What was wrong

`lint-staged --no-revert` still creates a backup stash on every run. `--no-revert` only stops the rollback after a failure; it does not stop the backup. The stash is two extra commit objects per commit when the working tree equals the index, plus a full set of blobs and trees for every unstaged change. Nothing references them afterwards, so they stay as loose objects. Agents commit constantly, so a shared object store grows without bound.

Measured on one real commit of a one-line staged edit, loose objects written (`git count-objects -v` before and after):

| Case                                           | Old hook                         | New hook                      |
| ---------------------------------------------- | -------------------------------- | ----------------------------- |
| Root `README.md` edit                          | 5 (1 blob, 1 tree, 3 commits)    | 3 (1 blob, 1 tree, 1 commit)  |
| Edit six directories deep                      | 10 (1 blob, 6 trees, 3 commits)  | 8 (1 blob, 6 trees, 1 commit) |
| Same deep edit plus an unstaged edit elsewhere | 12 (2 blobs, 7 trees, 3 commits) | 8 (1 blob, 6 trees, 1 commit) |

The new column is the floor: the commit's own blob, trees and commit object.

## Rules

- Run lint-staged with `--no-stash`. It implies no-revert. Formatters and `--fix` linters re-stage their changes; only an error nothing can fix fails the commit. A formatter on a partly staged file stages the whole file, which is acceptable for a task worktree where one agent owns the whole change.
- Invoke hook tools by their `node_modules/.bin` path, not through `pnpm exec`, so no package manager boots on every commit.
- Skip pre-commit while `MERGE_HEAD`, `REBASE_HEAD` or `CHERRY_PICK_HEAD` exists. The staged set is the result of that operation, not authored work.
- Reject unresolved conflict markers by reading each staged blob, not the diff: an opener, a `=======` line and a closer, in that order, at column 0, with optional `\r`. Reading the blob handles CRLF files, `diff.noprefix` and non-ASCII paths (use `core.quotePath=false`), and a lone `=======` heading underline or out-of-order prose never matches. Fail closed when a staged blob cannot be read.
- Skip both hooks for a commit that touches only vendored subtree paths: upstream's files and commit messages are not graded here.
- When `node_modules/.bin/*` is missing, print "run pnpm install" instead of a raw shell error.
- To commit only some hunks of a file, run `git stash push --keep-index` first, because a formatter under `--no-stash` stages the whole file.
- Keep type checking, tests and builds out of local hooks. Pre-push keeps only the guard against pushing a stale `main`. CI is the gate for everything else.

## Not fixed here

The commit-msg hook measures about 0.4 s, above a 0.3 s target. About 0.1 s is the sandbox the hooks run in, and the rest is Node loading commitlint and its TypeScript config. Calling the binary directly instead of through `pnpm exec` saves only about 30 ms.
