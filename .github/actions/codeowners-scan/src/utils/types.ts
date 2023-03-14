import * as github from '@actions/github'

export type MyOctokit = ReturnType<typeof github.getOctokit>

export type ScanResult = {
  addedOnlyFiles: string[]
  unownedFiles: string[],
  userOwnedFiles: string[],
  patterns: [string, string][],
  fileOnlyPatterns: string[],
  codeownersFiles: string[],
  introducesNewModuleIndicatorFile: boolean
}
