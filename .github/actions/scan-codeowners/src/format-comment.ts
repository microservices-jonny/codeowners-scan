import * as handlebars from 'handlebars'
import * as fs from 'fs'
import * as path from 'path'
import {UUID} from './create-or-update-comment'

const templateFile = fs.readFileSync(
  path.join(__dirname, 'templates', 'summary.hbs'),
  {encoding: 'utf8'}
)
const bodyTemplate = handlebars.compile(templateFile)

const footerTemplateFile = fs.readFileSync(
  path.join(__dirname, 'templates', 'summary-footer.hbs'),
  {encoding: 'utf8'}
)
const footerTemplate = handlebars.compile(footerTemplateFile)

type Summary = {
  unownedFiles: string[]
}

type RenderContext = {
  sha: string
  unownedFiles: string[]
  uuid: string
}

export function toMarkdown(summary: Summary, {sha}: {sha: string}): string {
  const context: RenderContext = {
    sha,
    uuid: UUID,
    unownedFiles: summary.unownedFiles
  }

  const body = bodyTemplate(context)
  const footer = footerTemplate(context)

  return `${body}\n\n${footer}`
}
