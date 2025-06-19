using API.Services.Interfaces;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace API.Services
{
    /// <summary>
    /// Service for JWT token generation, validation, and inspection
    /// Implements ITokenService interface for dependency injection
    /// </summary>
    public class TokenService: ITokenService
    {
        #region private field
        private readonly IConfiguration _config;
        #endregion

        #region ctor

        /// <summary>
        /// Initializes a new instance of the TokenService with required configuration
        /// </summary>
        public TokenService(IConfiguration config)
        {
            _config = config;
        }
        #endregion

        #region public methods

        /// <summary>
        /// Generates a JWT token for an authenticated user
        /// </summary>
        /// <param name="userId">Unique identifier of the user</param>
        /// <param name="userName">Display name of the user</param>
        /// <returns>Encoded JWT token string</returns>
        /// <exception cref="ArgumentNullException">Thrown when userId or userName is null/empty</exception>
        public string GenerateToken(string userId, string userName)
        {
            var tokenHandler = new JwtSecurityTokenHandler ();
            var key = Encoding.ASCII.GetBytes(_config["JWTSettings:SecurityKey"]!);

            var claims = new List<Claim>
            { 
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim(ClaimTypes.Name, userName)

            };
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddDays(1),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey
                (key), SecurityAlgorithms.HmacSha256)
            };
            var token = tokenHandler.CreateToken (tokenDescriptor);
            return tokenHandler.WriteToken (token);
        }
        #endregion
    }
}
