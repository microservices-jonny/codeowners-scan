import ignore from 'ignore'
import {MyOctokit} from './types'
import debugBase from './debug'
import {RequestError} from '@octokit/request-error'

const debug = debugBase.extend('codeowners-file')

/*
 * Whether the filename matches one of the passed patterns.
 */

export function isSomePatternMatch(
  filename: string,
  patterns: string[]
): boolean {
  return ignore().add(patterns).ignores(filename)
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

export async function fetchCodeownersPatterns(
  octokit: MyOctokit,
  {owner, repo, ref}
): Promise<string[]> {
  const codeownersFiles = await findCodeownersFiles(octokit, {owner, repo, ref})
  let patterns: string[] = []
  for (const [file, contents] of Object.entries(codeownersFiles)) {
    const parsedPatterns = parseCodeownersPatterns(contents)
    debug(`Parsed %o patterns from file %o`, parsedPatterns.length, file)
    patterns = [...patterns, ...parsedPatterns]
  }
  debug(
    `Found %o codeowners patterns. first 100 %O`,
    patterns.length,
    patterns.slice(0, 100)
  )
  return patterns
}

async function findCodeownersFiles(
  octokit: MyOctokit,
  {owner, repo, ref}
): Promise<Record<string, string>> {
  const paths = ['CODEOWNERS', '.github/CODEOWNERS']

  const results: Record<string, string> = {}

  for (const path of paths) {
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

async function fetchFile(
  octokit: MyOctokit,
  {owner, repo, ref, path}
): Promise<string> {
  const result = await octokit.rest.repos.getContent({
    owner,
    repo,
    ref,
    path
  })
  debug(`fetching file at path %o`, path)
  const data = result.data as unknown as {content: string}
  const content = data.content || ''
  if (content) {
    const encoded = Buffer.from(content, 'base64')
    const decoded = encoded.toString('utf8')
    return decoded
  } else {
    debug(`unexpectedly found no content for file at path %o`, path)
    return ''
  }
}

function parseCodeownersPatterns(codeowners: string): string[] {
  return parseCodeowners(codeowners).map(tuple => tuple[0])
}
