import * as github from '@actions/github'
import {PullRequest} from '@octokit/webhooks-definitions/schema'
import {findUnownedFiles} from './utils/find-unowned-files'

async function run(): Promise<void> {
  const token = process.env['GITHUB_TOKEN'] as string
  const octokit = github.getOctokit(token)

  const PR = parseInt(process.env['PR'] as string)
  const REPO = process.env['REPO'] as string
  const OWNER = process.env['OWNER'] as string

  const result = await octokit.rest.pulls.get({
    pull_number: PR,
    repo: REPO,
    owner: OWNER
  })
  const pr = result.data as PullRequest
  const unownedFiles = await findUnownedFiles(token, {pr})

  console.log(`${unownedFiles.length} files failed to match`)
  for (const filename of unownedFiles) {
    console.log(`Did not match: ${filename}`)
  }
}

run()
