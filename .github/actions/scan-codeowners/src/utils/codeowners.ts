import * as github from '@actions/github'
import ignore from 'ignore'
import {MyOctokit, ScanResult} from './types'
import debugBase from './debug'
import {RequestError} from '@octokit/request-error'
import {findAddedOrChangedFiles} from './github/fetch-pr-changed-files'
import type {PullRequest} from '@octokit/webhooks-definitions/schema'
import {fetchFile} from './github/fetch-file'
import {CODEOWNERS_POSSIBLE_FILE_PATHS} from './constants'

export const debug = debugBase.extend('codeowners-file')

/*
 * Whether the filename matches one of the passed patterns.
 */

export function isSomePatternMatch(
  filename: string,
  patterns: string[]
): boolean {
  return ignore().add(patterns).ignores(filename)
}

function parseAllPatterns(
  codeownersFilesMap: Record<string, string>
): string[] {
  let patterns: string[] = []
  for (const [file, contents] of Object.entries(codeownersFilesMap)) {
    const parsedPatterns = parseCodeownersPatterns(contents)
    debug(`Parsed %o patterns from file %o`, parsedPatterns.length, file)
    patterns = [...patterns, ...parsedPatterns]
  }
  return patterns
}

function extractPrDetails(pr: PullRequest): {
  owner: string
  repo: string
  ref: string
} {
  return {
    owner: pr.base.repo.owner.login,
    repo: pr.base.repo.name,
    ref: pr.base.ref
  }
}

export async function scan(
  token: string,
  {pr}: {pr: PullRequest}
): Promise<ScanResult> {
  const octokit = github.getOctokit(token)
  const codeownersFilesMap = await fetchCodeownersFilesMap(
    octokit,
    extractPrDetails(pr)
  )
  const addedOrChangedFiles = await findAddedOrChangedFiles(octokit, {pr})
  const patterns = parseAllPatterns(codeownersFilesMap)
  const unownedFiles = addedOrChangedFiles.filter(
    filename => !isSomePatternMatch(filename, patterns)
  )

  return {
    codeownersFiles: Object.keys(codeownersFilesMap),
    addedOrChangedFiles,
    unownedFiles,
    patterns
  }
}

async function fetchCodeownersFilesMap(
  octokit: MyOctokit,
  {owner, repo, ref}
): Promise<Record<string, string>> {
  const results: Record<string, string> = {}

  for (const path of CODEOWNERS_POSSIBLE_FILE_PATHS) {
    try {
      results[path] = await fetchFile(octokit, {owner, repo, ref, path})
    } catch (e) {
      if (e instanceof RequestError) {
        if (e.status === 404) {
          debug(`received 404 response when fetching file at path %o`, path)
        } else {
          throw e
        }
      } else {
        throw e
      }
    }
  }

  return results
}

function parseCodeowners(codeowners: string): [string, string][] {
  return codeowners
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => !line.startsWith('#'))
    .map(line => {
      const parts = line.split(/\s+/).map(part => part.trim())
      return [parts[0], parts[1]]
    })
}

function parseCodeownersPatterns(codeowners: string): string[] {
  return parseCodeowners(codeowners).map(tuple => tuple[0])
}
