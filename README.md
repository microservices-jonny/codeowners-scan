# Scan Codeowners Action

A github action that is intended to be run whenever a commit is pushed to a PR.
The action looks over the files that were modified (added or changed) and determines if there
is a codeowners pattern on the base branch that covers each file. Any files that are not covered
are considered "unowned". The action adds a comment to the PR with the results.

A sample comment looks like this:

![./screenshot.png]

--

This code is based off of the template https://github.com/actions/typescript-action.
