"use client"

import { useState, useEffect } from "react"
import { NavHeader } from "@/components/nav-header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, Edit } from "lucide-react"
import type { Alert } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { AlertBuilderModal } from "@/components/alert-builder-modal"

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchAlerts = async () => {
      const response = await fetch("/api/alerts")
      const data = await response.json()
      setAlerts(data)
      setLoading(false)
    }
    fetchAlerts()
  }, [])

  const handleToggle = async (id: string, enabled: boolean) => {
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled }),
    })
    setAlerts(alerts.map((alert) => (alert.id === id ? { ...alert, enabled } : alert)))
    toast({
      title: enabled ? "Alert Enabled" : "Alert Disabled",
      description: enabled ? "You'll receive notifications for this alert." : "Notifications have been disabled.",
    })
  }

  const handleDelete = async (id: string, name: string) => {
    await fetch(`/api/alerts?id=${id}`, { method: "DELETE" })
    setAlerts(alerts.filter((alert) => alert.id !== id))
    toast({
      title: "Alert Deleted",
      description: `Alert for ${name} has been deleted.`,
    })
  }

  const getTriggerLabel = (alert: Alert) => {
    switch (alert.trigger_type) {
      case "price_below":
        return `Price below $${alert.trigger_value} on ${alert.market}`
      case "price_drop":
        return `Price drops >${alert.trigger_value}% in 24h`
      case "float_below":
        return `Float ≤ ${alert.trigger_value}`
      case "pattern_seed":
        return `Pattern seed in set: ${alert.trigger_value}`
      case "rare_pattern":
        return "Rare pattern flag appeared"
      default:
        return alert.trigger_value
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1">
        <div className="container px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Price Alerts</h1>
              <p className="text-muted-foreground">Get notified when items meet your criteria</p>
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Alert
            </Button>
          </div>

          {alerts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <p className="text-xl font-semibold mb-2">No alerts configured</p>
                <p className="text-muted-foreground mb-6">
                  Create alerts to get notified of price changes and rare finds
                </p>
                <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Alert
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-96">Item</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Channels</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className="font-semibold">{alert.item_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTriggerLabel(alert)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {alert.channels.map((channel) => (
                              <Badge key={channel} variant="secondary" className="text-xs">
                                {channel}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(alert.created_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={alert.enabled}
                            onCheckedChange={(checked) => handleToggle(alert.id, checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(alert.id, alert.item_name)}>
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
      <AlertBuilderModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  )
}
