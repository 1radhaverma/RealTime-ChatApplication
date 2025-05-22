using Microsoft.AspNetCore.Identity;

namespace API.Models
{
    public class AppUser:IdentityUser
    {
        public string? Fullname { get; set; }
        public string? ProfileImage { get; set; }

    }
}
