import { useState } from 'react'

interface ShareButtonProps {
  getShareUrl: () => string | null
}

/** Copies the current shareable URL to the clipboard, with a brief confirmation. */
export function ShareButton({ getShareUrl }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleClick() {
    const url = getShareUrl()
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
    >
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  )
}
