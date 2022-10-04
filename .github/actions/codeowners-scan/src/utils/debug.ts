import debugBase from 'debug'
import type {Debugger} from 'debug'

const NAME = 'codeowners-scan'

const debug = debugBase(NAME)

export type {Debugger}
export function enableDebugging(): void {
  debugBase.enable(`${NAME}:*`)
}
export default debug
