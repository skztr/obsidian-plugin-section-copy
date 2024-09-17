/**
 * invisibles is a utility for debugging strings, converting "invisible" characters into visible equivalents
 *
 * - newlines => ␤
 * - carriage returns => ␍
 * - tabs => ␉
 * - spaces => ␣
 */
export function invisibles(text: string): string {
  return text
    .replace(/\n/gmu, "␤")
    .replace(/\r/gmu, "␍")
    .replace(/\t/gmu, "␉")
    .replace(/ /gmu, "␣");
}
