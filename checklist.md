# Improvement Checklist

This checklist identifies areas where the project could be enhanced. Items are grouped into UI, UX, and functionality categories.

## UI
- [x] Standardize the color palette for a consistent look and feel. (index.cfm)
- [x] Ensure layouts are responsive on both desktop and mobile. (index.cfm)
- [x] Review typography for better readability. (index.cfm)
- [x] Add icons or imagery to improve navigation. (index.cfm)
- [x] Provide a dark mode theme with toggle (index.cfm).

## UX
- [x] Implement clear form validation messages. (index.cfm)
- [x] Provide onboarding guidance for new users. (index.cfm)
- [x] Add accessibility improvements such as keyboard navigation support. (index.cfm)
- [x] Introduce a guided tour for key features. (index.cfm)
- [x] Simplify critical user flows where possible.

## Functionality
- [x] Integrate user authentication where appropriate.
- [x] Include logging for important actions and errors. (ask.cfm, runQuery.cfm)
- [x] Handle AI response failures gracefully. (index.cfm)
- [x] Add automated tests for major features.
- [x] Implement caching for frequently used data.

## Database Error Fix
- [x] Audit the codebase for any SQL statements referencing a non-existent `sales` table.
- [x] Replace those references with the correct table name `scm_sal_main` as defined in `schema_config.json`.
- [x] Update documentation or examples that mention a `sales` table to prevent future confusion.
- [x] Run the test suite to verify that updated queries succeed.
- [x] Perform a manual query through `runQuery.cfm` to confirm the fix.
