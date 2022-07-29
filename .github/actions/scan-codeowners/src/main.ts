import * as core from '@actions/core'
import * as github from '@actions/github'
import {PushEvent} from '@octokit/webhooks-definitions/schema'

async function run(): Promise<void> {
  try {
    // const token = core.getInput('GITHUB_TOKEN')
    // const octokit = github.getOctokit(token)

    if (github.context.eventName === 'push') {
      // https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#push
      const payload = github.context.payload as PushEvent

      // https://github.com/actions/toolkit/tree/main/packages/core
      core.info(`before: ${payload.before} -> after ${payload.after}`)
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
