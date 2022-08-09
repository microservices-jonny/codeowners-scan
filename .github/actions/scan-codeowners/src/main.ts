import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  PullRequest,
  PullRequestEvent
} from '@octokit/webhooks-definitions/schema'
import {UUID, createOrUpdateComment} from './create-or-update-comment'
import ignore from 'ignore'
import {toMarkdown} from './format-comment'

/*
 * Whether the filename matches any of the passed patterns.
 */
function isPatternMatch(filename: string, patterns: string[]): boolean {
  return ignore().add(patterns).ignores(filename)
}

/**
 * doc links
 * https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#push
 * https://github.com/actions/toolkit
 * https://docs.github.com/en/rest/pulls/pulls#list-pull-requests-files
 * https://octokit.github.io/rest.js/v18#repos
 * https://github.com/micromatch/picomatch#options
 * https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
 * https://github.com/kaelzhang/node-ignore#usage
 */

// TODO, catch (?) the 404 if the file doesn't exist
// TODO: try multiple file locations as specified by github's docs
// TODO: coalesce unowned files to shared paths. Ie if /path/to/a.txt and /path/to/b.txt, can just print `/path/to/*` had unowned files
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

type MyOctokit = ReturnType<typeof github.getOctokit>

async function findAddedOrChangedFiles(
  octokit: MyOctokit,
  {pr}: {pr: PullRequest}
): Promise<string[]> {
  const result = await octokit.rest.pulls.listFiles({
    owner: pr.base.repo.owner.login,
    repo: pr.base.repo.name,
    pull_number: pr.number
  })
  const changedFiles = result.data
    .filter(change => change.status !== 'removed')
    .map(change => change.filename)
  core.info(`findAddedOrChangedFiles found ${changedFiles.length}`)
  for (const file of changedFiles) {
    core.info(`findAddedOrChangedFiles: file changed: ${file}`)
  }
  return changedFiles
}

async function findUnownedFiles(
  octokit: MyOctokit,
  {pr}: {pr: PullRequest}
): Promise<string[]> {
  const changedFiles = await findAddedOrChangedFiles(octokit, {pr})
  const codeowners = await fetchCodeowners(octokit, {
    owner: pr.base.repo.owner.login,
    repo: pr.base.repo.name,
    ref: pr.base.ref
  })
  const patterns = parseCodeownersPatterns(codeowners)
  const unownedFiles = changedFiles.filter(
    filename => !isPatternMatch(filename, patterns)
  )
  return unownedFiles
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
    core.info(`HELLO v2, eventName: ${github.context.eventName}`)
    if (github.context.eventName === 'pull_request') {
      payload = payload as PullRequestEvent
      const afterSha = payload.after
      const pr = payload.pull_request as PullRequest
      const unownedFiles = await findUnownedFiles(octokit, {pr})
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
