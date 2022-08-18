import * as github from '@actions/github'

export type MyOctokit = ReturnType<typeof github.getOctokit>
