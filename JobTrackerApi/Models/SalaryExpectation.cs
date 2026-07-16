namespace JobTrackerApi.Models;
using System.ComponentModel.DataAnnotations;

/// <summary>A candidate's minimum acceptable salary, with its currency and period.</summary>
public class SalaryExpectation
{
    [Required]
    [Range(0, ValidationConstants.MaxSalaryAmount)]
    public int? MinAmount { get; set; }

    [Required]
    [MaxLength(3)]
    // ISO 4217 alpha-3 code, e.g. "NZD", "JPY"
    [RegularExpression(@"^[A-Z]{3}$", ErrorMessage = "Currency must be a valid ISO 4217 alpha-3 code (e.g. NZD, JPY).")]
    public string Currency { get; set; } = null!;

    // Nullable so [Required] actually rejects an omitted value
    // a non-nullable enum would silently default to Annual
    [Required]
    public SalaryPeriod? Period { get; set; }
}
