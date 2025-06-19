using System.Security.Claims;

namespace API.Extensions
{
    /// <summary>
    /// Extension methods for working with ClaimsPrincipal
    /// </summary>
    public static class ClaimsPrincipleExtensions
    {
        #region public methods
        /// <summary>
        /// Gets the username from the claims principal
        /// </summary>
        /// <param name="user">The current ClaimsPrincipal</param>
        /// <returns>Username as string</returns>
        /// <exception cref="InvalidOperationException">
        /// Thrown when username claim is not found
        /// </exception>
        /// <example>
        /// var username = User.GetUserName();
        /// </example>
        public static string GetUserNmae(this ClaimsPrincipal user)
        {
            return user.FindFirstValue(ClaimTypes.Name) ??
                throw new Exception("Cannot get username");
        }
        /// <summary>
        /// Gets the user ID from the claims principal as a Guid
        /// </summary>
        /// <param name="user">The current ClaimsPrincipal</param>
        /// <returns>User ID as Guid</returns>
        /// <exception cref="InvalidOperationException">
        /// Thrown when NameIdentifier claim is not found or invalid
        /// </exception>
        /// <example>
        /// var userId = User.GetUserId();
        /// </example>
        public static Guid GetUserId(this ClaimsPrincipal user)
        {
            return Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier) ??
                throw new Exception("Cannot get userid"));
        }
        #endregion
    }
}
