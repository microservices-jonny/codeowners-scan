import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  PullRequest,
  PullRequestEvent
} from '@octokit/webhooks-definitions/schema'
import {createOrUpdateComment} from './utils/create-or-update-comment'
import {getRunDetails} from './utils/github/get-run-details'
import {toMarkdown} from './utils/format-comment'
import {enableDebugging} from './utils/debug'
import {scan} from './utils/codeowners'

/**
 * doc links
 * https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#push
 * https://github.com/actions/toolkit
 * https://docs.github.com/en/rest/pulls/pulls#list-pull-requests-files
 * https://octokit.github.io/rest.js/v18#repos
 * https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
 * https://github.com/kaelzhang/node-ignore#usage
 */

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

    const scanResult = await scan(token, {pr})

    core.info(
      `Found ${scanResult.addedOrChangedFiles.length} added or changed files for pr ${pr.number} [ref ${pr.head.ref}] relative to base ${pr.base.ref}`
    )
    core.info(
      `Found ${
        scanResult.patterns.length
      } patterns in the following codeowners files ${scanResult.codeownersFiles.join(
        ', '
      )}`
    )
    core.info(`${scanResult.unownedFiles.length} files failed to match`)
    for (const filename of scanResult.unownedFiles) {
      core.info(`Did not match: ${filename}`)
    }

    const runDetails = getRunDetails(github.context)
    const comment = toMarkdown(scanResult, {sha: afterSha, runDetails})
    await createOrUpdateComment(octokit, {pr, body: comment})
    /*
    TO ENABLE FAILING:
    if (scanResult.unownedFiles.length) {
      core.setFailed(`${scanRules.unownedFiles.length} file(s) are not covered by a CODEOWNERS rule`);
    }
    */
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
