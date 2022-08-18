import debugBase from 'debug'
import type {Debugger} from 'debug'

const NAME = 'codeowners-scan'

const debug = debugBase(NAME)

export type {Debugger}
export function enableDebugging(): void {
  const debugEnv = process.env['DEBUG']
  if (debugEnv !== '') {
    core.info(`appending DEBUG env`)
    process.env['DEBUG'] = `${debugEnv},${NAME}:*`
  } else {
    core.info(`setting DEBUG env`)
    process.env['DEBUG'] = `${NAME}:*`
    core.info(`debug env: ${process.env['DEBUG']}`)
  }
}
export default debug
