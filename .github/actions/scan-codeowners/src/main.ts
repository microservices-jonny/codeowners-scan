import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  PullRequest,
  PullRequestEvent
} from '@octokit/webhooks-definitions/schema'
import {createOrUpdateComment} from './utils/create-or-update-comment'
import {findUnownedFiles} from './utils/find-unowned-files'
import {getRunDetails} from './utils/github/get-run-details'
import {toMarkdown} from './utils/format-comment'
import {enableDebugging} from './utils/debug'

async function run(): Promise<void> {
  try {
    const token = core.getInput('GITHUB_TOKEN')
    const octokit = github.getOctokit(token)
    const enableDebugLog = core.getInput('enable-debug-log')

    if (enableDebugLog === 'true') {
      enableDebugging()
      core.info('Debug log enabled')
    } else {
      core.info('Debug log not enabled')
    }

    let payload = github.context.payload

    if (github.context.eventName !== 'pull_request') {
      core.warning(
        `Expected pull_request event but got ${github.context.eventName}. Exiting. `
      )
      return
    }

    payload = payload as PullRequestEvent
    const afterSha = payload.after
    const pr = payload.pull_request as PullRequest
    const unownedFiles = await findUnownedFiles(token, {pr})

    core.info(`${unownedFiles.length} files failed to match`)
    for (const filename of unownedFiles) {
      core.info(`Did not match: ${filename}`)
    }

    const runDetails = getRunDetails(github.context)
    const comment = toMarkdown({unownedFiles}, {sha: afterSha, runDetails})
    await createOrUpdateComment(octokit, {pr, body: comment})
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
