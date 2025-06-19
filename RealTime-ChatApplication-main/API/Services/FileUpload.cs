using API.Services.Interfaces;

namespace API.Services
{
    /// <summary>  
    /// Service for handling file upload operations following SOLID principles  
    /// Implements the IFileUpload interface for dependency injection  
    /// </summary>  
    public class FileUpload : IFileUpload
    {
        #region public methods  
        /// <summary>  
        /// Uploads a file to the server's upload directory  
        /// </summary>  
        /// <param name="file">The file to upload (IFormFile)</param>  
        public async Task<string> Upload(IFormFile file)
        {
            var uploadFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            if (!Directory.Exists(uploadFolder))
            {
                Directory.CreateDirectory(uploadFolder);
            }

            var fileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
            var filePath = Path.Combine(uploadFolder, fileName);

            await using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);

            return fileName;
        }
        #endregion
    }
}
