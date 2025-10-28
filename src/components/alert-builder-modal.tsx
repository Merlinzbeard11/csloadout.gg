"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"

interface AlertBuilderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AlertBuilderModal({ open, onOpenChange }: AlertBuilderModalProps) {
  const [triggerType, setTriggerType] = useState("price_below")
  const [triggerValue, setTriggerValue] = useState("")
  const [market, setMarket] = useState("Steam")
  const [channels, setChannels] = useState<string[]>(["email"])
  const { toast } = useToast()

  const handleSubmit = async () => {
    await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: "ak-47-case-hardened",
        item_name: "AK-47 | Case Hardened",
        trigger_type: triggerType,
        trigger_value: triggerValue,
        market,
        channels,
        enabled: true,
      }),
    })

    toast({
      title: "Alert Created",
      description: "You'll be notified when your criteria are met.",
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Price Alert</DialogTitle>
          <DialogDescription>
            Set up custom alerts for price changes, float values, and rare patterns.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Trigger Type */}
          <div className="space-y-2">
            <Label>Trigger Type</Label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price_below">Price below X</SelectItem>
                <SelectItem value="price_drop">Price drop &gt; N% in 24h</SelectItem>
                <SelectItem value="float_below">Float ≤ value</SelectItem>
                <SelectItem value="pattern_seed">Pattern seed in set</SelectItem>
                <SelectItem value="rare_pattern">Rare pattern flag</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Trigger Value */}
          <div className="space-y-2">
            <Label>Trigger Value</Label>
            <Input
              type="text"
              placeholder={triggerType === "price_below" ? "400" : "0.02"}
              value={triggerValue}
              onChange={(e) => setTriggerValue(e.target.value)}
            />
          </div>

          {/* Market (conditional) */}
          {(triggerType === "price_below" || triggerType === "price_drop") && (
            <div className="space-y-2">
              <Label>Market</Label>
              <Select value={market} onValueChange={setMarket}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Steam">Steam</SelectItem>
                  <SelectItem value="Buff">Buff</SelectItem>
                  <SelectItem value="DMarket">DMarket</SelectItem>
                  <SelectItem value="Skinport">Skinport</SelectItem>
                  <SelectItem value="CSFloat">CSFloat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notification Channels */}
          <div className="space-y-3">
            <Label>Notification Channels</Label>
            <div className="space-y-2">
              {[
                { id: "email", label: "Email" },
                { id: "web_push", label: "Web Push" },
                { id: "discord", label: "Discord Webhook" },
              ].map((channel) => (
                <div key={channel.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={channel.id}
                    checked={channels.includes(channel.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setChannels([...channels, channel.id])
                      } else {
                        setChannels(channels.filter((c) => c !== channel.id))
                      }
                    }}
                  />
                  <label
                    htmlFor={channel.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {channel.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Alert</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
