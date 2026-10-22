This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Setup

1. Copy the Supabase keys into `.env.local` (see the placeholders in that file):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and, for the admin
   API routes, `SUPABASE_SERVICE_ROLE_KEY`.
2. Run the database files in Supabase Dashboard → SQL Editor, in this order:
   `supabase/schema.sql` (new database only), then the files in
   `supabase/migrations/` that have not been run yet.
3. **If entries show up twice in the passbook**, run
   `supabase/migrations/fix_double_passbook_entries.sql` once. It removes the
   duplicate trigger set, deletes the duplicate rows already written and adds
   a unique `source_key` so it cannot happen again. It is safe to re-run.
4. `npm install` then `npm run dev` (port 3002).

### Maturity payouts

The **Maturity** page lists FD / RD / DRD / MIS accounts maturing within 30 days.
*Pay Maturity* (also on the deposit page) credits the interest, records any
deduction, debits the payout and closes the account; the *Paid out* tab shows
what was paid, when and how. Paying before the maturity date records a
premature closure. The button needs the *Withdrawals* permission.

### Editing deposits and loans

Both have an *Edit* button on their page, list card and the member profile.
Changing a deposit's amount, member, type or date corrects its opening
passbook entry and balance. Loan terms can be changed until the first EMI is
paid; on a disbursed loan the EMI schedule is regenerated from the
disbursement date.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
