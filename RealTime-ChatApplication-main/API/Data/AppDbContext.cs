using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using API.Models;
using Microsoft.AspNetCore.Identity;

namespace API.Data
{
    /// <summary>
    /// Application database context that combines Identity with custom entities
    /// </summary>
    public class AppDbContext : IdentityDbContext<AppUser>
    {
        #region ctor

        /// <summary>
        /// Initializes a new instance of the database context
        /// </summary>
        /// <param name="options">The options to be used by the DbContext</param>
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {

        }
        #endregion

        #region public properties

        /// <summary>
        /// Gets or sets the Messages table in the database
        /// </summary>
        public DbSet<Message> Messages { get; set; }

        #endregion

        #region protected methods

        /// <summary>
        /// Configures the database model and relationships
        /// </summary>
        /// <param name="builder">The builder being used to construct the model</param>
        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<Message>(entity =>
            {
                // Configure relationships
                entity.HasOne(m => m.Sender)
                    .WithMany()
                    .HasForeignKey(m => m.SenderId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(m => m.Receiver)
                    .WithMany()
                    .HasForeignKey(m => m.ReceiverId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Ensure required fields
                entity.Property(m => m.Content).IsRequired();
                entity.Property(m => m.SenderId).IsRequired();
                entity.Property(m => m.ReceiverId).IsRequired();
                entity.Property(m => m.CreatedDate).IsRequired();
            });
        }
        #endregion
    }
}
