using API.Data;
using API.DTOs;
using API.Extensions;
using API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Collections.Concurrent;

namespace API.Hubs
{
    /// <summary>
    /// SignalR Hub for real-time chat functionality
    /// </summary>
    [Authorize]
    public class ChatHub(UserManager<AppUser> userManager, AppDbContext context) : Hub
    {
        #region fields

        /// <summary>
        /// Thread-safe dictionary to track online users
        /// Key: Username, Value: OnlineUserDto
        /// </summary>
        public static readonly ConcurrentDictionary<string, OnlineUserDto>
        onlineUsers = new();
        #endregion

        #region public methods

        /// <summary>
        /// Handles new client connections
        /// </summary>
        public override async Task OnConnectedAsync()
        {
            var httpContext = Context.GetHttpContext();
            var receiverId = httpContext?.Request.Query["senderId"].ToString();
            var userName = Context.User!.Identity!.Name!;
            var currentUser = await userManager.FindByNameAsync(userName);
            var connectionId = Context.ConnectionId;

            if (onlineUsers.ContainsKey(userName))
            {
                onlineUsers[userName].ConnectionId = connectionId;
            }
            else
            {
                var user = new OnlineUserDto
                {
                    ConnectionId = connectionId,
                    UserName = userName,
                    ProfileImage = currentUser!.ProfileImage,
                    FullName = currentUser!.Fullname,

                };
                onlineUsers.TryAdd(userName, user);
                await Clients.AllExcept(connectionId).SendAsync("Notify", currentUser);
            }
            if (!string.IsNullOrEmpty(receiverId))
            {
                await LoadMessages(receiverId);
            }
            await Clients.All.SendAsync("OnlineUsers", await GetAllUsers());
        }

        /// <summary>
        /// Loads paginated messages between current user and recipient
        /// </summary>
        /// <param name="recipientId">ID of the message recipient</param>
        /// <param name="pageNumber">Current page number (1-based)</param>
        public async Task LoadMessages(string recipientId, int pageNumber = 1)
        {
            try
            {
                int pageSize = 10;
                var userName = Context.User!.Identity!.Name;
                var currentUser = await userManager.FindByNameAsync(userName!);

                if (currentUser is null)
                {
                    return;
                }

                // Get messages with UTC timestamps
                var messages = await context.Messages
                     .Where(x => (x.ReceiverId == currentUser.Id && x.SenderId == recipientId ||
                      x.SenderId == currentUser!.Id && x.ReceiverId == recipientId))
                     .OrderByDescending(x => x.CreatedDate) // Consistent ordering
                     .Skip((pageNumber - 1) * pageSize)
                     .Take(pageSize)
                     .Select(x => new MessageRequestDto
                     {
                         Id = x.Id,
                         SenderId = x.SenderId,
                         ReceiverId = x.ReceiverId,
                         Content = x.Content,
                         CreatedDate = x.CreatedDate // ISO 8601 format
                     })
                     .ToListAsync();

                // Mark messages as read
                foreach (var message in messages)
                {
                    var msg = await context.Messages.FirstOrDefaultAsync(x => x.Id == message.Id);
                    if (msg != null && msg.ReceiverId == currentUser.Id)
                    {
                        msg.IsRead = true;
                        await context.SaveChangesAsync();
                    }
                }

                await Clients.User(currentUser.Id).SendAsync("ReceiveMessageList", new
                {
                    messages,
                    pageNumber,
                    totalPages = (int)Math.Ceiling(await context.Messages.CountAsync(x =>
                        (x.ReceiverId == currentUser.Id && x.SenderId == recipientId) ||
                        (x.SenderId == currentUser.Id && x.ReceiverId == recipientId)) / (double)pageSize)
                });
            }
            catch (Exception ex)
            {
                // Handle exceptions (e.g., log them)
                Console.WriteLine($"Error loading messages: {ex.Message}");
            }
        }

        /// <summary>
        /// Sends a message between users
        /// </summary>
        /// <param name="message">Message DTO containing content and recipient</param>
        public async Task SendMessage(MessageRequestDto message)
        {
            try
            {
                var senderUserName = Context.User!.Identity!.Name;
                var sender = await userManager.FindByNameAsync(senderUserName!);
                var receiver = await userManager.FindByIdAsync(message.ReceiverId!);

                if (sender == null || receiver == null)
                {
                    Console.WriteLine("Sender or receiver not found");
                    return;
                }

                var newMsg = new Message
                {
                    SenderId = sender.Id,
                    ReceiverId = receiver.Id,
                    Content = message.Content,
                    CreatedDate = DateTime.UtcNow,
                    IsRead = false
                };

                context.Messages.Add(newMsg);
                await context.SaveChangesAsync();

                // Create a clean DTO for sending
                var messageDto = new
                {
                    Id = newMsg.Id,
                    SenderId = newMsg.SenderId,
                    ReceiverId = newMsg.ReceiverId,
                    Content = newMsg.Content,
                    CreatedDate = newMsg.CreatedDate.ToString("o"),
                    IsRead = newMsg.IsRead
                };

                // Send to receiver
                await Clients.User(receiver.Id).SendAsync("ReceiveMessage", messageDto);

                // Also send to sender to ensure both clients have the message
                await Clients.User(sender.Id).SendAsync("ReceiveMessage", messageDto);

                Console.WriteLine($"Message sent from {sender.Id} to {receiver.Id}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error sending message: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Notifies a user when someone is typing
        /// </summary>
        /// <param name="recipientUserName">Username of the recipient</param>
        public async Task NotifyTyping(string recipientUserName)
        {
            var senderUserName = Context.User!.Identity!.Name;

            if (senderUserName is null)
            {
                return;
            }
            var connectionId = onlineUsers.Values.FirstOrDefault(x => x.UserName == recipientUserName)?.ConnectionId;

            if (connectionId != null)
            {
                await Clients.Client(connectionId).SendAsync("NotifyTypingtoUser", senderUserName);
            }

        }

        /// <summary>
        /// Handles client disconnections
        /// </summary>
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userName = Context.User!.Identity!.Name;
            onlineUsers.TryRemove(userName!, out _);
            await Clients.All.SendAsync("OnlineUsers", await GetAllUsers());
        }
        #endregion

        #region private methods

        /// <summary>
        /// Gets all users with their online status and unread message counts
        /// </summary>
        /// <returns>List of OnlineUserDto</returns>
        private async Task<IEnumerable<OnlineUserDto>> GetAllUsers()
        {
            var username = Context.User!.GetUserNmae();
            var onlineUsersSets = new HashSet<string>(onlineUsers.Keys);
            var users = await userManager.Users.Select(u => new OnlineUserDto
            {
                Id = u.Id,
                UserName = u.UserName,
                FullName = u.Fullname,
                ProfileImage = u.ProfileImage,
                IsOnline = onlineUsersSets.Contains(u.UserName!),
                UnreadCount = context.Messages.Count(x => x.ReceiverId == username && x.SenderId == u.Id && x.IsRead)
            }).OrderByDescending(u => u.IsOnline).ToListAsync();

            return users;
        }
        #endregion
    }
}
