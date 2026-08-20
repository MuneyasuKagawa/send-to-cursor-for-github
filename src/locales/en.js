/**
 * English messages. Keys map one-to-one to src/locales/ja.js.
 *
 * `targets.<id>.template` is the default prompt, and "reset to the default" in the options
 * page goes back to it. `{name}` is substituted by src/i18n.js, while `{{name}}` is a
 * prompt placeholder expanded by src/prompt.js.
 */
var GHCursorLink = globalThis.GHCursorLink || (globalThis.GHCursorLink = {});

(function (ns) {
  /** Keeps the agent from working on the wrong branch (shared by targets that have branches) */
  const CHECK_REPO_AND_BRANCH = `Before you start, check that the repository you have open and the branch currently checked out match the above.
If they do not match, offer the following and then stop.
- switch the branch
- continue in a worktree
- do nothing because I will switch it myself`;

  /** An issue has no branch, so only the repository is checked */
  const CHECK_REPO = `Before you start, check that the repository you have open matches the above.
If it does not match, ask me to open the correct repository and then stop.`;

  const PR_TARGET_LINES = `- Repository: {{repository}}
- PR: #{{prNumber}} {{prTitle}}
- PR URL: {{prUrl}}
- Working branch (head): {{headBranch}}
- Head label (including the fork owner): {{headLabel}}
- Base branch (base): {{baseBranch}}`;

  const ISSUE_TARGET_LINES = `- Repository: {{repository}}
- Issue: #{{issueNumber}} {{issueTitle}}
- Issue URL: {{issueUrl}}`;

  ns.MESSAGES = ns.MESSAGES || {};
  ns.MESSAGES.en = {
    // --- Options page -----------------------------------------------------
    'options.title': 'Send to Cursor for GitHub settings',
    'options.tab.general': 'General',
    'options.tab.off': 'Off',

    'options.language.title': 'Language',
    'options.language.hint':
      'Used for this options page, the button, and the default prompts. Prompts are stored per language, so your edits are kept when you switch.',

    'options.linkMode.title': 'How to open the link',
    'options.linkMode.protocol.title': 'Open `cursor://` directly',
    'options.linkMode.protocol.hint': 'Launches the Cursor app directly. Use this unless it fails.',
    'options.linkMode.web.title': 'Go through `https://cursor.com/link/`',
    'options.linkMode.web.hint':
      'An alternative for when Chrome blocks the direct launch. Opens cursor.com first, which then hands the prompt to Cursor.',

    'options.label.title': 'Button label',
    'options.label.show': 'Show the label',
    'options.label.hint':
      'Turn this off for an icon-only button. The label you typed is still used as the name for screen readers.',

    'options.target.enabled': 'Show the button for this target',
    'options.target.prompt': 'Prompt',
    'options.target.insert': 'Click to insert at the cursor:',
    'options.target.promptHint':
      'A line that contains a placeholder with no value is dropped as a whole, and a heading left with nothing under it is dropped with it.',
    'options.target.reset': 'Reset to the default',

    'options.reset.title': 'Resetting prompts',
    'options.reset.hint':
      'Resets the prompts for every target to the defaults for the current language. Your edits are lost. Each target can also be reset on its own.',
    'options.reset.all': 'Reset all prompts to the defaults',
    'options.status.saved': 'Saved',
    'options.status.reset': 'Reset the prompt for "{name}" to the default',
    'options.status.resetAll': 'Reset all prompts to the defaults',
    'options.status.saveFailed': 'Could not save: {error}',
    'options.status.oversized':
      'The prompt for "{name}" is too long to save ({bytes} / {limit} bytes). It is saved once you shorten it.',

    // --- Button -----------------------------------------------------------
    'button.copied': 'Copied',
    'tooltip.truncated': '{tooltip} (the body was long, so part of it was cut)',
    'tooltip.shiftToCopy': 'Shift-click to copy the prompt',
    'prompt.truncationNote': '…(the rest was cut because the body is long)',
    'log.injectFailed': 'Failed to insert the button',

    // --- Placeholder hints (shown on hover in the options page) -----------
    'placeholders.repository': 'Repository name in owner/repo form',
    'placeholders.prNumber': 'PR number (without the #)',
    'placeholders.prTitle': 'PR title',
    'placeholders.prUrl': 'URL of the PR page',
    'placeholders.prBody':
      'PR description (raw Markdown). Not available outside the Conversation tab, where it is empty',
    'placeholders.headBranch': 'Working branch name (head)',
    'placeholders.headLabel':
      'Filled in owner:branch form only for a PR from a fork. Empty for a PR within the same repository',
    'placeholders.baseBranch': 'Branch the PR merges into (base)',
    'placeholders.author':
      'Author of the comment. The PR author for "Whole pull request", the issue author for "Issue body"',
    'placeholders.commentUrl': 'Link to that comment (with the anchor)',
    'placeholders.commentBody': 'Comment body (raw Markdown). Images are removed and a long body is cut',
    'placeholders.filePath': 'Path of the file the diff comment is on. Empty for a conversation comment',
    'placeholders.lines': 'Line number the comment is on. 12-18 form for multiple lines',
    'placeholders.checkName': 'Name of the failed check',
    'placeholders.checkUrl': 'URL of the detail page for that check',
    'placeholders.failureOutput':
      'What could be read from the page (the status text, plus annotations when a single check is open). The full log is not included',
    'placeholders.issueNumber': 'Issue number (without the #)',
    'placeholders.issueTitle': 'Issue title',
    'placeholders.issueUrl': 'URL of the issue page',
    'placeholders.issueLabels': 'Comma-separated label names on the issue. Empty when there are none',
    'placeholders.issueBody': 'Issue body (raw Markdown). Images are removed and a long body is cut',

    // --- Targets ----------------------------------------------------------
    'targets.prReview.name': 'Whole pull request',
    'targets.prReview.description':
      'Adds the button to the PR header and the PR description. Asks Cursor to review the whole diff of the PR.',
    'targets.prReview.tooltip': 'Review this PR in Cursor',
    'targets.prReview.template': `Review the changes in this GitHub pull request.

## What to work on
${PR_TARGET_LINES}
- Author: {{author}}

${CHECK_REPO_AND_BRANCH}

## PR description
{{prBody}}

## What I want
1. Read the diff between the base branch and the working branch, and work out the intent of the change as a whole.
2. Give priority to anything that could lead to a defect (boundary values, error handling, async code, backward compatibility).
3. For each point, give the file and line, the condition under which the problem happens, and how to fix it.
4. Point out anywhere the changes contradict the PR description.
5. If something you need in order to judge is missing, list what is missing instead of guessing.
6. Do not change any code at this stage; stop once you have presented the review.
7. Write your answer in English.`,

    'targets.prComment.name': 'Pull request comments',
    'targets.prComment.description':
      'Adds a button to review comments and conversation comments on a PR that checks the comment and proposes how to act on it.',
    'targets.prComment.tooltip': 'Check this comment in Cursor',
    'targets.prComment.template': `Check the content of a comment on this GitHub pull request and propose how to act on it.

## What to work on
${PR_TARGET_LINES}

${CHECK_REPO_AND_BRANCH}

## About the comment
- Comment URL: {{commentUrl}}
- Author: {{author}}
- File: {{filePath}}
- Lines: {{lines}}

## Comment body
{{commentBody}}

## What I want
1. Read the code in question and check whether the comment still applies to the current code.
2. If something needs to change, give the files and lines to change and a concrete plan.
3. If you conclude that nothing needs to change, explain why, pointing at the code that shows it.
4. If something you need in order to judge is missing, list what is missing instead of guessing.
5. Do not change any code at this stage; stop once you have presented your findings and proposal.
6. Write your answer in English, whatever language the comment is in.`,

    'targets.ciFailure.name': 'Failed CI checks',
    'targets.ciFailure.description':
      'Adds the button to failing rows in the check list of a PR. The full log cannot be read from the page, so the prompt asks for the cause to be investigated.',
    'targets.ciFailure.tooltip': 'Investigate this CI failure in Cursor',
    'targets.ciFailure.template': `Investigate why this GitHub CI check failed.

## What to work on
${PR_TARGET_LINES}

${CHECK_REPO_AND_BRANCH}

## The failed check
- Check name: {{checkName}}
- Check URL: {{checkUrl}}

## What could be read from the page
{{failureOutput}}

## What I want
1. Work out what the failed check runs, from the workflow definitions and config files in the repository.
2. If you can, run the same command locally and reproduce the failure.
3. Explain the cause of the failure, pointing at the file and line.
4. Propose a concrete fix.
5. What is quoted above is only what the page showed; it does not include the full log. If that is not enough, list the logs or results you need instead of guessing.
6. Do not change any code at this stage; stop once you have presented the cause and the proposed fix.
7. Write your answer in English.`,

    'targets.issueBody.name': 'Issue body',
    'targets.issueBody.description':
      'Adds the button to the issue description. Asks Cursor to plan how to implement what the issue asks for.',
    'targets.issueBody.tooltip': 'Plan this issue in Cursor',
    'targets.issueBody.template': `Take in this GitHub issue and propose a plan for implementing it.

## What to work on
${ISSUE_TARGET_LINES}
- Labels: {{issueLabels}}
- Author: {{author}}

${CHECK_REPO}

## Issue body
{{issueBody}}

## What I want
1. Read the related code and line up what the issue asks for against how things work today.
2. List anything vague in the request, and any decision that has to be made first.
3. Present a plan detailed enough to show which files change and how the flow goes.
4. List what it affects (behaviour that changes, tests that should be added).
5. Do not change any code at this stage; stop once you have presented the plan.
6. Write your answer in English, whatever language the issue is in.`,

    'targets.issueComment.name': 'Issue comments',
    'targets.issueComment.description':
      'Adds a button to comments on an issue that checks the comment and proposes how to act on it.',
    'targets.issueComment.tooltip': 'Check this comment in Cursor',
    'targets.issueComment.template': `Check the content of a comment on this GitHub issue and propose how to act on it.

## What to work on
${ISSUE_TARGET_LINES}

${CHECK_REPO}

## About the comment
- Comment URL: {{commentUrl}}
- Author: {{author}}

## Comment body
{{commentBody}}

## What I want
1. Read the related code and check whether the comment still applies to the current code.
2. If something needs to change, give the files and lines to change and a concrete plan.
3. If you conclude that nothing needs to change, explain why, pointing at the code that shows it.
4. If something you need in order to judge is missing, list what is missing instead of guessing.
5. Do not change any code at this stage; stop once you have presented your findings and proposal.
6. Write your answer in English, whatever language the comment is in.`,
  };
})(GHCursorLink);
