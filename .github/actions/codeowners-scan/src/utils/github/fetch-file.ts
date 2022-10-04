import type {MyOctokit} from '../types'
import debugBase from '../debug'

const debug = debugBase.extend('fetch-file')

export async function fetchFile(
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
