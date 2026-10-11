/**
 * The words this app uses for the request a seeker sends about a listing. Display only: the stored
 * statuses and the transitions in mcp.json are unchanged, so the labels below are not the data.
 */

/**
 * Property wording. "Inspection request" is the main alternative (for example "Book an inspection")
 * if the owner would rather be asked for a viewing than a general enquiry.
 */
export const REQUEST = {
  noun: 'enquiry',
  plural: 'enquiries',
  title: 'Enquiries',
  verb: 'Enquire',
  sent: 'Enquiry sent',
} as const

/** What each stored request status is called on screen. */
export const REQUEST_STATUS_LABEL = {
  pending: 'New',
  accepted: 'Inspection booked / In contact',
  declined: 'Declined',
  completed: 'Closed',
  cancelled: 'Withdrawn',
} as const

/** The label for a stored status. An unknown status is shown as stored rather than hidden. */
export function requestStatusLabel(value: string): string {
  return (REQUEST_STATUS_LABEL as Record<string, string>)[value] ?? value
}
