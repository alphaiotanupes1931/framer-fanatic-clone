import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
import { template as referralInviteTemplate } from './referral-invite'
import { template as groupJoinRequestTemplate } from './group-join-request'
import { template as contentReportTemplate } from './content-report'
import { template as ticketConfirmationTemplate } from './ticket-confirmation'
import { template as ticketCancelledTemplate } from './ticket-cancelled'
import { template as eventInvitationTemplate } from './event-invitation'
import { template as staffLoginVerifyTemplate } from './staff-login-verify'
import { template as profileCompletionTemplate } from './profile-completion'
import { template as artistInquiryTemplate } from './artist-inquiry'
import { template as inquiryConfirmationTemplate } from './inquiry-confirmation'
import { template as adminBroadcastTemplate } from './admin-broadcast'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'referral-invite': referralInviteTemplate,
  'group-join-request': groupJoinRequestTemplate,
  'content-report': contentReportTemplate,
  'ticket-confirmation': ticketConfirmationTemplate,
  'ticket-cancelled': ticketCancelledTemplate,
  'event-invitation': eventInvitationTemplate,
  'staff-login-verify': staffLoginVerifyTemplate,
  'profile-completion': profileCompletionTemplate,
  'artist-inquiry': artistInquiryTemplate,
  'inquiry-confirmation': inquiryConfirmationTemplate,
  'admin-broadcast': adminBroadcastTemplate,
}
