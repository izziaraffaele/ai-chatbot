# White-Label Capability

## ADDED Requirements

### Requirement: Environment Variable Integration

The branding system SHALL integrate environment variables as default fallback values for demo configuration.

#### Scenario: Environment variables provide defaults
- **WHEN** demo config is initialized
- **THEN** values from `NEXT_PUBLIC_*` environment variables SHALL be used as defaults when demo config values are not explicitly set

#### Scenario: Demo config overrides environment
- **WHEN** demo config has explicit values set
- **THEN** demo config values SHALL take precedence over environment variable defaults

#### Scenario: Missing environment variables
- **WHEN** environment variables are not set
- **THEN** system SHALL fall back to hard-coded defaults in the schema

### Requirement: Branding Hook Adoption

All user-facing components with visual branding elements SHALL use the `useBranding` hook instead of hard-coded values.

#### Scenario: Logo display in navigation
- **WHEN** a component needs to display the application or organization logo
- **THEN** it SHALL read the logo URL from `useBranding().logo` or `useBranding().authLogo`

#### Scenario: Organization name display
- **WHEN** a component needs to display the organization name
- **THEN** it SHALL read the name from `useBranding().organizationName`

#### Scenario: Assistant name display
- **WHEN** a component needs to display the assistant name
- **THEN** it SHALL read the name from `useBranding().assistantName`

#### Scenario: Avatar service URL
- **WHEN** generating user avatar URLs
- **THEN** the system SHALL use `NEXT_PUBLIC_AVATAR_SERVICE_URL` from environment or fall back to default service

### Requirement: Dynamic Favicon Management

The application SHALL support dynamic favicon updates based on branding configuration.

#### Scenario: Favicon from branding config
- **WHEN** branding config includes a favicon URL
- **THEN** the application SHALL update the browser favicon link element to use the configured URL

#### Scenario: Favicon changes at runtime
- **WHEN** demo config is updated with a new favicon URL
- **THEN** the browser favicon SHALL update without page reload

#### Scenario: Missing favicon configuration
- **WHEN** no favicon is configured in branding
- **THEN** the application SHALL use the default favicon from the public directory

### Requirement: Theme Customization

The application SHALL apply custom CSS theme variables from branding configuration.

#### Scenario: Custom CSS variables applied
- **WHEN** branding config includes `customCss` property
- **THEN** the application SHALL inject those CSS custom properties into the document root

#### Scenario: Theme preset selection
- **WHEN** branding config specifies a `preset` value
- **THEN** the application SHALL apply the corresponding theme preset styles

#### Scenario: Default mode application
- **WHEN** branding config specifies a `defaultMode` (dark/light/auto)
- **THEN** the application SHALL initialize with that theme mode

### Requirement: Server-Side Metadata Configuration

Server-rendered pages SHALL use environment variables for metadata configuration.

#### Scenario: Root layout metadata
- **WHEN** the root layout is server-rendered
- **THEN** it SHALL use `NEXT_PUBLIC_METADATA_TITLE` for the page title
- **AND** it SHALL use `NEXT_PUBLIC_METADATA_DESCRIPTION` for the meta description
- **AND** it SHALL use `NEXT_PUBLIC_APP_URL` for the metadataBase

#### Scenario: Missing metadata environment variables
- **WHEN** metadata environment variables are not set
- **THEN** the system SHALL fall back to reasonable defaults

### Requirement: Authentication Page Branding

Authentication pages SHALL display logos and theming from branding configuration.

#### Scenario: Logo on auth pages
- **WHEN** rendering login or register pages
- **THEN** the page SHALL display the logo from `useBranding().authLogo` if available
- **AND** SHALL fall back to `useBranding().logo` if `authLogo` is not set

#### Scenario: Auth page theming
- **WHEN** rendering authentication pages
- **THEN** custom theme CSS variables SHALL be applied for consistent branding

### Requirement: Branding Configuration Documentation

Environment variables for branding SHALL be documented in `.env.example` with descriptions.

#### Scenario: Required branding variables
- **WHEN** reviewing `.env.example`
- **THEN** all branding-related `NEXT_PUBLIC_*` variables SHALL be listed with descriptions

#### Scenario: Optional branding variables
- **WHEN** optional branding variables are defined
- **THEN** their documentation SHALL indicate they are optional and describe their defaults

### Requirement: Fallback Behavior

The branding system SHALL provide graceful fallbacks when branding assets are unavailable.

#### Scenario: Missing logo fallback
- **WHEN** logo URL is not configured or fails to load
- **THEN** the application SHALL display the organization or app name as text

#### Scenario: Missing avatar service
- **WHEN** avatar service URL is not configured
- **THEN** the system SHALL use a default avatar service URL

### Requirement: Branding Consistency

Components SHALL use consistent patterns for accessing and displaying branding data.

#### Scenario: Single source of truth
- **WHEN** multiple components need the same branding data
- **THEN** all SHALL access it through the `useBranding` hook with identical property names

#### Scenario: No hard-coded brand values
- **WHEN** code review checks for branding compliance
- **THEN** no component SHALL contain hard-coded organization names, app names, or logo URLs
