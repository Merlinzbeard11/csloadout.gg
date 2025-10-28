"use client"

import { NavHeader } from "@/components/nav-header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, X, ExternalLink } from "lucide-react"
import { useState } from "react"

interface PatternSubmission {
  id: string
  item_name: string
  pattern_seed: number
  submitted_by: string
  submitted_date: string
  screenshots: string[]
  notes: string
  status: "pending" | "approved" | "rejected"
}

export default function AdminPage() {
  const [submissions, setSubmissions] = useState<PatternSubmission[]>([
    {
      id: "1",
      item_name: "AK-47 | Case Hardened",
      pattern_seed: 661,
      submitted_by: "user123",
      submitted_date: "2025-10-07",
      screenshots: ["/ak-47-case-hardened-blue-gem.jpg"],
      notes: "Full blue top, tier-1 pattern",
      status: "pending",
    },
    {
      id: "2",
      item_name: "Karambit | Fade",
      pattern_seed: 412,
      submitted_by: "trader456",
      submitted_date: "2025-10-06",
      screenshots: ["/karambit-fade-knife.jpg"],
      notes: "100% fade, perfect corner",
      status: "pending",
    },
    {
      id: "3",
      item_name: "M4A4 | Howl",
      pattern_seed: 88,
      submitted_by: "collector789",
      submitted_date: "2025-10-05",
      screenshots: ["/m4a4-howl-contraband.jpg"],
      notes: "Low float 0.001, clean stock",
      status: "pending",
    },
  ])

  const handleApprove = (id: string) => {
    setSubmissions(submissions.map((sub) => (sub.id === id ? { ...sub, status: "approved" as const } : sub)))
  }

  const handleReject = (id: string) => {
    setSubmissions(submissions.map((sub) => (sub.id === id ? { ...sub, status: "rejected" as const } : sub)))
  }

  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1">
        <div className="container px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Moderate pattern submissions and manage content</p>
          </div>

          <Tabs defaultValue="submissions">
            <TabsList>
              <TabsTrigger value="submissions">Pattern Submissions ({submissions.length})</TabsTrigger>
              <TabsTrigger value="reports">Reports (0)</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="submissions" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pattern Submission Queue</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {submissions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <p className="text-xl font-semibold mb-2">No pending submissions</p>
                      <p className="text-muted-foreground">All pattern submissions have been reviewed</p>
                    </div>
                  ) : (
                    <div className="space-y-6 p-6">
                      {submissions.map((submission) => (
                        <Card key={submission.id} className="border-border/40">
                          <CardContent className="pt-6">
                            <div className="grid gap-6 md:grid-cols-[200px_1fr]">
                              {/* Screenshot */}
                              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                                <img
                                  src={submission.screenshots[0] || "/placeholder.svg"}
                                  alt={submission.item_name}
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              {/* Details */}
                              <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="text-lg font-semibold mb-1">{submission.item_name}</h3>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                      <span>Pattern #{submission.pattern_seed}</span>
                                      <span>•</span>
                                      <span>Submitted by {submission.submitted_by}</span>
                                      <span>•</span>
                                      <span>{new Date(submission.submitted_date).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                  <Badge
                                    variant={
                                      submission.status === "approved"
                                        ? "default"
                                        : submission.status === "rejected"
                                          ? "destructive"
                                          : "secondary"
                                    }
                                  >
                                    {submission.status}
                                  </Badge>
                                </div>

                                <div>
                                  <p className="text-sm font-semibold mb-1">Notes:</p>
                                  <p className="text-sm text-muted-foreground">{submission.notes}</p>
                                </div>

                                {submission.status === "pending" && (
                                  <div className="flex gap-2">
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="gap-2"
                                      onClick={() => handleApprove(submission.id)}
                                    >
                                      <Check className="h-4 w-4" />
                                      Approve
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="gap-2"
                                      onClick={() => handleReject(submission.id)}
                                    >
                                      <X className="h-4 w-4" />
                                      Reject
                                    </Button>
                                    <Button variant="outline" size="sm" className="gap-2 ml-auto bg-transparent">
                                      <ExternalLink className="h-4 w-4" />
                                      View Full Details
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="mt-6">
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <p className="text-xl font-semibold mb-2">No reports</p>
                  <p className="text-muted-foreground">All user reports have been resolved</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">12,458</p>
                    <p className="text-xs text-muted-foreground mt-1">+234 this week</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Active Alerts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">3,892</p>
                    <p className="text-xs text-muted-foreground mt-1">+156 this week</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">API Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">1.2M</p>
                    <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  )
}
