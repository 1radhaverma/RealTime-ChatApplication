using System.Security.Claims;

namespace API.Services.Interfaces
{
    /// <summary>
    /// Interface for token generation and validation services
    /// </summary>
    public interface ITokenService
    {
        /// <summary>
        /// Generates a JWT token for authenticated users
        /// </summary>
        /// <param name="userId">Unique identifier of the user</param>
        /// <param name="userName">Username or display name of the user</param>
        /// <returns>Generated JWT token as string</returns>
        string GenerateToken(string userId, string userName);
    }
}