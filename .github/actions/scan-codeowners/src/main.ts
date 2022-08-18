import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  PullRequest,
  PullRequestEvent
} from '@octokit/webhooks-definitions/schema'
import {createOrUpdateComment} from './create-or-update-comment'
import {findUnownedFiles} from './utils'
import ignore from 'ignore'
import {toMarkdown} from './format-comment'

/*
 * Whether the filename matches any of the passed patterns.
 */
export function isPatternMatch(filename: string, patterns: string[]): boolean {
  return ignore().add(patterns).ignores(filename)
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

export function parseCodeownersPatterns(codeowners: string): string[] {
  return parseCodeowners(codeowners).map(tuple => tuple[0])
}

function getRunDetails(context: typeof github.context): {
  id: number
  url: string
} {
  const {
    runId,
    issue: {owner, repo}
  } = context

  const url = `https://github.com/${owner}/${repo}/actions/runs/${runId}`

  return {
    id: context.runId,
    url
  }
}

async function run(): Promise<void> {
  try {
    const token = core.getInput('GITHUB_TOKEN')
    const octokit = github.getOctokit(token)

    let payload = github.context.payload
    core.info(`HELLO v3, eventName: ${github.context.eventName}`)
    if (github.context.eventName === 'pull_request') {
      payload = payload as PullRequestEvent
      const afterSha = payload.after
      const pr = payload.pull_request as PullRequest
      const unownedFiles = await findUnownedFiles(token, {pr})
      core.info(`${unownedFiles.length} files failed to match`)
      for (const filename of unownedFiles) {
        core.info(`Did not match: ${filename}`)
      }
      const runDetails = getRunDetails(github.context)
      const comment = toMarkdown({unownedFiles}, {sha: afterSha, runDetails})
      await createOrUpdateComment(octokit, {pr, body: comment})
    }

    // https://github.com/actions/toolkit/tree/main/packages/core
    core.info(`before: ${payload.before} -> after ${payload.after}`)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
