import * as core from '@actions/core'
import * as github from '@actions/github'
import ignore from 'ignore'

import {
  PullRequest,
  PullRequestEvent,
  PullRequestSynchronizeEvent,
  PushEvent
} from '@octokit/webhooks-definitions/schema'

/*
 * Whether the filename matches any of the passed patterns.
 */
function isPatternMatch(filename: string, patterns: string[]): boolean {
  return ignore().add(patterns).ignores(filename)
}

/**
 * doc links
 * https://github.com/actions/toolkit
 * https://docs.github.com/en/rest/pulls/pulls#list-pull-requests-files
 * https://octokit.github.io/rest.js/v18#repos
 * https://github.com/micromatch/picomatch#options
 * https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
 */

// TODO: Update PR with a comment that lists the unmatched files

// TODO swithc picomatch for https://github.com/kaelzhang/node-ignore

// TODO, catch (?) the 404 if the file doesn't exist
// TODO: try multiple file locations as specified by github's docs
async function fetchCodeowners(octokit, {owner, repo, ref}) {
  const result = await octokit.rest.repos.getContent({
    owner,
    repo,
    ref,
    path: 'CODEOWNERS'
  })
  if (result.data.content) {
    const encoded = Buffer.from(result.data.content || '', 'base64')
    const decoded = encoded.toString('utf8')
    return decoded
  } else {
    return ''
  }
}

function parseCodeowners(codeowners: string): [string, string][] {
  return codeowners
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => !line.startsWith('#'))
    .map(line => {
      const parts = line.split(/\s+/).map(part => part.trim())
      return [parts[0], parts[1]]
    })
}

function parseCodeownersPatterns(codeowners: string): string[] {
  return parseCodeowners(codeowners).map(tuple => tuple[0])
}

async function run(): Promise<void> {
  try {
    const token = core.getInput('GITHUB_TOKEN')
    const octokit = github.getOctokit(token)

    let payload = github.context.payload
    core.info(`HELLO, eventName: ${github.context.eventName}`)
    if (github.context.eventName === 'pull_request') {
      // https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#push
      payload = payload as PullRequestEvent
      const afterSha = payload.after
      const pull_request = payload.pull_request as PullRequest
      const baseSha = pull_request.base.sha
      core.info(`HELLO baseRef: ${baseSha}, afterSha ${afterSha}`)
      const result = await octokit.rest.pulls.listFiles({
        owner: pull_request.base.repo.owner.login,
        repo: pull_request.base.repo.name,
        pull_number: pull_request.number
      })
      const addedOrChangedFiles = result.data
        .filter(change => change.status !== 'removed')
        .map(change => change.filename)

      const codeowners = await fetchCodeowners(octokit, {
        owner: pull_request.base.repo.owner.login,
        repo: pull_request.base.repo.name,
        ref: pull_request.base.ref
      })
      core.info(`CONTENTS OF CODEOWNERS: ${codeowners}`)
      const patterns = parseCodeownersPatterns(codeowners)
      core.info(`changed files: ${addedOrChangedFiles.join('\n')}`)
      const unmatchedFiles = addedOrChangedFiles.filter(
        filename => !isPatternMatch(filename, patterns)
      )

      core.info(`${unmatchedFiles.length} files failed to match`)
      for (const filename of unmatchedFiles) {
        core.info(`Did not match: ${filename}`)
      }
    }

    // https://github.com/actions/toolkit/tree/main/packages/core
    core.info(`before: ${payload.before} -> after ${payload.after}`)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
