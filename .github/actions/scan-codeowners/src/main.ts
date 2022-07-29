import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  PullRequest,
  PullRequestEvent,
  PullRequestSynchronizeEvent,
  PushEvent
} from '@octokit/webhooks-definitions/schema'

async function run(): Promise<void> {
  try {
    // const token = core.getInput('GITHUB_TOKEN')
    // const octokit = github.getOctokit(token)

    let payload = github.context.payload
    core.info(`HELLO, eventName: ${github.context.eventName}`)
    if (github.context.eventName === 'pull_request') {
      // https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#push
      payload = payload as PullRequestEvent
      const afterSha = payload.after
      const pull_request = payload.pull_request as PullRequest
      const baseRef = pull_request.base.ref
      core.info(`HELLO baseRef: ${baseRef}, afterSha ${afterSha}`)
    }

    // https://github.com/actions/toolkit/tree/main/packages/core
    core.info(`before: ${payload.before} -> after ${payload.after}`)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
