namespace API.Common
{
    /// <summary>
    /// Generic API response wrapper for consistent API responses
    /// </summary>
    /// <typeparam name="T">Type of the data payload</typeparam>
    public class Response<T>
    {
        #region properties

        /// <summary>
        /// Indicates whether the request was successful
        /// </summary>
        /// <example>true</example>
        public bool IsSuccess { get; set; }

        /// <summary>
        /// The response data payload
        /// </summary>
        public T Data { get; }

        /// <summary>
        /// Error message when request fails (null when successful)
        /// </summary>
        /// <example>Invalid credentials</example>
        public string? Error { get; }

        /// <summary>
        /// Additional message about the response
        /// </summary>
        /// <example>User created successfully</example>
        public string? Message { get; set; }
        #endregion

        #region ctor

        /// <summary>
        /// Creates a new API response
        /// </summary>
        /// <param name="isSuccess">Request success status</param>
        /// <param name="data">Response data payload</param>
        /// <param name="error">Error message if unsuccessful</param>
        /// <param name="message">Additional information message</param>
        public Response(bool isSuccess, T data, string? error, string? message)
        {
            IsSuccess = isSuccess;
            Data = data;
            Error = error;
            Message = message;

        }
        #endregion

        #region public methods

        /// <summary>
        /// Creates a successful response with data
        /// </summary>
        /// <param name="data">The response data</param>
        /// <param name="message">Optional success message</param>
        /// <returns>Successful response instance</returns>
        /// <example>
        /// return Response<string>.Success("Data", "Operation succeeded");
        /// </example>
        public static Response<T> Success(T data, string? message = "") => new
          (true, data, null, message);

        /// <summary>
        /// Creates a failed response with error message
        /// </summary>
        /// <param name="error">Descriptive error message</param>
        /// <returns>Failed response instance</returns>
        /// <example>
        /// return Response<string>.Failure("Invalid parameters");
        /// </example>
        public static Response<T> Failure(string error) => new
          (false, default, error, null);
        #endregion
    }
}