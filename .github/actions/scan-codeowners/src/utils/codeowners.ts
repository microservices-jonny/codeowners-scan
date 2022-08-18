import ignore from 'ignore'
import {MyOctokit} from './types'
import debugBase from './debug'

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

// TODO, catch (?) the 404 if the file doesn't exist
// TODO: try multiple file locations as specified by github's docs
// TODO: coalesce unowned files to shared paths. Ie if /path/to/a.txt and /path/to/b.txt, can just print `/path/to/*` had unowned files
export async function fetchCodeownersPatterns(
  octokit: MyOctokit,
  {owner, repo, ref}
): Promise<string[]> {
  const codeowners = await fetchFile(octokit, {
    owner,
    repo,
    ref,
    path: 'CODEOWNERS'
  })
  const patterns = parseCodeownersPatterns(codeowners)
  debug(`Found %o codeowners patterns`, patterns.length)
  return patterns
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
    debug(`file was empty or missing at path %o`, path)
    return ''
  }
}

function parseCodeownersPatterns(codeowners: string): string[] {
  return parseCodeowners(codeowners).map(tuple => tuple[0])
}
