using Microsoft.AspNetCore.Identity;

namespace JobTrackerApi.Models;

// Extends IdentityUser to add app-specific user data.
// Preferences is raw JSON (not an EF-mapped type) — deserialized only in AccountController.
public class ApplicationUser : IdentityUser
{
    public string? Preferences { get; set; }
}
