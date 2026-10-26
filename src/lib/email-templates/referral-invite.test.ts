import { describe, expect, it } from 'vitest'
import { referralInviteSubject, template } from './referral-invite'

describe('referral subject consistency', () => {
  it('uses the same saved subject for the email subject and heading', () => {
    const data = { inviterName: 'Ainsley Burrows', customSubject: 'Baltimore Is Joining Planet. Is Your Business?' }
    expect(referralInviteSubject(data)).toBe(data.customSubject)
    expect(template.subject(data)).toBe(referralInviteSubject(data))
  })

  it('uses the existing default when no custom subject is saved', () => {
    const data = { inviterName: 'Ainsley Burrows', customSubject: '  ' }
    expect(referralInviteSubject(data)).toBe(referralInviteSubject({ inviterName: data.inviterName }))
    expect(template.subject(data)).toBe(referralInviteSubject(data))
  })
})
describe('referral default heading', () => {
  it('reads "From [sender name]"', () => {
    expect(referralInviteSubject({ inviterName: 'Ainsley Burrows' })).toBe('From Ainsley Burrows')
  })
})
