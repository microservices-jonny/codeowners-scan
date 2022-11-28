import * as github from '@actions/github'

export type MyOctokit = ReturnType<typeof github.getOctokit>

export type ScanResult = {
  addedOnlyFiles: string[]
  unownedFiles: string[]
  patterns: string[]
  codeownersFiles: string[]
}
