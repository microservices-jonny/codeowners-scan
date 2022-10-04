import * as github from '@actions/github'

export function getRunDetails(context: typeof github.context): {
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
