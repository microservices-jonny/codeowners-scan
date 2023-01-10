import * as github from '@actions/github'
import ignore from 'ignore'
import {MyOctokit, ScanResult} from './types'
import debugBase from './debug'
import {RequestError} from '@octokit/request-error'
import {findAddedOrChangedFiles, findAddedOnlyFiles} from './github/fetch-pr-changed-files'
import type {PullRequest} from '@octokit/webhooks-definitions/schema'
import {fetchFile} from './github/fetch-file'
import {CODEOWNERS_POSSIBLE_FILE_PATHS} from './constants'

export const debug = debugBase.extend('codeowners-file')

/*
 * Whether the filename matches one of the passed patterns.
 */

export function isSomePatternMatch(
  filename: string,
  fileOnlyPatterns: string[]
): boolean {
  return ignore().add(fileOnlyPatterns).ignores(filename)
}

export function isSomeOwnerMatch(
  filename: string,
  patterns: [string, string][]
): boolean {
  return patterns.some(([pattern, owner]) => !isSomePatternMatch(filename, [pattern]) || isSomePatternMatch(filename, [pattern]) && owner.toLowerCase().startsWith('@addepar/'))
}

function parseAllPatterns(
  codeownersFilesMap: Record<string, string>
): [string, string][] {
  let patterns: [string, string][] = []
  for (const [file, contents] of Object.entries(codeownersFilesMap)) {
    // BELOW: Switching from parsedPatterns being a list of file paths to a list of tuples containing file path and owner
    
    const parsedPatterns = parseCodeowners(contents)
    //const parsedPatterns = parseCodeownersPatterns(contents)

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
    owner: pr.head.repo.owner.login,
    repo: pr.head.repo.name,
    ref: pr.head.ref
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
  /*
    Changing to AddedOnlyFiles to ignore any changed files
  */
  //const addedOrChangedFiles = await findAddedOrChangedFiles(octokit, {pr})
  const addedOnlyFiles = await findAddedOnlyFiles(octokit, {pr})
  const patterns = parseAllPatterns(codeownersFilesMap)

  let fileOnlyPatterns: string[] = []
  for(const [pattern, owner] of patterns) {
    fileOnlyPatterns.push(pattern)
  }

  const unownedFiles = addedOnlyFiles.filter(
    filename => !isSomePatternMatch(filename, fileOnlyPatterns)
  )
  const userOwnedFiles = addedOnlyFiles.filter(
    filename => isSomeOwnerMatch(filename, patterns)
  )

  return {
    codeownersFiles: Object.keys(codeownersFilesMap),
    addedOnlyFiles,
    unownedFiles,
    userOwnedFiles,
    patterns,
    fileOnlyPatterns
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
  // below will remove the owner and only return the file
  return parseCodeowners(codeowners).map(tuple => tuple[0])
}
