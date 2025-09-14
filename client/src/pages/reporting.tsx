import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import AddTicketModal from "@/components/add-ticket-modal";
import { Ticket } from "@shared/schema";

export default function Reporting() {
  const [isAddTicketModalOpen, setIsAddTicketModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data for demonstration - replace with actual API call
  const mockTickets: Ticket[] = [
    {
      id: "12345",
      subject: "Bug Report",
      category: "Bug Report",
      description: "Found a bug in the system",
      image: null,
      status: "in_progress",
      restaurantId: "rest-1",
      createdAt: new Date("2025-04-24"),
    },
    {
      id: "12346",
      subject: "Bug Report",
      category: "Bug Report", 
      description: "Another bug found",
      image: null,
      status: "in_progress",
      restaurantId: "rest-1",
      createdAt: new Date("2025-04-24"),
    },
    {
      id: "12347",
      subject: "Bug Report",
      category: "Bug Report",
      description: "Yet another bug",
      image: null,
      status: "in_progress",
      restaurantId: "rest-1",
      createdAt: new Date("2025-04-24"),
    },
    {
      id: "12348",
      subject: "Bug Report",
      category: "Bug Report",
      description: "More bugs to fix",
      image: null,
      status: "in_progress",
      restaurantId: "rest-1",
      createdAt: new Date("2025-04-24"),
    },
    {
      id: "12349",
      subject: "Bug Report",
      category: "Bug Report",
      description: "Final bug report",
      image: null,
      status: "in_progress",
      restaurantId: "rest-1",
      createdAt: new Date("2025-04-24"),
    },
  ];

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["/api/tickets"],
    queryFn: async () => {
      // For now, return mock data. Replace with actual API call
      return mockTickets;
    },
  });

  const filteredTickets = tickets?.filter(ticket =>
    ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.category.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      in_progress: "bg-orange-100 text-orange-800",
      resolved: "bg-green-100 text-green-800",
      closed: "bg-gray-100 text-gray-800",
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors]} data-testid={`status-${status}`}>
        {status === "in_progress" ? "in progress" : status}
      </Badge>
    );
  };

  return (
    <div className="p-6" data-testid="reporting-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4 flex-1">
          <h1 className="text-2xl font-semibold" data-testid="page-title">Reporting</h1>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>
        <Button
          onClick={() => setIsAddTicketModalOpen(true)}
          className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          data-testid="button-add-ticket"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Ticket
        </Button>
      </div>

      {/* Tickets Table */}
      <Card>
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">Ticket ID</TableHead>
                  <TableHead className="text-left">Date & Time</TableHead>
                  <TableHead className="text-left">Subject</TableHead>
                  <TableHead className="text-left">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="text-left" data-testid={`ticket-id-${ticket.id}`}>
                      {ticket.id}
                    </TableCell>
                    <TableCell className="text-left" data-testid={`ticket-date-${ticket.id}`}>
                      {ticket.createdAt ? formatDate(ticket.createdAt) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-left" data-testid={`ticket-subject-${ticket.id}`}>
                      {ticket.subject}
                    </TableCell>
                    <TableCell className="text-left">
                      {getStatusBadge(ticket.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-actions-${ticket.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem data-testid={`button-view-${ticket.id}`}>View Details</DropdownMenuItem>
                          <DropdownMenuItem data-testid={`button-edit-${ticket.id}`}>Edit</DropdownMenuItem>
                          <DropdownMenuItem data-testid={`button-close-${ticket.id}`}>Close Ticket</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {filteredTickets.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <p className="text-gray-500" data-testid="no-tickets-message">No tickets found.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-600" data-testid="pagination-info">
          Show result: 6
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" disabled className="text-gray-400" data-testid="button-prev">
            &lt;
          </Button>
          <Button variant="ghost" size="sm" className="bg-blue-500 text-white" data-testid="button-page-1">
            1
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-600" data-testid="button-page-2">
            2
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-600" data-testid="button-page-3">
            3
          </Button>
          <span className="text-gray-400">...</span>
          <Button variant="ghost" size="sm" className="text-gray-600" data-testid="button-page-20">
            20
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-600" data-testid="button-next">
            &gt;
          </Button>
        </div>
      </div>

      {/* Add Ticket Modal */}
      <AddTicketModal
        isOpen={isAddTicketModalOpen}
        onClose={() => setIsAddTicketModalOpen(false)}
        restaurantId="rest-1"
      />
    </div>
  );
}
