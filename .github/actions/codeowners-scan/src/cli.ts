import * as github from '@actions/github'
import {PullRequest} from '@octokit/webhooks-definitions/schema'
import {scan} from './utils/codeowners'

async function run(): Promise<void> {
  const token = process.env['GITHUB_TOKEN'] as string
  const pathsToIgnore = process.env['paths_to_ignore'] as string
  const octokit = github.getOctokit(token)

  const PR = parseInt(process.env['PR'] as string)
  const REPO = process.env['REPO'] as string
  const OWNER = process.env['OWNER'] as string

  if (!PR || !REPO || !OWNER || !token) {
    console.error(`Missing required env vars`)
    process.exit(1)
  }

  const result = await octokit.rest.pulls.get({
    pull_number: PR,
    repo: REPO,
    owner: OWNER
  })
  const pr = result.data as PullRequest
  const scanResult = await scan(token, {pr}, pathsToIgnore)

  console.log(`${scanResult.unownedFiles.length} files failed to match`)
  for (const filename of scanResult.unownedFiles) {
    console.log(`Did not match: ${filename}`)
  }

  console.log(
    `Found ${scanResult.patterns.length} codeowners patterns from ${scanResult.codeownersFiles.length} codeowners files: ${scanResult.codeownersFiles}`
  )
}

run()
