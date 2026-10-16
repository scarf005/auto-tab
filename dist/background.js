/* global browser */

async function openConsole() {
  const url = browser.runtime.getURL("console.html")
  const allTabs = await browser.tabs.query({})
  const existing = allTabs.filter((tab) => tab.url === url)

  if (existing.length) {
    const tab = existing[0]
    await browser.windows.update(tab.windowId, { focused: true })
    await browser.tabs.update(tab.id, { active: true })
    return
  }

  await browser.tabs.create({ url, active: true })
}

browser.browserAction.onClicked.addListener(openConsole)
browser.commands.onCommand.addListener((command) => {
  if (command === "open-tab-console") openConsole()
})
