import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  PullRequest,
  PullRequestEvent
} from '@octokit/webhooks-definitions/schema'
import {createOrUpdateComment} from './create-or-update-comment'
import {findUnownedFiles} from './utils/find-unowned-files'
import {getRunDetails} from './utils/github/get-run-details'
import {toMarkdown} from './format-comment'
import debug, {enableDebugging} from './utils/debug'

async function run(): Promise<void> {
  try {
    const token = core.getInput('GITHUB_TOKEN')
    const octokit = github.getOctokit(token)
    const enableDebugLog = core.getInput('enable-debug-log')

    if (enableDebugLog) {
      enableDebugging()
      core.info('ENABLE DEBUGGING')
      process.env['DEBUG'] = 'codeowners-scan:*'
      // debug.log = (...args) => console.log(...args) // eslint-disable-line no-console
    }

    let payload = github.context.payload
    core.info(`HELLO v3, eventName: ${github.context.eventName}`)
    if (github.context.eventName === 'pull_request') {
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
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
