using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace API.Models
{
    /// <summary>
    /// Extended application user model inheriting from IdentityUser
    /// </summary>
    public class AppUser:IdentityUser
    {
        #region public fields

        /// <summary>
        /// User's full name
        /// </summary>
        public string? Fullname { get; set; }

        /// <summary>
        /// URL to the user's profile image
        /// </summary>
        public string? ProfileImage { get; set; }
        #endregion
    }
}
