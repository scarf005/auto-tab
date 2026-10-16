import { zipSync } from "fflate"
import { walk } from "@std/fs"
import { fromFileUrl, join, relative } from "@std/path"

const root = fromFileUrl(new URL("..", import.meta.url))
const dist = join(root, "dist")
const { version } = JSON.parse(await Deno.readTextFile(join(dist, "manifest.json")))
const files: Record<string, Uint8Array> = {}
for await (const entry of walk(dist, { includeDirs: false })) {
  files[relative(dist, entry.path).replaceAll("\\", "/")] = await Deno.readFile(entry.path)
}
const name = `tab-console-firefox-mv2-${version}.xpi`
await Deno.writeFile(join(root, name), zipSync(files, { level: 9 }))
console.log(`Created ${name}`)
