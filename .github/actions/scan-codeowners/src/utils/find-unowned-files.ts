import * as core from '@actions/core'
import * as github from '@actions/github'
import {isSomePatternMatch, fetchCodeownersPatterns} from './codeowners'
import {MyOctokit} from './types'
import {PullRequest} from '@octokit/webhooks-definitions/schema'
import debugBase from './debug'

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
  const allChanges = result.data
  debug(
    `found %o changed files. First 100 changed files: %o`,
    allChanges.length,
    allChanges.map(change => change.filename).slice(0, 100)
  )
  const addedOrChanged = allChanges
    .filter(change => change.status !== 'removed')
    .map(change => change.filename)
  debug(
    `after filtering out removed files, found %o added-or-changed. first 100: %o`,
    addedOrChanged.length,
    addedOrChanged.slice(0, 100)
  )
  return addedOrChanged
}
