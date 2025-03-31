using System.Security.Claims;

namespace API.Extensions
{
    public static class ClaimsPrincipleExtensions
    {
        public static string GetUserNmae(this ClaimsPrincipal user)
        {
            return user.FindFirstValue(ClaimTypes.Name) ?? 
                throw new Exception("Cannot get username");
        }
        public static Guid GetUserId(this ClaimsPrincipal user)
        {
            return Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier) ??
                throw new Exception("Cannot get userid"));
        }
    }
}
