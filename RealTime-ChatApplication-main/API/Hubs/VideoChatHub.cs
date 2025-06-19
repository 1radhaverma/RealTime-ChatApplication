using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace API.Hubs
{
    /// <summary>
    /// SignalR Hub for real-time video chat functionality using WebRTC
    /// </summary>
    [Authorize]
    public class VideoChatHub : Hub
    {
        #region public methods
        /// <summary>
        /// Sends a WebRTC offer to initiate a video call
        /// </summary>
        /// <param name="receiverId">User ID of the call recipient</param>
        /// <param name="offer">WebRTC offer SDP</param>
        /// <returns>Task representing the asynchronous operation</returns>
        public async Task SendOffer(string receiverId, string offer)
        {
            await Clients.User(receiverId).SendAsync("ReceiveOffer", Context.UserIdentifier, offer);
        }

        /// <summary>
        /// Sends a WebRTC answer to accept a video call
        /// </summary>
        /// <param name="receiverId">User ID of the call initiator</param>
        /// <param name="answer">WebRTC answer SDP</param>
        /// <returns>Task representing the asynchronous operation</returns>
        public async Task SendAnswer(string receiverId, string answer)
        {
            await Clients.User(receiverId).SendAsync("ReceiveAnswer", Context.UserIdentifier, answer);
        }

        /// <summary>
        /// Sends ICE candidate information for peer connection establishment
        /// </summary>
        /// <param name="receiverId">User ID of the peer</param>
        /// <param name="candidate">ICE candidate information</param>
        /// <returns>Task representing the asynchronous operation</returns>
        public async Task SendIceCandidate(string receiverId, string candidate)
        {
            await Clients.User(receiverId).SendAsync("ReceiveIceCandidate", Context.UserIdentifier, candidate);
        }

        /// <summary>
        /// Notifies the peer that the call has been ended
        /// </summary>
        /// <param name="receiverId">User ID of the peer</param>
        /// <returns>Task representing the asynchronous operation</returns>
        public async Task EndCall(string receiverId)
        {
            await Clients.User(receiverId).SendAsync("CallEnded", Context.UserIdentifier);
        }
        #endregion
    }
}