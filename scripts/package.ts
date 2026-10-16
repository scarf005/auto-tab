import { zipSync } from "fflate"
import { walk } from "@std/fs"
import { relative } from "@std/path"

const root = new URL("..", import.meta.url).pathname
const dist = `${root}/dist`
const files: Record<string, Uint8Array> = {}
for await (const entry of walk(dist, { includeDirs: false })) {
  files[relative(dist, entry.path).replaceAll("\\", "/")] = await Deno.readFile(entry.path)
}
const bytes = zipSync(files, { level: 9 })
await Deno.writeFile(`${root}/tab-console-firefox-mv2-0.2.0.xpi`, bytes)
console.log("Created tab-console-firefox-mv2-0.2.0.xpi")
