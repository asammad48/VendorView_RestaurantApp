import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Star, ChevronLeft, ChevronRight, Calendar, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import type { Feedback } from "@/types/schema";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

function FeedbackCard({ feedback }: { feedback: Feedback }) {
  return (
    <div className="flex gap-4 p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex-shrink-0">
        <img
          src={feedback.customerImage || "https://images.unsplash.com/photo-1494790108755-2616b9f8e5a6?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150"}
          alt={feedback.customerName}
          className="w-12 h-12 rounded-full object-cover"
        />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              {feedback.customerName}
            </h3>
            <StarRating rating={feedback.rating} />
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              <span>{feedback.orderNumber}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{format(new Date(feedback.feedbackDate || feedback.createdAt), "MMM dd, yyyy HH:mm")}</span>
            </div>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
          {feedback.comment}
        </p>
      </div>
    </div>
  );
}

export default function Feedbacks() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const { data: feedbacks = [], isLoading, error } = useQuery<Feedback[]>({
    queryKey: ["/api/feedbacks"],
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
          Feedbacks
        </h1>
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-4 p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
          Feedbacks
        </h1>
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Failed to load feedbacks. Please try again.
          </p>
        </div>
      </div>
    );
  }

  // Pagination logic
  const totalPages = Math.ceil(feedbacks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFeedbacks = feedbacks.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToPrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
        Feedbacks
      </h1>
      
      {feedbacks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            No feedbacks available yet.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {currentFeedbacks.map((feedback) => (
              <FeedbackCard key={feedback.id} feedback={feedback} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Show result: {feedbacks.length}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPrevious}
                  disabled={currentPage === 1}
                  className="p-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                  const pageNumber = i + 1;
                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(pageNumber)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
                
                {totalPages > 5 && (
                  <>
                    <span className="text-gray-400">...</span>
                    <Button
                      variant={currentPage === totalPages ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(totalPages)}
                      className="w-8 h-8 p-0"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNext}
                  disabled={currentPage === totalPages}
                  className="p-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
