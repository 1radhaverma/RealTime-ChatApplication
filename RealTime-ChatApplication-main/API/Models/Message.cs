using System.Data;

namespace API.Models
{
    public class Message
    {
        public int Id { get; set; }
        public string SenderId { get; set; } // Changed from nullable to required
        public string ReceiverId { get; set; } // Changed from nullable to required
        public string Content { get; set; } // Changed from nullable to required
        public DateTime CreatedDate { get; set; }
        public bool IsRead { get; set; }

        // Navigation properties
        public virtual AppUser Sender { get; set; }
        public virtual AppUser Receiver { get; set; }
        
    }
}
