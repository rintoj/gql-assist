import { renderStatus } from './text-formatter'

export async function withStatus<T>(text: string, callback: () => Promise<T>, idBefore?: string) {
  renderStatus(text, 'IN PROGRESS', 'yellow', false)
  try {
    const hasChange = await callback()
    if (!hasChange) {
      renderStatus(text, 'NO CHANGE', 'gray', false)
      return false
    }
    renderStatus(text, 'MODIFIED', 'green', true)
    return true
  } catch (e) {
    process.exitCode = 1
    renderStatus(`${text} (${e.message})`, 'FAILED', 'red', true)
  }
}
