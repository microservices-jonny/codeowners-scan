import * as core from '@actions/core'
import * as github from '@actions/github'
import {PullRequest} from '@octokit/webhooks-definitions/schema'

const debug = (msg: string): void => core.info(msg)

// Random UUID used to identify the last comment added by this
// action
export const UUID = '7c3ad8b6-5e14-433f-9613-d965d9587089'

interface GithubComment {
  id: number
  user: {type: string} | null
  body?: string
}

type MyOctokit = ReturnType<typeof github.getOctokit>

function doesCommentMatch(comment: GithubComment): boolean {
  return Boolean(comment.user?.type === 'Bot' && comment.body?.includes(UUID))
}

async function getComment(
  octokit: MyOctokit,
  {
    owner,
    repo,
    issue_number
  }: {owner: string; repo: string; issue_number: number},
  predicate = doesCommentMatch
): Promise<GithubComment | undefined> {
  const {data: comments} = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number
  })

  return comments.find(predicate)
}

export async function createOrUpdateComment(
  octokit: MyOctokit,
  {pr, body}: {pr: PullRequest; body: string}
): Promise<void> {
  const owner = pr.base.repo.owner.login
  const repo = pr.base.repo.name
  const issue_number = pr.number

  const comment = await getComment(octokit, {
    owner,
    repo,
    issue_number
  })

  if (!comment) {
    debug(`Found no comment, creating one`)
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number,
      body
    })
  } else {
    debug(`Found comment ${comment.id}, updating its body`)
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: comment.id,
      body
    })
  }
}
