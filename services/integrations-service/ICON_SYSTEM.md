# Integration Icons System

## Overview
Each integration now has **two icon options** for maximum flexibility:

1. **`icon`** - Generic Lucide React icon representing the service's function
2. **`brandIcon`** - Specific brand icon from Simple Icons (prefixed with `Si`)

## Usage

### Option 1: Functional Icons (Recommended for consistency)
Use the `icon` field which contains standard Lucide React icons:
```typescript
import { ShoppingBag, CreditCard, Mail } from 'lucide-react';

// Example
<ShoppingBag className="w-6 h-6" />
```

### Option 2: Brand Icons (Recommended for recognition)
Use the `brandIcon` field which contains Simple Icons:
```typescript
import { SiShopify, SiStripe, SiMailchimp } from 'react-icons/si';

// Example
<SiShopify className="w-6 h-6" />
```

## Icon Mappings by Category

### E-Commerce
- **Shopify**: `ShoppingBag` / `SiShopify`
- **WooCommerce**: `ShoppingCart` / `SiWoo`
- **Square**: `CreditCard` / `SiSquare`
- **BigCommerce**: `Store` / `SiBigcommerce`
- **Ecwid**: `ShoppingBag` / `SiEcwid`

### Payments
- **Stripe**: `CreditCard` / `SiStripe`
- **PayPal**: `Wallet` / `SiPaypal`
- **Square Payments**: `CreditCard` / `SiSquare`
- **Authorize.Net**: `DollarSign` / `SiAuthorizedotnet`

### Email Marketing
- **Mailchimp**: `Mail` / `SiMailchimp`
- **SendGrid**: `Send` / `SiSendgrid`
- **Mailgun**: `Mailbox` / `SiMailgun`
- **Constant Contact**: `AtSign` / `SiConstantcontact`
- **Klaviyo**: `MessageSquare` / `SiKlaviyo`

### CRM
- **HubSpot**: `Users` / `SiHubspot`
- **Salesforce**: `Cloud` / `SiSalesforce`
- **Pipedrive**: `TrendingUp` / `SiPipedrive`
- **Zoho CRM**: `Briefcase` / `SiZoho`
- **ActiveCampaign**: `Target` / `SiActivecampaign`

### Communication
- **Slack**: `MessageCircle` / `SiSlack`
- **Discord**: `MessageSquare` / `SiDiscord`
- **Twilio**: `Phone` / `SiTwilio`
- **Telegram**: `Send` / `SiTelegram`

### Analytics
- **Google Analytics**: `BarChart3` / `SiGoogleanalytics`
- **Mixpanel**: `LineChart` / `SiMixpanel`
- **Amplitude**: `Activity` / `SiAmplitude`

### Spreadsheets
- **Google Sheets**: `Table` / `SiGooglesheets`
- **Airtable**: `Database` / `SiAirtable`

### Automation
- **Zapier**: `Zap` / `SiZapier`
- **Make**: `Workflow` / `SiMake`
- **n8n**: `GitBranch` / `SiN8n`

### Social Media
- **Facebook**: `Share2` / `SiFacebook`
- **Instagram**: `Camera` / `SiInstagram`
- **Twitter/X**: `MessageCircle` / `SiX`
- **LinkedIn**: `Briefcase` / `SiLinkedin`

### Calendar & Scheduling
- **Google Calendar**: `Calendar` / `SiGooglecalendar`
- **Calendly**: `CalendarCheck` / `SiCalendly`
- **Microsoft Outlook**: `Mail` / `SiMicrosoftoutlook`

### Forms & Surveys
- **Typeform**: `FileText` / `SiTypeform`
- **Google Forms**: `ClipboardList` / `SiGoogleforms`

### Restaurant/POS
- **Toast POS**: `Utensils` / `SiToast`
- **Clover**: `ShoppingCart` / `SiClover`
- **Lightspeed**: `Zap` / `SiLightspeed`
- **OpenTable**: `BookOpen` / `SiOpentable`

### Storage
- **Dropbox**: `Cloud` / `SiDropbox`
- **Google Drive**: `HardDrive` / `SiGoogledrive`

### Custom
- **Custom Webhook**: `Webhook` / `Globe`

## Installation

```bash
# For Lucide React (functional icons)
npm install lucide-react

# For Simple Icons (brand icons)
npm install react-icons
```

## Best Practices

1. **Use brand icons for marketing/display pages** - More recognizable to users
2. **Use functional icons for internal UI** - More consistent design system
3. **Always provide alt text** for accessibility
4. **Use consistent sizing** across all integration cards
5. **Consider color** - Brand icons work best with the brand's official colors

## Example Component

```tsx
import { ShoppingBag } from 'lucide-react';
import { SiShopify } from 'react-icons/si';

function IntegrationCard({ integration, useBrandIcon = true }) {
  const Icon = useBrandIcon 
    ? require('react-icons/si')[integration.brandIcon]
    : require('lucide-react')[integration.icon];
    
  return (
    <div className="integration-card">
      <Icon className="w-8 h-8 text-brand" />
      <h3>{integration.name}</h3>
      <p>{integration.description}</p>
    </div>
  );
}
```

## Color Palette (Brand Colors)

For brand icons, use these official colors:

- **Shopify**: `#96BF48`
- **Stripe**: `#635BFF`
- **Mailchimp**: `#FFE01B`
- **HubSpot**: `#FF7A59`
- **Salesforce**: `#00A1E0`
- **Slack**: `#4A154B`
- **Discord**: `#5865F2`
- **Google**: `#4285F4`
- **PayPal**: `#00457C`
- **Facebook**: `#1877F2`
- **Instagram**: `#E4405F`
- **LinkedIn**: `#0A66C2`

## Notes

- All Simple Icons are prefixed with `Si` (e.g., `SiShopify`, `SiStripe`)
- Lucide React icons use PascalCase (e.g., `ShoppingBag`, `CreditCard`)
- Some integrations share the same functional icon (e.g., multiple payment services use `CreditCard`)
- Brand icons are unique to each service for better recognition
