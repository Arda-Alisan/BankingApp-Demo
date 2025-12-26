using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApplication2.Data;
using WebApplication2.Models;

namespace WebApplication2.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly BankingDbContext _context;

        public AdminController(BankingDbContext context)
        {
            _context = context;
        }

        // 1. SİSTEM LOGLARI
        [HttpGet("logs")]
        public IActionResult GetSystemLogs()
        {
            var logs = _context.SecurityLogs
                               .Include(l => l.User)
                               .OrderByDescending(l => l.Timestamp)
                               .Select(l => new 
                               {
                                   id = l.Id,
                                   user = l.User != null ? (l.User.FullName ?? l.User.Username) : "Silinmiş Kullanıcı",
                                   action = l.Action,
                                   details = l.Details,
                                   // SAAT DÜZELTMESİ: UTC zamanına 3 saat ekliyoruz
                                   date = l.Timestamp.AddHours(3)
                               })
                               .ToList();

            return Ok(logs);
        }

        // 2. TÜM PARA TRANSFERLERİ (Admin Paneli İçin Düzeltilmiş)
        [HttpGet("all-transactions")]
        public IActionResult GetAllTransactions()
        {
            var transactions = _context.TransactionHistories
                // BU SATIRLAR ÇOK ÖNEMLİ: İsimleri getiren kodlar bunlar
                .Include(t => t.FromAccount).ThenInclude(a => a.User)
                .Include(t => t.ToAccount).ThenInclude(a => a.User)
                .OrderByDescending(t => t.TransactionDate)
                .Select(t => new
                {
                    id = t.Id,
                    // SAAT DÜZELTMESİ: UTC zamanına 3 saat ekliyoruz
                    date = t.TransactionDate.AddHours(3),
                    amount = t.Amount,
                    
                    // Gönderen Adı (Frontend 'sender' bekliyor, küçük harfle gönderiyoruz)
                    sender = (t.FromAccount != null && t.FromAccount.User != null) 
                             ? (t.FromAccount.User.FullName ?? t.FromAccount.User.Username) 
                             : "ATM / Para Yatırma",
                    
                    senderAccount = t.FromAccount != null ? t.FromAccount.AccountNumber : "-",

                    // Alıcı Adı (Frontend 'receiver' bekliyor)
                    receiver = (t.ToAccount != null && t.ToAccount.User != null) 
                               ? (t.ToAccount.User.FullName ?? t.ToAccount.User.Username) 
                               : "ATM / Para Çekme",

                    receiverAccount = t.ToAccount != null ? t.ToAccount.AccountNumber : "-"
                })
                .ToList();

            return Ok(transactions);
        }
    }
}