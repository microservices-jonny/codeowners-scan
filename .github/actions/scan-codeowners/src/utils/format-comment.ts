import * as handlebars from 'handlebars'
import * as fs from 'fs'
import * as path from 'path'
import {
  MAX_CHAR_COUNT,
  PREFERRED_CODEOWNERS_FILE,
  TRUNCATE_OMISSION,
  UUID
} from './constants'
import {ScanResult} from './types'
import {truncate} from './truncate'

const bodyFile = fs.readFileSync(
  path.join(__dirname, 'templates', 'body.hbs'),
  {encoding: 'utf8'}
)
const bodyTemplate = handlebars.compile(bodyFile)

const footerTemplateFile = fs.readFileSync(
  path.join(__dirname, 'templates', 'footer.hbs'),
  {encoding: 'utf8'}
)
const footerTemplate = handlebars.compile(footerTemplateFile)

const HELPERS = {
  isPreferredCodeownersFile(file: string): boolean {
    return file === PREFERRED_CODEOWNERS_FILE
  }
}

type RenderContext = {
  sha: string
  unownedFiles: string[]
  codeownersFiles: string[]
  patterns: string[]
  uuid: string
  createdAt: string
  runDetails: RunDetails
  passed: boolean
}

type RunDetails = {id: number; url: string}

export function toMarkdown(
  scanResult: ScanResult,
  {sha, runDetails}: {sha: string; runDetails: RunDetails}
): string {
  const context: RenderContext = {
    sha,
    uuid: UUID,
    unownedFiles: scanResult.unownedFiles,
    codeownersFiles: scanResult.codeownersFiles,
    patterns: scanResult.patterns,
    createdAt: new Date(Date.now()).toISOString(),
    runDetails,
    passed: scanResult.unownedFiles.length === 0
  }

  const footer = footerTemplate(context)
  const bodyFooterSeparator = '\n\n'
  const body = truncate(bodyTemplate(context, {helpers: HELPERS}), {
    max: MAX_CHAR_COUNT - (bodyFooterSeparator.length + footer.length),
    omission: TRUNCATE_OMISSION
  })

  return [body, bodyFooterSeparator, footer].join('')
}
