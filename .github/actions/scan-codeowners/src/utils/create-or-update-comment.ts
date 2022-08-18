import {MyOctokit} from './types'
import {PullRequest} from '@octokit/webhooks-definitions/schema'
import {UUID} from './constants'
import debugBase from './debug'

const debug = debugBase.extend('create-or-update-comment')

interface GithubComment {
  id: number
  user: {type: string} | null
  body?: string
}

async function findExistingComment(
  octokit: MyOctokit,
  {
    owner,
    repo,
    issue_number
  }: {owner: string; repo: string; issue_number: number}
): Promise<GithubComment | undefined> {
  const {data: comments} = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number
  })

  const predicate = (comment: GithubComment): boolean =>
    Boolean(comment.user?.type === 'Bot' && comment.body?.includes(UUID))

  return comments.find(predicate)
}

export async function createOrUpdateComment(
  octokit: MyOctokit,
  {pr, body}: {pr: PullRequest; body: string}
): Promise<void> {
  const owner = pr.base.repo.owner.login
  const repo = pr.base.repo.name
  const issue_number = pr.number

  const comment = await findExistingComment(octokit, {
    owner,
    repo,
    issue_number
  })

  if (!comment) {
    debug(`Found no comment, creating one`)
    const result = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number,
      body
    })
    debug(`Created comment with id %o`, result.data.id)
  } else {
    debug(`Found comment %o, updating its body`, comment.id)
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: comment.id,
      body
    })
  }
}
