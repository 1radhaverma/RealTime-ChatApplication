using API.Common;
using API.DTOs;
using API.Extensions;
using API.Models;
using API.Services;
using API.Services.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Runtime.CompilerServices;

namespace API.Endpoints
{
    public static class AccountEndpoint
    {
        #region fields

        private static readonly IFileUpload _fileUpload;

        #endregion

        #region public methods

        /// <summary>
        /// Maps account-related endpoints to the application
        /// </summary>
        /// <param name="app">The WebApplication instance</param> 
        /// <returns>Configured route group builder</returns>
        public static RouteGroupBuilder MapAccountEndpoint(this WebApplication app)
        {
            var group = app.MapGroup("/api/account").WithTags("account");
            group.MapPost("/register", async (
          HttpContext context,
          UserManager<AppUser> userManager,
          [FromServices] IFileUpload fileUpload,
          [FromForm] RegisterDTO dto) =>
            {
            
                var userFromDb = await userManager.FindByEmailAsync(dto.Email);

                if (userFromDb is not null)
                {
                    return Results.BadRequest(Response<string>.Failure("User already exists."));
                }

                if (dto.ProfileImage is null)
                {
                    return Results.BadRequest(Response<string>.Failure("Profile Image Required."));
                }

                string fileName = await fileUpload.Upload(dto.ProfileImage);
                string picture = $"{context.Request.Scheme}://{context.Request.Host}/uploads/{fileName}";

                var user = new AppUser
                {
                    Email = dto.Email,
                    Fullname = dto.FullName,
                    UserName = dto.UserName,
                    ProfileImage = picture,
                };

                var result = await userManager.CreateAsync(user, dto.Password);

                if (!result.Succeeded)
                {
                    return Results.BadRequest(Response<string>.Failure(
                        result.Errors.Select(x => x.Description).FirstOrDefault()!));
                }

                return Results.Ok(Response<string>.Success("", "User created successfully."));
            }).DisableAntiforgery();

            group.MapPost("/login", async (UserManager<AppUser> userManager,
                TokenService tokenService, LoginDTO dTO) =>
            {
                if (dTO is null)
                {
                    return Results.BadRequest(Response<string>.Failure("Invalid login details"));
                }
                var user = await userManager.FindByEmailAsync(dTO.Email);   
                if(user is null)
                {
                    return Results.BadRequest(Response<string>.Failure("User not found"));
                }
                var result = await userManager.CheckPasswordAsync(user!,dTO.Password);
                if (!result)
                {
                    return Results.BadRequest(Response<string>.Failure("Invalid Password"));
                }
                var token = tokenService.GenerateToken(user.Id, user.UserName!);

                return Results.Ok(Response<string>.Success(token, "Login successfully"));

            });

            group.MapGet("/me", async (HttpContext context , UserManager<AppUser> userManager) =>
            {
                var currentLoggedInUserId = context.User.GetUserId()!;
                var currentLoggedInUser = await userManager.Users.SingleOrDefaultAsync(x => x.Id == currentLoggedInUserId.ToString());   
                //if (user is null)
                //{
                //    return Results.BadRequest(Response<string>.Failure("User not found"));
                //}
                return Results.Ok(Response<AppUser>.Success(currentLoggedInUser!, "User Fetched Successfully"));
            }).RequireAuthorization();
            return group;
        }

        #endregion
    }
}
