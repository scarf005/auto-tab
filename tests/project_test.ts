import { assert, assertEquals } from "jsr:@std/assert@^1.0.14"

Deno.test("repo has no vendor directory", async () => {
  let exists = true
  try {
    await Deno.stat(new URL("../vendor", import.meta.url))
  } catch {
    exists = false
  }
  assertEquals(exists, false)
})

Deno.test("manifest is MV2", async () => {
  const manifest = JSON.parse(await Deno.readTextFile(new URL("../manifest.json", import.meta.url)))
  assert(manifest.manifest_version === 2)
  assert(manifest.permissions.includes("tabs"))
})
