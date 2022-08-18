import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  isSomePatternMatch,
  parseCodeownersPatterns,
  fetchCodeownersPatterns
} from './codeowners'
import {MyOctokit} from './types'
import {PullRequest} from '@octokit/webhooks-definitions/schema'
import {debugBase} from './debug'

const debug = debugBase.extend('fetch-codeowners')

/**
 * doc links
 * https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#push
 * https://github.com/actions/toolkit
 * https://docs.github.com/en/rest/pulls/pulls#list-pull-requests-files
 * https://octokit.github.io/rest.js/v18#repos
 * https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
 * https://github.com/kaelzhang/node-ignore#usage
 */

export async function findUnownedFiles(
  token: string,
  {pr}: {pr: PullRequest}
): Promise<string[]> {
  const octokit = github.getOctokit(token)
  const changedFiles = await findAddedOrChangedFiles(octokit, {pr})
  const patterns = await fetchCodeownersPatterns(octokit, {
    owner: pr.base.repo.owner.login,
    repo: pr.base.repo.name,
    ref: pr.base.ref
  })
  const unownedFiles = changedFiles.filter(
    filename => !isSomePatternMatch(filename, patterns)
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
