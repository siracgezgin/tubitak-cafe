using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XPos.Infrastructure.Persistence;
using XPos.Shared.DTOs;
using XPos.Shared.Entities;

namespace XPos.WebAPI.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize] // Tüm endpoint'ler JWT gerektirir
public class StaffController : ControllerBase
{
    private readonly XPosDbContext _context;

    public StaffController(XPosDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,SubAdmin")]
    public async Task<ActionResult<List<StaffDto>>> GetStaffs()
    {
        return await _context.Staffs
            .Select(s => new StaffDto
            {
                Id = s.Id,
                Name = s.Name,
                Surname = s.Surname,
                Phone = s.Phone,
                Role = s.Role,
                IsActive = s.IsActive
                // PasswordHash asla döndürülmüyor!
            })
            .ToListAsync();
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<StaffDto>> CreateStaff(CreateStaffDto dto)
    {
        var staff = new Staff
        {
            Name = dto.Name,
            Surname = dto.Surname,
            Phone = dto.Phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = dto.Role,
            IsActive = true
        };

        _context.Staffs.Add(staff);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetStaffs), new { id = staff.Id }, new StaffDto
        {
            Id = staff.Id,
            Name = staff.Name,
            Surname = staff.Surname,
            Phone = staff.Phone,
            Role = staff.Role,
            IsActive = staff.IsActive
        });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateStaff(int id, CreateStaffDto dto)
    {
        var staff = await _context.Staffs.FindAsync(id);
        if (staff == null) return NotFound();

        staff.Name = dto.Name;
        staff.Surname = dto.Surname;
        staff.Phone = dto.Phone;
        staff.Role = dto.Role;

        // Şifre güncelleme: boş değilse yeni hash oluştur
        if (!string.IsNullOrWhiteSpace(dto.Password))
            staff.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteStaff(int id)
    {
        var staff = await _context.Staffs.FindAsync(id);
        if (staff == null) return NotFound();

        // Soft delete - sadece deaktif et
        staff.IsActive = false;
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

