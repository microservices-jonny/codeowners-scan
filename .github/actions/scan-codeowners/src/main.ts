import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  PullRequest,
  PullRequestEvent,
  PullRequestSynchronizeEvent,
  PushEvent
} from '@octokit/webhooks-definitions/schema'

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
  }
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
      for (const filename of addedOrChangedFiles) {
        core.info(`added or changed: ${filename}`)
      }

      const codeowners = await fetchCodeowners(octokit, {
        owner: pull_request.base.repo.owner.login,
        repo: pull_request.base.repo.name,
        ref: pull_request.base.ref
      })
      core.info(`CONTENTS OF CODEOWNERS: ${codeowners}`)
    }

    // https://github.com/actions/toolkit/tree/main/packages/core
    core.info(`before: ${payload.before} -> after ${payload.after}`)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
