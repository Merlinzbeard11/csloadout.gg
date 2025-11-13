"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, Check } from "lucide-react"

interface ShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loadoutSlug: string
}

export function ShareModal({ open, onOpenChange, loadoutSlug }: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const shareUrl = `https://csloadout.gg/loadouts/${loadoutSlug}`

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareToTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=Check out my CS2 loadout!&url=${encodeURIComponent(shareUrl)}`,
      "_blank",
    )
  }

  const shareToReddit = () => {
    window.open(
      `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=Check out my CS2 loadout!`,
      "_blank",
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-cs2-dark border-cs2-blue/20 text-cs2-light sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Share Loadout</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Input readOnly value={shareUrl} className="bg-cs2-darker border-cs2-blue/20 text-cs2-light" />
            <Button onClick={copyToClipboard} className="bg-cs2-blue hover:bg-cs2-blue/80 shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={shareToTwitter} className="flex-1 bg-[#1DA1F2] hover:bg-[#1DA1F2]/80">
              Twitter
            </Button>
            <Button onClick={shareToReddit} className="flex-1 bg-[#FF4500] hover:bg-[#FF4500]/80">
              Reddit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
