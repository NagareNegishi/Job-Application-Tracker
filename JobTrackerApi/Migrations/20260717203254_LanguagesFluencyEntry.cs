using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobTrackerApi.Migrations
{
    /// <inheritdoc />
    public partial class LanguagesFluencyEntry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Reshape each string element into { language, fluency } — legacy rows carry no fluency
            // signal, so they land on Unspecified rather than a guessed level.
            migrationBuilder.Sql("""
                ALTER TABLE "UserProfiles"
                    ALTER COLUMN "Languages" DROP NOT NULL,
                    ALTER COLUMN "Languages" TYPE jsonb USING (
                        SELECT COALESCE(jsonb_agg(jsonb_build_object('language', elem, 'fluency', 'Unspecified')), '[]'::jsonb)
                        FROM unnest("Languages") AS elem
                    );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop the fluency field, collapsing each entry back to its language name.
            migrationBuilder.Sql("""
                ALTER TABLE "UserProfiles"
                    ALTER COLUMN "Languages" TYPE text[] USING (
                        SELECT COALESCE(array_agg(elem ->> 'language'), '{}'::text[])
                        FROM jsonb_array_elements("Languages") AS elem
                    ),
                    ALTER COLUMN "Languages" SET NOT NULL;
                """);
        }
    }
}
