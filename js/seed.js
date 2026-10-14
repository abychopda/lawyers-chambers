/**
 * seed.js — two real landmark cases, written once on first run so the
 * library never opens empty.
 *
 * Their holdings are correct in substance. Their exact SCC volume and page
 * numbers were NOT verified against SCC Online or Manupatra before shipping
 * — that's exactly what `example: true` and the "verify the citation" chip
 * in the UI are for. Clear them from the About screen once real entries
 * make them unnecessary.
 */
export const SEED_ENTRIES = [
  {
    type: 'case',
    title: 'Swiss Ribbons Pvt Ltd v. Union of India',
    citation: '(2019) 4 SCC 17',
    court: 'Supreme Court',
    year: '2019',
    subjects: ['IBC / Insolvency', 'Constitutional'],
    tags: [],
    facts: 'The constitutional validity of the Insolvency and Bankruptcy Code, 2016 was challenged, including the treatment of operational versus financial creditors and the bar on promoters under section 29A.',
    issue: 'Whether the IBC, and in particular sections 12A, 29A and the differing treatment of financial and operational creditors, violates Articles 14 and 19(1)(g) of the Constitution.',
    held: 'The Supreme Court upheld the constitutional validity of the IBC in its entirety, including section 29A.',
    ratio: 'The resolution professional performs an administrative, not adjudicatory, role, so natural justice concerns do not attach to that function. The differing treatment of financial and operational creditors rests on an intelligible differentia — their nature of claims differs — so it does not offend Article 14. Section 29A’s bar on defaulting promoters bidding for their own company is a reasonable restriction in the public interest, not arbitrary.',
    note: '',
    source: '',
    starred: false,
    example: true,
  },
  {
    type: 'case',
    title: 'Tata Consultancy Services Ltd v. Cyrus Investments Pvt Ltd',
    citation: '(2021) 9 SCC 449',
    court: 'Supreme Court',
    year: '2021',
    subjects: ['Companies Act 2013', 'Corporate Governance'],
    tags: [],
    facts: 'Cyrus Mistry was removed as Executive Chairman of Tata Sons. His family investment companies alleged oppression and mismanagement under sections 241–242 of the Companies Act, 2013, and the NCLAT had ordered his reinstatement.',
    issue: 'Whether the affairs of Tata Sons were conducted in a manner oppressive to the minority, and whether the NCLAT was right to reinstate Mistry and to hold the conversion to a private company and certain affirmative voting rights in the articles to be illegal.',
    held: 'The Supreme Court set aside the NCLAT’s order. Oppression and mismanagement under sections 241–242 were not made out, Mistry’s removal was not oppressive, and the articles’ affirmative voting rights for certain shareholders were upheld as valid.',
    ratio: 'Removal from a board position, by itself, is not oppression unless it is shown to be part of a course of conduct unfairly prejudicial to the minority’s interests as members. Contractually agreed affirmative voting or veto rights in a company’s articles are not oppressive merely because they favour particular shareholders — they must be read against what the parties actually agreed when they invested.',
    note: '',
    source: '',
    starred: false,
    example: true,
  },
];
