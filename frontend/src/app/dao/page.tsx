'use client'

import { Navigation, WalletConnection } from '@/components'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Vote, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Gavel,
  Plus,
  ExternalLink,
  AlertCircle,
  Wallet
} from 'lucide-react'
import { useState } from 'react'
import { useProposals, useDAOMembership, useProposalActions, useDAOEvents } from '@/hooks/use-ethereum-dao'

export default function DAOPage() {
  const [newProposal, setNewProposal] = useState({
    description: '',
    newUri: 'https://example.com/metadata.json',
    newName: 'Omnichain Collection',
    newSymbol: 'OCC'
  })

  // Hooks for real data
  const { proposals: realProposals, loading: proposalsLoading, error: proposalsError, refetch } = useProposals()
  const { isMember, loading: membershipLoading } = useDAOMembership()
  const { events } = useDAOEvents()
  const { 
    createUpdateMetadataProposal,
    vote,
    executeProposal,
    loading: actionLoading,
    error: actionError
  } = useProposalActions()

  const handleCreateProposal = async () => {
    if (!newProposal.description.trim()) {
      alert('Please enter a description')
      return
    }

    try {
      const txHash = await createUpdateMetadataProposal(
        newProposal.description,
        newProposal.newUri,
        newProposal.newName,
        newProposal.newSymbol
      )
      console.log('Proposal created:', txHash)
      setNewProposal({ 
        description: '', 
        newUri: 'https://example.com/metadata.json',
        newName: 'Omnichain Collection',
        newSymbol: 'OCC'
      })
      refetch() // Refresh proposals
    } catch (error) {
      console.error('Failed to create proposal:', error)
    }
  }

  const handleVote = async (proposalId: number, support: boolean) => {
    try {
      const txHash = await vote(proposalId, support)
      console.log('Vote cast:', txHash)
      refetch() // Refresh proposals
    } catch (error) {
      console.error('Failed to vote:', error)
    }
  }

  const handleExecute = async (proposalId: number) => {
    try {
      const txHash = await executeProposal(proposalId)
      console.log('Proposal executed:', txHash)
      refetch() // Refresh proposals
    } catch (error) {
      console.error('Failed to execute proposal:', error)
    }
  }

  const getProposalStatus = (proposal: { executed: boolean; deadline: number }) => {
    if (proposal.executed) return 'executed'
    if (Date.now() > proposal.deadline * 1000) return 'expired'
    return 'active'
  }

  const getProposalTypeLabel = (proposalType: number) => {
    switch (proposalType) {
      case 0: return 'Metadata Update'
      case 1: return 'Emergency Action'
      case 2: return 'Member Management'
      default: return 'Unknown'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'executed': return 'bg-green-100 text-green-800 border-green-200'
      case 'expired': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="h-3 w-3" />
      case 'executed': return <CheckCircle className="h-3 w-3" />
      case 'expired': return <XCircle className="h-3 w-3" />
      default: return <AlertCircle className="h-3 w-3" />
    }
  }

  // Use real data if available, otherwise fall back to mock data
  const proposals = realProposals.length > 0 ? realProposals : [
    {
      id: 1,
      description: "Transform all 1M+ cNFTs to golden theme for holiday event",
      votesFor: 127,
      votesAgainst: 23,
      deadline: Math.floor(Date.now() / 1000) + 172800, // 2 days from now
      executed: false,
      proposalType: 0,
      data: ""
    },
    {
      id: 2,
      description: "Add new DAO member for enhanced governance",
      votesFor: 89,
      votesAgainst: 5,
      deadline: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      executed: true,
      proposalType: 2,
      data: ""
    }
  ]

  if (membershipLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading DAO data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold omnichain-text-gradient mb-4">
            DAO Governance
          </h1>
          <p className="text-xl text-muted-foreground">
            Control 1M+ cNFTs across chains through decentralized governance
          </p>
        </div>

        {/* Wallet Connection */}
        <WalletConnection className="mb-8" />

        {/* Membership Status */}
        <Card className="mb-8 glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Membership Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {isMember ? (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  DAO Member
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800 border-red-200">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not a Member
                </Badge>
              )}
              <span className="text-muted-foreground">
                {isMember ? 'You can create and vote on proposals' : 'Connect wallet to check membership'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {(proposalsError || actionError) && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span>{proposalsError || actionError}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="proposals" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="proposals">
                  <Vote className="h-4 w-4 mr-2" />
                  Proposals
                </TabsTrigger>
                <TabsTrigger value="create" disabled={!isMember}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Proposal
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="proposals" className="space-y-6">
                {proposalsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading proposals...</p>
                  </div>
                ) : proposals.length === 0 ? (
                  <Card className="glass-card">
                    <CardContent className="text-center py-8">
                      <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Proposals Yet</h3>
                      <p className="text-muted-foreground">
                        Be the first to create a proposal for cross-chain governance
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  proposals.map((proposal) => {
                    const status = getProposalStatus(proposal)
                    const totalVotes = proposal.votesFor + proposal.votesAgainst
                    const supportPercentage = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0
                    
                    return (
                      <Card key={proposal.id} className="glass-card card-hover">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">
                                Proposal #{proposal.id}
                              </CardTitle>
                              <CardDescription className="mt-2">
                                {proposal.description}
                              </CardDescription>
                            </div>
                            <Badge className={getStatusColor(status)}>
                              {getStatusIcon(status)}
                              <span className="ml-1 capitalize">{status}</span>
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {/* Proposal Details */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                Type: <span className="font-medium">{getProposalTypeLabel(proposal.proposalType)}</span>
                              </div>
                              <div>
                                Deadline: <span className="font-medium">
                                  {new Date(proposal.deadline * 1000).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            {/* Voting Results */}
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium">Voting Results</span>
                                <span className="text-sm text-muted-foreground">
                                  {supportPercentage.toFixed(1)}% support
                                </span>
                              </div>
                              <Progress value={supportPercentage} className="h-2 mb-2" />
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-green-600">For:</span>
                                  <span className="font-semibold">{proposal.votesFor}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-red-600">Against:</span>
                                  <span className="font-semibold">{proposal.votesAgainst}</span>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            {status === 'active' && isMember && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleVote(proposal.id, true)}
                                  disabled={actionLoading}
                                  className="flex-1"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Vote For
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleVote(proposal.id, false)}
                                  disabled={actionLoading}
                                  className="flex-1"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Vote Against
                                </Button>
                              </div>
                            )}

                            {status === 'active' && proposal.votesFor > proposal.votesAgainst && (
                              <Button
                                onClick={() => handleExecute(proposal.id)}
                                disabled={actionLoading}
                                className="w-full"
                              >
                                <Gavel className="h-4 w-4 mr-2" />
                                Execute Proposal
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </TabsContent>
              
              <TabsContent value="create" className="space-y-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Create New Proposal</CardTitle>
                    <CardDescription>
                      Propose changes to the omnichain collection that will be executed cross-chain
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="description">Proposal Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe what this proposal will do and why it's needed..."
                        value={newProposal.description}
                        onChange={(e) => setNewProposal(prev => ({ ...prev, description: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Collection Name</Label>
                        <Input
                          id="name"
                          value={newProposal.newName}
                          onChange={(e) => setNewProposal(prev => ({ ...prev, newName: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="symbol">Collection Symbol</Label>
                        <Input
                          id="symbol"
                          value={newProposal.newSymbol}
                          onChange={(e) => setNewProposal(prev => ({ ...prev, newSymbol: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="uri">Metadata URI</Label>
                      <Input
                        id="uri"
                        value={newProposal.newUri}
                        onChange={(e) => setNewProposal(prev => ({ ...prev, newUri: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    
                    <Button 
                      onClick={handleCreateProposal}
                      disabled={actionLoading || !newProposal.description.trim()}
                      className="w-full"
                    >
                      {actionLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Create Proposal
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Events */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Recent Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent events</p>
                ) : (
                  events.slice(0, 5).map((event, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                      <div className="text-sm">
                        <p className="font-medium">{event.type}</p>
                        <p className="text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Wallet className="h-4 w-4 mr-2" />
                  Connect Wallet
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Explorer
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Vote className="h-4 w-4 mr-2" />
                  Check Voting Power
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
