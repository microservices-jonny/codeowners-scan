import type {MyOctokit} from '../types'
import {PullRequest} from '@octokit/webhooks-definitions/schema'
import debugBase from '../debug'

const debug = debugBase.extend('find-added-or-changed-files')

export async function findAddedOrChangedFiles(
  octokit: MyOctokit,
  {pr}: {pr: PullRequest}
): Promise<string[]> {
  const result = await octokit.rest.pulls.listFiles({
    owner: pr.base.repo.owner.login,
    repo: pr.base.repo.name,
    pull_number: pr.number
  })
  const allChanges = result.data
  debug(`found %o changed files.`, allChanges.length)
  const addedOrChanged = allChanges
    .filter(change => change.status !== 'removed')
    .map(change => change.filename)
  debug(
    `after filtering out removed files, found %o added-or-changed. first 100: %O`,
    addedOrChanged.length,
    addedOrChanged.slice(0, 100)
  )
  return addedOrChanged
}
