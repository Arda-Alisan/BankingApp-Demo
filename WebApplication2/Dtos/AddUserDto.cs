// AddUserDto.cs
using System.ComponentModel.DataAnnotations;
public class AddUserDto
{
    [Required]
    public string Username { get; set; }
    
    [Required]
    public string Password { get; set; } // Şifre hashlenmeden önce alınacak
    
    public string FullName { get; set; }
    
    [Required]
    public string Email { get; set; }
    
    [Required]
    public string Role { get; set; } // "Customer" veya "Admin" gibi
    
    // Yeni kullanıcının açılış bakiyesi
    public decimal InitialBalance { get; set; } = 0; 
}