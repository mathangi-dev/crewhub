import { MAX_ABSENCES, GRACE_MS } from "./money"
// Bump TERMS_VERSION when the wording changes: every volunteer then has to agree again at their next login.
export const TERMS_VERSION = "1.0"
export const VOLUNTEER_TERMS: [string, string][] = [
  ["Correct information", "The details in my profile (name, city, skills, availability and bank details) are true and up to date. Wrong or fake details can lead to rejection or suspension."],
  ["Apply only if I can attend", "I will apply only for roles I can really do, and I will reach the venue on time for my shift."],
  ["Attendance", "The organizer marks my check in and check out. I must complete BOTH to be treated as present."],
  ["Absence", `If I do not complete check in and check out, or the organizer marks me absent, I am absent and get no pay for that event. This is applied automatically ${GRACE_MS / 3600000} hours after the event ends.`],
  ["Suspension", `${MAX_ABSENCES} absences automatically suspend my account and cancel my upcoming applications. Only the admin can reinstate it.`],
  ["Cancelling", "If I cannot attend, I will cancel my application as early as possible so someone else can take the role."],
  ["Payment", "I am paid by the admin after the event ends, at the rate shown for my role, only if I was present and my bank details are saved and correct. Wrong bank details can delay my payment."],
  ["Conduct", "I will follow the organizer's and admin's instructions, behave professionally, stay sober on duty, respect everyone at the event, and keep event information private. I will not take money from guests or organizers outside CrewHub."],
  ["Admin decisions", "The admin may reject, suspend or remove me for false information, misconduct or repeated absence."],
  ["My data", "The organizer of an event I am accepted for can see my name, city and skills. My bank account number is stored encrypted and used only to pay me."],
]
