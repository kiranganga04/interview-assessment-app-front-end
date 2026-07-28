/**
 * Narration scripts for the in-app "Watch overview" tours, one per dashboard role.
 *
 * Each step is { target, title, text }:
 *   - `target` matches a `data-tour="..."` attribute on the dashboard; null = a centered
 *     intro/outro slide (no spotlight).
 *   - `title` is the caption heading.
 *   - `text` is the spoken narration (kept plain — no markup — because it is read aloud by the
 *     browser's speech synthesizer and also shown as the caption).
 *
 * Narration style: SIMPLE, plain Indian English. Short sentences, everyday words, one idea at a
 * time — so it is easy to follow when spoken aloud (the tour prefers an en-IN voice) and easy to
 * read as a caption. Each step says what the section is, why it matters, and what to do with it.
 */

export const RECRUITER_TOUR = [
  {
    target: null,
    title: 'Welcome to your pipeline',
    text:
      'Welcome to your recruiter dashboard. In the next minute, I will show you each part of this page in simple steps — what it means, and how to use it.'
  },
  {
    target: 'status',
    title: 'Interviews by status',
    text:
      'This is Interviews by status. The ring shows all your interviews by stage — scheduled, in progress, awaiting feedback, completed, and cancelled. Click any part of the ring, or any item in the list, to download those interviews as an Excel file.'
  },
  {
    target: 'kpi',
    title: 'Your headline numbers',
    text:
      'These are your main numbers. They show how many interviews are yours, how many are today, how many are waiting for panel feedback, and how many are overdue. It is a quick health check of your pipeline.'
  },
  {
    target: 'decision',
    title: 'Ready for your decision',
    text:
      'Ready for your decision shows candidates whose panel feedback is already done. The interview is over. Now it needs your decision. Click Review to open it and add your recommendation.'
  },
  {
    target: 'overdue',
    title: 'Overdue',
    text:
      'Overdue shows scheduled interviews whose date is already past, but they were never finished. These are easy to miss, so clear them first. Open each one and either complete it or reschedule it.'
  },
  {
    target: 'upcoming',
    title: 'Upcoming this week',
    text:
      'Upcoming this week shows all interviews in the next seven days, with the candidate, the panel member, and the level. Use it to see what is coming and to keep every slot ready.'
  },
  {
    target: 'agenda',
    title: 'Today’s Agenda',
    text:
      'This is Today’s Agenda. It shows every interview for today, in time order. It is your simple plan for the day. Click any row to open that interview.'
  },
  {
    target: 'monthly',
    title: 'Monthly Interviews',
    text:
      'Monthly Interviews shows how many interviews happened in the last six months, so you can see the trend. Click any month’s bar to download that month in Excel, or use Download CSV for the full list.'
  },
  {
    target: null,
    title: 'That’s your overview',
    text:
      'That is your full dashboard. First clear Overdue and Ready for your decision. Then use Today’s Agenda and Upcoming to stay ready. You can play this tour again any time from the Watch overview button.'
  }
];

export const ADMIN_TOUR = [
  {
    target: null,
    title: 'Welcome to the admin overview',
    text:
      'Welcome to the admin dashboard. This page gives you the full picture for the whole organization — interviews, team workload, user accounts, and data quality. Let me show you each part.'
  },
  {
    target: 'status',
    title: 'Interviews by status',
    text:
      'Interviews by status shows every interview in the organization, by stage — scheduled, in progress, awaiting feedback, completed, and cancelled. Click any part of the ring, or any item in the list, to download those interviews in Excel.'
  },
  {
    target: 'kpi',
    title: 'Organization at a glance',
    text:
      'These numbers give you the organization at a glance — total interviews, how many candidates and interviewers are in the system, and how many interviews are today.'
  },
  {
    target: 'useradmin',
    title: 'User Administration',
    text:
      'User Administration shows your accounts by role — admins, recruiters, and panel members — and marks any accounts that are switched off. Click Manage to add people or change their access.'
  },
  {
    target: 'workload',
    title: 'Recruiter Workload',
    text:
      'Recruiter Workload shows how interviews are shared across your recruiters, with active counts. Use it to spot when one recruiter has too much work and another has free time.'
  },
  {
    target: 'calibration',
    title: 'Calibration Alerts',
    text:
      'Calibration Alerts shows panel members whose average rating is far from the overall average — too strict or too easy. It is an early sign that scoring may need balancing, so every candidate is judged fairly.'
  },
  {
    target: 'hygiene',
    title: 'Data Hygiene',
    text:
      'Data Hygiene lists items to clean up — interviews with no owner, interviewers with no linked account, and how much of your skill list is active. Clean data keeps your reports correct.'
  },
  {
    target: 'agenda',
    title: 'Today’s Agenda',
    text:
      'Today’s Agenda shows every interview happening in the organization today, in time order. It is your live view of what the whole team is doing right now.'
  },
  {
    target: 'monthly',
    title: 'Monthly Interviews',
    text:
      'Monthly Interviews shows interview volume for the whole organization over the last six months, so you can see the hiring trend. Click any month’s bar to download that month in Excel, or use Download CSV for the full list.'
  },
  {
    target: null,
    title: 'That’s the admin overview',
    text:
      'That is the full admin overview — interviews, people, calibration, data quality, and trends, all in one place. You can play this tour again any time from the Watch overview button.'
  }
];

export const PANEL_TOUR = [
  {
    target: null,
    title: 'Welcome to your panel dashboard',
    text:
      'Welcome to your panel dashboard. This is your own view — what you need to join next, what is waiting for your feedback, and your past interviews. Here is a quick tour.'
  },
  {
    target: 'status',
    title: 'Interviews by status',
    text:
      'This is Interviews by status. It shows all interviews given to you, by stage — scheduled, in progress, awaiting feedback, completed, and cancelled. Click any part of the ring, or any item in the list, to download those interviews in Excel.'
  },
  {
    target: 'kpi',
    title: 'Your numbers',
    text:
      'These are your main numbers — how many interviews you still need to join, how many are waiting for your feedback, how many you have already submitted, and your total.'
  },
  {
    target: 'upcoming',
    title: 'Upcoming interviews',
    text:
      'Upcoming interviews are the ones you still need to take. When it is time, click Join meeting to open the meeting link directly. You can also open the candidate’s resume here — click Resume to read it, or the download button to save it — so you are ready before you join.'
  },
  {
    target: 'feedback',
    title: 'Awaiting my feedback',
    text:
      'Awaiting my feedback shows interviews you have already taken but not yet scored. Click Add feedback to give your rating, or Continue if you saved a draft. The candidate’s resume is also here. Try to keep this section empty.'
  },
  {
    target: 'monthly',
    title: 'My Monthly Interviews',
    text:
      'My Monthly Interviews shows how many interviews you took in the last six months, so you can see your activity trend. Click any month’s bar to download that month in Excel, or use Download CSV for your full list.'
  },
  {
    target: 'summary',
    title: 'Your summary',
    text:
      'The Summary panel gives a quick review — your average rating, how many you have taken, how many were cancelled, and how many are still open. It is a simple view of your activity.'
  },
  {
    target: null,
    title: 'That’s your dashboard',
    text:
      'That is your panel dashboard. Join what is next, clear anything waiting for your feedback, check resumes before you join, and see your trend in Monthly Interviews. You can play this tour again any time from the Watch overview button.'
  }
];
