namespace API.Services.Interfaces
{
    public interface IFileUpload
    {
        /// <summary>  
        /// Uploads a file to the server  
        /// </summary>  
        /// <param name="file">The file to upload</param>  
        /// <returns>Unique filename generated for the uploaded file</returns>  
        Task<string> Upload(IFormFile file);
    }
}
