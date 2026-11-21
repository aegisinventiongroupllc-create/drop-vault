export const SIGNUP_OWNER = 'admin@dttmediallc.com';
export const SIGNUP_STEPS = ['account_selection', 'creator_details', 'creator_agreement', 'waitlist_status', 'waitlist_join', 'ticket_save'] as const;
export type SignupStep = typeof SIGNUP_STEPS[number];
export type SignupEvent = 'started' | 'confirmed' | 'setup_saved' | 'waitlist_joined' | 'issue';
export interface SignupSnapshot { userId: string; email: string; accountType: string | null; createdAt: string; confirmed: boolean; creatorDetailsSaved: boolean; waitlistJoined: boolean }
const STEP_NAMES: Record<SignupStep, string> = { account_selection: 'Choosing Creator or Customer', creator_details: 'Saving creator category and content labels', creator_agreement: 'Saving the creator agreement', waitlist_status: 'Loading the customer waiting list', waitlist_join: 'Joining the customer waiting list', ticket_save: 'Saving the customer ticket to the device' };
export function signupProgressNotice(account: SignupSnapshot, event: SignupEvent, step?: SignupStep) {
  if (!Number.isFinite(Date.parse(account.createdAt)) || Date.parse(account.createdAt) < Date.parse('2026-11-21T23:10:00Z')) return null;
  let status: string;
  let next: string;
  if (event === 'started') {
    status = 'Customer account created'; next = 'The customer has started signing up. Email confirmation and waiting-list joining may still be incomplete.';
  } else if (event === 'confirmed') {
    if (!account.confirmed) return null;
    status = 'Email confirmed successfully'; next = 'The account can sign in. Account setup may still be incomplete.';
  } else if (event === 'setup_saved') {
    if (account.accountType !== 'creator' || !account.creatorDetailsSaved || !account.confirmed) return null;
    status = 'Creator category and content labels saved successfully'; next = 'Initial creator details are saved. Agreements, private identity review and content clearance may still be required. This is not approval to publish.';
  } else if (event === 'waitlist_joined') {
    if (account.accountType !== 'customer' || !account.waitlistJoined || !account.confirmed) return null;
    status = 'Customer joined the waiting list successfully'; next = 'Waiting-list membership is saved. No payment or paid access was granted. Device ticket download is not confirmed by this notice.';
  } else {
    if (!step) return null;
    status = `Help may be needed: ${STEP_NAMES[step]}`;
    next = 'The signed-in browser reported a problem at this step. This is not a verified diagnosis; a temporary connection or device issue may be responsible. Check the account in your administrator dashboard or contact them. They may already have retried successfully.';
  }
  if (account.email.startsWith('agent-test+')) { status = `TEST — ${status}`; next = `This is a temporary automated-check account, not a real signup. ${next}`; }
  return { recipient: SIGNUP_OWNER, templateData: { email: account.email, accountType: account.accountType ?? 'Not selected', status, next, observedAt: new Date().toISOString() }, idempotencyKey: `signup-progress-${account.userId}-${event}-${step ?? 'milestone'}` };
}