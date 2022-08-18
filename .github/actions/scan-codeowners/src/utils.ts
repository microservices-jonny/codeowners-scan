import * as core from '@actions/core'
import * as github from '@actions/github'
import {isPatternMatch, parseCodeownersPatterns} from './main'
import {MyOctokit} from './utils/types'
import {PullRequest} from '@octokit/webhooks-definitions/schema'

/**
 * doc links
 * https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#push
 * https://github.com/actions/toolkit
 * https://docs.github.com/en/rest/pulls/pulls#list-pull-requests-files
 * https://octokit.github.io/rest.js/v18#repos
 * https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
 * https://github.com/kaelzhang/node-ignore#usage
 */
// TODO, catch (?) the 404 if the file doesn't exist
// TODO: try multiple file locations as specified by github's docs
// TODO: coalesce unowned files to shared paths. Ie if /path/to/a.txt and /path/to/b.txt, can just print `/path/to/*` had unowned files
async function fetchCodeowners(
  octokit: MyOctokit,
  {owner, repo, ref}
): Promise<string> {
  const result = await octokit.rest.repos.getContent({
    owner,
    repo,
    ref,
    path: 'CODEOWNERS'
  })
  const data = result.data as unknown as {content: string}
  const content = data.content || ''
  if (content) {
    const encoded = Buffer.from(content, 'base64')
    const decoded = encoded.toString('utf8')
    return decoded
  } else {
    return ''
  }
}

export async function findUnownedFiles(
  token: string,
  {pr}: {pr: PullRequest}
): Promise<string[]> {
  const octokit = github.getOctokit(token)
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
