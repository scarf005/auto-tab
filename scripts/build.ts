import { copy, emptyDir } from "@std/fs"
import { fromFileUrl, join } from "@std/path"

const root = fromFileUrl(new URL("..", import.meta.url))
const dist = join(root, "dist")
await emptyDir(dist)

const status = await new Deno.Command(Deno.execPath(), {
  cwd: root,
  args: ["bundle", "--platform=browser", "-o", "dist/app.js", "src/main.ts"],
  stdout: "inherit",
  stderr: "inherit",
}).spawn().status
if (!status.success) Deno.exit(status.code)

for (const file of ["console.html", "styles.css", "background.js", "icon.svg"]) {
  await copy(join(root, "static", file), join(dist, file), { overwrite: true })
}
await copy(join(root, "manifest.json"), join(dist, "manifest.json"), { overwrite: true })

// CodeMirror's structural stylesheet, from the npm package the bundle used.
const { imports } = JSON.parse(
  (await Deno.readTextFile(join(root, "deno.jsonc"))).replace(/^\s*\/\/.*$/gm, ""),
)
const codemirrorVersion = String(imports.codemirror).replace(/^npm:codemirror@/, "")
const info = await new Deno.Command(Deno.execPath(), { args: ["info", "--json"] }).output()
const { npmCache } = JSON.parse(new TextDecoder().decode(info.stdout))
await copy(
  join(npmCache, "registry.npmjs.org", "codemirror", codemirrorVersion, "lib", "codemirror.css"),
  join(dist, "codemirror.css"),
  { overwrite: true },
)
console.log("Built dist/")
