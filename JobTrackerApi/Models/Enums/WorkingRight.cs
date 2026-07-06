namespace JobTrackerApi.Models;

/// <summary>Work authorisation status for a given country.</summary>
public enum WorkingRight
{
    Citizen,
    PermanentResident,
    WorkVisa,
    RequiresSponsorship,
    Other
}
