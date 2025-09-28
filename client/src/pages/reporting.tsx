import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, MoreHorizontal, ChevronLeft, ChevronRight, Eye } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddTicketModal from "@/components/add-ticket-modal";
import { IssueReporting, IssueReportingDetail } from "@/types/schema";
import { PaginationRequest, PaginationResponse, createPaginationRequest, buildPaginationQuery, DEFAULT_PAGINATION_CONFIG } from "@/types/pagination";
import { apiRepository } from "@/lib/apiRepository";

export default function Reporting() {
  const [isAddTicketModalOpen, setIsAddTicketModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGINATION_CONFIG.defaultPageSize);
  const [sortBy, setSortBy] = useState<string>("Title");
  const [isAscending, setIsAscending] = useState(true);
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Create pagination request
  const paginationRequest: PaginationRequest = createPaginationRequest(
    currentPage,
    pageSize,
    sortBy,
    isAscending,
    searchTerm
  );

  // Query for Issues Reporting data using ApiRepository pattern
  const { data: issuesResponse, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/IssuesReporting", currentPage, pageSize, sortBy, isAscending, searchTerm],
    queryFn: async (): Promise<PaginationResponse<IssueReporting>> => {
      const queryString = buildPaginationQuery(paginationRequest);
      
      // Use direct fetch with proper ApiRepository config for query string support
      const token = apiRepository.getAccessToken();
      const baseUrl = apiRepository.getConfig().baseUrl;
      const endpoint = `/api/IssuesReporting/GetIssuesReporting?${queryString}`;
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'accept': '*/*',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch issues: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data || { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 0, hasPrevious: false, hasNext: false };
    },
  });

  // Query for individual issue details
  const { data: issueDetails, isLoading: isLoadingDetails, error: detailsError, refetch: refetchDetails } = useQuery({
    queryKey: ["/api/IssuesReporting", selectedIssueId],
    queryFn: async (): Promise<IssueReportingDetail> => {
      if (!selectedIssueId) throw new Error("No issue selected");
      
      const response = await apiRepository.call<IssueReportingDetail>(
        'getIssueReportingById',
        'GET',
        undefined,
        {},
        true,
        { id: selectedIssueId }
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data!;
    },
    enabled: !!selectedIssueId,
  });
  
  const issues = issuesResponse?.items || [];
  const totalPages = issuesResponse?.totalPages || 0;
  const totalCount = issuesResponse?.totalCount || 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };
  
  const getCategoryName = (category: number) => {
    const categories = { 1: "Bug Report", 2: "Feature Request", 3: "Support" };
    return categories[category as keyof typeof categories] || "Unknown";
  };
  
  const getSeverityName = (severity: number) => {
    const severities = { 1: "Low", 2: "Medium", 3: "High", 4: "Critical" };
    return severities[severity as keyof typeof severities] || "Unknown";
  };

  const getStatusBadge = (status: number) => {
    const statusMap = {
      1: { name: "Open", color: "bg-orange-100 text-orange-800" },
      2: { name: "In Progress", color: "bg-blue-100 text-blue-800" },
      3: { name: "Resolved", color: "bg-green-100 text-green-800" },
      4: { name: "Closed", color: "bg-gray-100 text-gray-800" },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { name: "Unknown", color: "bg-gray-100 text-gray-800" };
    
    return (
      <Badge className={statusInfo.color} data-testid={`status-${status}`}>
        {statusInfo.name}
      </Badge>
    );
  };
  
  const handleViewIssue = (issue: IssueReporting) => {
    setSelectedIssueId(issue.id);
    setIsDetailsModalOpen(true);
  };
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
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
              onChange={(e) => handleSearch(e.target.value)}
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
                {issues.map((issue: IssueReporting) => (
                  <TableRow key={issue.id}>
                    <TableCell className="text-left" data-testid={`issue-id-${issue.id}`}>
                      #{issue.id}
                    </TableCell>
                    <TableCell className="text-left" data-testid={`issue-date-${issue.id}`}>
                      {formatDate(issue.createdOn)}
                    </TableCell>
                    <TableCell className="text-left" data-testid={`issue-subject-${issue.id}`}>
                      <div>
                        <div className="font-medium">{issue.title}</div>
                        <div className="text-sm text-gray-500">{getCategoryName(issue.category)}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-left">
                      {getStatusBadge(issue.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewIssue(issue)}
                          data-testid={`button-view-${issue.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-actions-${issue.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewIssue(issue)} data-testid={`button-view-details-${issue.id}`}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem data-testid={`button-edit-${issue.id}`}>Edit</DropdownMenuItem>
                            <DropdownMenuItem data-testid={`button-close-${issue.id}`}>Close Issue</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {issues.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <p className="text-gray-500" data-testid="no-issues-message">No issues found.</p>
            </div>
          )}
          
          {error && (
            <div className="text-center py-8">
              <div className="space-y-4">
                <p className="text-red-500" data-testid="error-message">
                  Error loading issues: {error.message}
                </p>
                <Button 
                  onClick={() => refetch()}
                  variant="outline"
                  data-testid="button-retry"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-600" data-testid="pagination-info">
          Showing {issues.length} of {totalCount} results
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!issuesResponse?.hasPrevious}
            data-testid="button-prev"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {/* Page numbers */}
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const pageNum = Math.max(1, currentPage - 2) + i;
            if (pageNum > totalPages) return null;
            
            return (
              <Button
                key={pageNum}
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(pageNum)}
                className={currentPage === pageNum ? "bg-blue-500 text-white" : "text-gray-600"}
                data-testid={`button-page-${pageNum}`}
              >
                {pageNum}
              </Button>
            );
          })}
          
          {totalPages > 5 && currentPage < totalPages - 2 && (
            <>
              <span className="text-gray-400">...</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                className="text-gray-600"
                data-testid={`button-page-${totalPages}`}
              >
                {totalPages}
              </Button>
            </>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!issuesResponse?.hasNext}
            data-testid="button-next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* View Issue Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Issue Details</DialogTitle>
          </DialogHeader>
          
          {isLoadingDetails && (
            <div className="space-y-4" data-testid="issue-details-loading">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-200 h-4 rounded"></div>
              ))}
            </div>
          )}
          
          {!isLoadingDetails && issueDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Issue ID</label>
                  <p className="text-sm font-mono">#{issueDetails.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(issueDetails.status)}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Title</label>
                <p className="font-medium">{issueDetails.title}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-sm">{issueDetails.description}</p>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Category</label>
                  <p className="text-sm">{getCategoryName(issueDetails.category)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Severity</label>
                  <p className="text-sm">{getSeverityName(issueDetails.severity)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Reporter</label>
                  <p className="text-sm">{issueDetails.userName}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Created Date</label>
                  <p className="text-sm">{formatDate(issueDetails.createdDate)}</p>
                </div>
                {issueDetails.resolutionDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Resolution Date</label>
                    <p className="text-sm">{formatDate(issueDetails.resolutionDate)}</p>
                  </div>
                )}
              </div>
              
              {issueDetails.attachmentUrl && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Attachment</label>
                  <div className="mt-2">
                    {issueDetails.attachmentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img
                        src={`${apiRepository.getConfig().baseUrl}/${issueDetails.attachmentUrl}`}
                        alt="Issue attachment"
                        className="max-w-full h-auto rounded-lg border"
                        data-testid="issue-attachment-image"
                      />
                    ) : issueDetails.attachmentUrl.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                      <video
                        controls
                        className="max-w-full h-auto rounded-lg border"
                        data-testid="issue-attachment-video"
                      >
                        <source src={`${apiRepository.getConfig().baseUrl}/${issueDetails.attachmentUrl}`} />
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <a
                        href={`${apiRepository.getConfig().baseUrl}/${issueDetails.attachmentUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                        data-testid="issue-attachment-link"
                      >
                        View Attachment
                      </a>
                    )}
                  </div>
                </div>
              )}
              
              {issueDetails.comments && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Comments</label>
                  <p className="text-sm bg-gray-50 p-3 rounded">{issueDetails.comments}</p>
                </div>
              )}
            </div>
          )}
          
          {!isLoadingDetails && !issueDetails && !detailsError && (
            <div className="text-center py-8" data-testid="no-issue-details">
              <p className="text-gray-500">No issue details available.</p>
            </div>
          )}
          
          {detailsError && (
            <div className="text-center py-8">
              <div className="space-y-4">
                <p className="text-red-500" data-testid="details-error-message">
                  Error loading issue details: {detailsError.message}
                </p>
                <Button 
                  onClick={() => refetchDetails()}
                  variant="outline"
                  data-testid="button-retry-details"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Ticket Modal */}
      <AddTicketModal
        isOpen={isAddTicketModalOpen}
        onClose={() => setIsAddTicketModalOpen(false)}
        restaurantId="rest-1"
      />
    </div>
  );
}
