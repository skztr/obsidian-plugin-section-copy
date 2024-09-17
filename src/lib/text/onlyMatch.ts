/**
 * onlyMatch returns only those parts of the input text which match the search pattern, removing everything else.
 */
export function onlyMatch(
  text: string,
  search: string | RegExp = "\n",
): string {
  if (typeof search === "string") {
    return [...Array(text.split(search).length - 1)].map(() => search).join("");
  }
  if (!search.flags.includes("g")) {
    search = new RegExp(search.source, search.flags + "g");
  }
  return [...text.matchAll(search)].map((match) => match[0]).join("");
}
