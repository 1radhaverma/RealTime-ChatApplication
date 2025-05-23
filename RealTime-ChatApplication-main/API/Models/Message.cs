using System.Data;

namespace API.Models
{
    public class Message
    {
        public int  Id { get; set; }
        public string? SenderId { get; set; }
        public string? ReceiverId { get; set; }
        public string? Content { get; set; }
        public DateTime CreatedDate { get; set; }
        public bool IsRead { get; set; }
        public bool IsDeleted { get; set; }
        public AppUser? Sender { get; set; }
        public AppUser? Receiver { get; set; }
        public int? TempId { get; set; } // Temporary ID for pending messages
        public string? Status { get; set; } // Status of the message (e.g., "pending", "persisted")
    }
}
