import { copy, emptyDir } from "@std/fs"
import { join } from "@std/path"

const root = new URL("..", import.meta.url).pathname
const dist = join(root, "dist")
await emptyDir(dist)

const status = await new Deno.Command(Deno.execPath(), {
  cwd: root,
  args: ["bundle", "--platform=browser", "-o", "dist/app.js", "src/app.ts"],
  stdout: "inherit",
  stderr: "inherit",
}).spawn().status
if (!status.success) Deno.exit(status.code)

for (const file of ["console.html", "styles.css", "background.js", "icon.svg"]) {
  await copy(join(root, "static", file), join(dist, file), { overwrite: true })
}
await copy(join(root, "manifest.json"), join(dist, "manifest.json"), { overwrite: true })
console.log("Built dist/")
