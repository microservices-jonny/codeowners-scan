import debugBase from 'debug'
import type {Debugger} from 'debug'

const NAME = 'codeowners-scan'

const debug = debugBase(NAME)

export type {Debugger}
export function enableDebugging(): void {
  const debugEnv = process.env['DEBUG']
  if (debugEnv) {
    process.env['DEBUG'] = `${debugEnv},${NAME}:*`
  } else {
    process.env['DEBUG'] = `${NAME}:*`
  }
}
export default debug
