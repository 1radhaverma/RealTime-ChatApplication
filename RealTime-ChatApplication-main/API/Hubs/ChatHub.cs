using API.Data;
using API.DTOs;
using API.Extensions;
using API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;

namespace API.Hubs
{
    [Authorize]
    public class ChatHub(UserManager<AppUser> userManager, AppDbContext context) : Hub
    {
        public static readonly ConcurrentDictionary<string, OnlineUserDto> onlineUsers = new();
        private static readonly ConcurrentDictionary<int, string> pendingMessages = new();

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

        public async Task LoadMessages(string recipientId, int pageNumber = 1)
        {
            try
            {
                int pageSize = 10;
                var userName = Context.User!.Identity!.Name;
                var currentUser = await userManager.FindByNameAsync(userName!);

                if (currentUser is null) return;

                // Get only non-deleted messages
                var messages = await context.Messages
                    .Where(x => !x.IsDeleted &&
                        ((x.ReceiverId == currentUser.Id && x.SenderId == recipientId) ||
                        (x.SenderId == currentUser.Id && x.ReceiverId == recipientId)))
                    .OrderByDescending(x => x.CreatedDate)
                    .Skip((pageNumber - 1) * pageSize)
                    .Take(pageSize)
                    .Select(x => new MessageRequestDto
                    {
                        Id = x.Id,
                        SenderId = x.SenderId,
                        ReceiverId = x.ReceiverId,
                        Content = x.Content,
                        CreatedDate = x.CreatedDate,
                        Status = "persisted" // Mark as persisted in database
                    })
                    .ToListAsync();

                // Mark messages as read
                foreach (var message in messages.Where(m => m.ReceiverId == currentUser.Id))
                {
                    var msg = await context.Messages.FirstOrDefaultAsync(x => x.Id == message.Id);
                    if (msg != null)
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
                        !x.IsDeleted &&
                        ((x.ReceiverId == currentUser.Id && x.SenderId == recipientId) ||
                        (x.SenderId == currentUser.Id && x.ReceiverId == recipientId))) / (double)pageSize)
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading messages: {ex.Message}");
            }
        }

        public async Task SendMessage(MessageRequestDto message)
        {
            try
            {
                var senderId = Context.User!.Identity!.Name;
                var recipientId = message.ReceiverId;
                var tempId = message.TempId ?? 0;

                // Add temporary ID to track pending messages
                if (tempId > 0)
                {
                    pendingMessages.TryAdd(tempId, Context.ConnectionId);
                }

                var newMsg = new Message
                {
                    Sender = await userManager.FindByNameAsync(senderId!),
                    Receiver = await userManager.FindByIdAsync(recipientId!),
                    Content = message.Content,
                    CreatedDate = DateTime.UtcNow,
                    IsRead = false,
                    IsDeleted = false
                };

                context.Messages.Add(newMsg);
                await context.SaveChangesAsync();

                // Notify sender of successful persistence
                if (tempId > 0)
                {
                    await Clients.Caller.SendAsync("MessagePersisted", new
                    {
                        tempId,
                        actualId = newMsg.Id
                    });
                }

                // Send to recipient
                await Clients.User(recipientId).SendAsync("ReceiveMessage", new MessageRequestDto
                {
                    Id = newMsg.Id,
                    SenderId = newMsg.SenderId,
                    ReceiverId = newMsg.ReceiverId,
                    Content = newMsg.Content,
                    CreatedDate = newMsg.CreatedDate,
                    Status = "persisted"
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error sending message: {ex.Message}");
                if (message.TempId.HasValue)
                {
                    await Clients.Caller.SendAsync("MessageFailed", message.TempId.Value);
                }
            }
        }

        public async Task NotifyTyping(string recipientUserName)
        {
            var senderUserName = Context.User!.Identity!.Name;
            if (senderUserName is null) return;

            var connectionId = onlineUsers.Values
                .FirstOrDefault(x => x.UserName == recipientUserName)?.ConnectionId;

            if (connectionId != null)
            {
                await Clients.Client(connectionId).SendAsync("NotifyTypingtoUser", senderUserName);
            }
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userName = Context.User!.Identity!.Name;
            onlineUsers.TryRemove(userName!, out _);
            await Clients.All.SendAsync("OnlineUsers", await GetAllUsers());
        }

        public async Task UnsendMessage(int messageId, bool forEveryone = true)
        {
            var userName = Context.User!.Identity!.Name;
            var currentUser = await userManager.FindByNameAsync(userName!);

            if (currentUser == null) return;

            var message = await context.Messages
                .FirstOrDefaultAsync(m => m.Id == messageId &&
                    (m.SenderId == currentUser.Id || (forEveryone && m.ReceiverId == currentUser.Id)));

            if (message == null) return;

            if (forEveryone)
            {
                // Hard delete from database
                context.Messages.Remove(message);
                await context.SaveChangesAsync();

                // Notify both parties
                await Clients.Users(message.SenderId!, message.ReceiverId!)
                    .SendAsync("MessageDeleted", messageId, true);
            }
            else
            {
                // Soft delete (only for sender)
                message.IsDeleted = true;
                await context.SaveChangesAsync();

                // Notify only sender
                await Clients.Caller.SendAsync("MessageDeleted", messageId, false);
            }
        }

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
                UnreadCount = context.Messages.Count(x =>
                    x.ReceiverId == username &&
                    x.SenderId == u.Id &&
                    !x.IsRead &&
                    !x.IsDeleted)
            }).OrderByDescending(u => u.IsOnline).ToListAsync();

            return users;
        }
    }
}