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
            // Postgres rejects a correlated subquery inside ALTER COLUMN ... USING, so the
            // reshape goes through a swap column instead: rename, add the new jsonb column,
            // backfill via UPDATE (subqueries are fine there), then drop the old column.
            // Legacy rows carry no fluency signal, so they land on Unspecified rather than a
            // guessed level.
            migrationBuilder.Sql("""
                ALTER TABLE "UserProfiles" RENAME COLUMN "Languages" TO "Languages_old";
                ALTER TABLE "UserProfiles" ADD COLUMN "Languages" jsonb;
                UPDATE "UserProfiles"
                SET "Languages" = COALESCE(
                    (SELECT jsonb_agg(jsonb_build_object('language', elem, 'fluency', 'Unspecified'))
                     FROM unnest("Languages_old") AS elem),
                    '[]'::jsonb
                );
                ALTER TABLE "UserProfiles" DROP COLUMN "Languages_old";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop the fluency field, collapsing each entry back to its language name.
            migrationBuilder.Sql("""
                ALTER TABLE "UserProfiles" RENAME COLUMN "Languages" TO "Languages_old";
                ALTER TABLE "UserProfiles" ADD COLUMN "Languages" text[];
                UPDATE "UserProfiles"
                SET "Languages" = COALESCE(
                    (SELECT array_agg(elem ->> 'language')
                     FROM jsonb_array_elements("Languages_old") AS elem),
                    '{}'::text[]
                );
                ALTER TABLE "UserProfiles" ALTER COLUMN "Languages" SET NOT NULL;
                ALTER TABLE "UserProfiles" DROP COLUMN "Languages_old";
                """);
        }
    }
}
