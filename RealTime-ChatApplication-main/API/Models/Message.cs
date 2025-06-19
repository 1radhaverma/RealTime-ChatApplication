using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Data;

namespace API.Models
{ /// <summary>
  /// Represents a message between users in the application
  /// </summary>
    public class Message
    { 
        #region public fields

        /// <summary>
        /// Unique identifier for the message
        /// </summary>
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// Foreign key for the sender user
        /// </summary>
        [Required]
        [ForeignKey(nameof(Sender))]
        public string SenderId { get; set; } // Changed from nullable to required

        /// <summary>
        /// Foreign key for the recipient user
        /// </summary>
        [Required]
        [ForeignKey(nameof(Receiver))]
        public string ReceiverId { get; set; } // Changed from nullable to required

        /// <summary>
        /// The body content of the message
        /// </summary>
        /// <example>Hello, how are you doing today?</example>
        [Required]
        [MaxLength(2000)]
        public string Content { get; set; } // Changed from nullable to required

        /// <summary>
        /// Date and time when the message was created (UTC)
        /// </summary>
        [DataType(DataType.DateTime)]
        public DateTime CreatedDate { get; set; }

        /// <summary>
        /// Indicates whether the message has been read by the recipient
        /// </summary>
        public bool IsRead { get; set; }

        /// <summary>
        /// Navigation property to the sender user
        /// </summary>
        public virtual AppUser Sender { get; set; }

        /// <summary>
        /// Navigation property to the recipient user
        /// </summary>
        public virtual AppUser Receiver { get; set; }
        
        #endregion
    }
}
