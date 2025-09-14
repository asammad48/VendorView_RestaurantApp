// Test utility to verify 422 error handling
export function test422ErrorHandling() {
  const sampleResponse = {
    "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
    "title": "One or more validation errors occurred.",
    "status": 422,
    "errors": {
      "Validation Error": ["Email already in use", "Password too weak", "Username is required"]
    },
    "traceId": "0HNERD60TIPLD:00000001"
  };
  
  // Simulate what the API repository does
  if (sampleResponse.status === 422 && sampleResponse.errors && sampleResponse.errors['Validation Error']) {
    const validationErrors = sampleResponse.errors['Validation Error'];
    if (Array.isArray(validationErrors)) {
      const errorMessage = validationErrors.join('. ');
      console.log('422 Error Message:', errorMessage);
      // Expected output: "Email already in use. Password too weak. Username is required"
      return errorMessage;
    }
  }
  
  return 'Validation failed. Please check your input.';
}

// Test the function
test422ErrorHandling();