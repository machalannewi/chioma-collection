// Every piece in the collection, and the case study each one opens.
// Pure data (no DOM): read on the server for routes and metadata, and in the browser.
//
// focus: two points of interest on the artwork, [x, y] as fractions,
//        used for the close-up crops on the work wall and case study.
// rows:  optional per-section image rows; see DEFAULT_ROWS in CaseStudy.tsx.

import type { ViewName } from './art';

export interface Section {
  id: string;
  label: string;
  title: string;
  body: string[];
  /** Image rows under the section, by view name. Defaults per section id live in CaseStudy. */
  rows?: ViewName[][];
}

export interface Work {
  slug: string;
  no: string;
  kind: 'UI' | 'Thread';
  title: string;
  note: string;
  focus: [number, number][];
  intro: string;
  meta: Record<string, string>;
  sections: Section[];
}

export interface Portrait { slug: 'portrait'; title: string; note: string }

export const SITE = {
  name: 'Chioma',
  role: 'UI/UX designer & embroidery artist',
  email: 'hello@chioma.studio',
  city: 'Lagos',
  timeZone: 'Africa/Lagos',
};

export const WORKS: Work[] = [
  {
    slug: 'ledger', no: '01', kind: 'UI', title: 'Ledger', note: 'Personal finance app',
    focus: [[0.5, 0.33], [0.55, 0.7]],
    intro: 'A personal finance app that makes money feel calm instead of loud.',
    meta: { Discipline: 'UI/UX', Year: '2025', Role: 'Product design · Research', Scope: 'Mobile app · Prototype · Usability testing' },
    sections: [
      { id: 'overview', label: 'Overview', title: 'Money, without the noise.', body: [
        'Ledger is a concept banking app for young professionals who want to know where they stand without wading through charts.',
        'The home screen answers one question first — “how much can I spend?” — and lets everything else wait a scroll away.',
      ] },
      { id: 'challenge', label: 'Challenge', title: 'Too many numbers, too little meaning.', body: [
        'In interviews, people described their banking apps as “stressful” and “like a spreadsheet.” Most only ever checked one figure.',
        'The brief was to keep the depth for those who want it while making the everyday glance feel reassuring.',
      ] },
      { id: 'approach', label: 'Approach', title: 'One number, then the story behind it.', body: [
        'A single balance card leads, with a gentle week-at-a-glance chart and plain-language transactions underneath.',
        'Quick actions sit within thumb’s reach, and colour is reserved for what needs attention — a spend spike, a payday.',
      ] },
      { id: 'outcome', label: 'Outcome', title: 'Checked in seconds, trusted for longer.', body: [
        'In prototype testing, people found their spendable balance in under three seconds and described the app as “quiet.”',
        'The component set became the starting point for Kit, the design system later in this collection.',
      ] },
    ],
  },
  {
    slug: 'wildflower', no: '02', kind: 'Thread', title: 'Wildflower', note: '6" hoop, cotton floss',
    focus: [[0.42, 0.36], [0.56, 0.62]],
    intro: 'A six-inch meadow, worked in lazy daisies, French knots and back stitch.',
    meta: { Discipline: 'Embroidery', Year: '2025', Materials: 'Cotton floss on linen', Size: '6" beech hoop' },
    sections: [
      { id: 'overview', label: 'Overview', title: 'A meadow you can hold.', body: [
        'Wildflower began as a pencil sketch of the weeds growing along my street, redrawn until every stem leaned a different way.',
        'It is the piece I return to when I want to remember why I started stitching.',
      ] },
      { id: 'challenge', label: 'Challenge', title: 'Loose, but not messy.', body: [
        'Wild plants never line up, but a hoop full of random stitches quickly turns to noise.',
        'The work was in finding a rhythm: tall stems first, then flowers in threes, then the small knots that tie it together.',
      ] },
      { id: 'approach', label: 'The stitch', title: 'Five stitches, one palette.', body: [
        'Stems are back-stitched in two strands, leaves in satin stitch, petals in lazy daisy, centres in French knots.',
        'The palette is limited to six colours so the eye reads the meadow as one thing.',
      ] },
      { id: 'outcome', label: 'Outcome', title: 'Framed in its own hoop.', body: [
        'The back is finished with felt so it can hang as it is, hoop and all.',
        'A pattern version is in progress for people who want to stitch their own.',
      ] },
    ],
  },
  {
    slug: 'haven', no: '03', kind: 'UI', title: 'Haven', note: 'Booking dashboard',
    focus: [[0.45, 0.5], [0.78, 0.66]],
    intro: 'A booking dashboard that lets small guesthouses see the whole week at a glance.',
    meta: { Discipline: 'UI/UX', Year: '2024', Role: 'UX · UI · Design system', Scope: 'Web app · Companion mobile view' },
    sections: [
      { id: 'overview', label: 'Overview', title: 'The front desk, on one screen.', body: [
        'Haven is a dashboard for guesthouses with five to twenty rooms, run by people who are also cooking breakfast.',
        'It puts tonight, arrivals and occupancy at the top, and the week’s bookings in a calendar you can read from across the room.',
      ] },
      { id: 'challenge', label: 'Challenge', title: 'Paper diaries were winning.', body: [
        'Owners kept going back to their notebooks because existing tools buried the calendar under menus.',
        'Haven had to be faster than a pen.',
      ] },
      { id: 'approach', label: 'Approach', title: 'Colour as a language.', body: [
        'Each room type has a colour that follows it everywhere — calendar, list, invoice — so guests can be found without reading.',
        'A companion mobile view handles the one task owners do on the go: confirming a booking.',
      ] },
      { id: 'outcome', label: 'Outcome', title: 'Fewer double bookings.', body: [
        'Pilot guesthouses retired their paper diaries within a month.',
        'The colour system now carries into receipts and the guest-facing booking page.',
      ] },
    ],
  },
  {
    slug: 'monogram', no: '04', kind: 'Thread', title: 'Monogram', note: 'Gold on bottle green',
    focus: [[0.5, 0.5], [0.3, 0.7]],
    intro: 'A single gold letter, satin-stitched as a wedding keepsake.',
    meta: { Discipline: 'Embroidery', Year: '2024', Materials: 'Rayon & cotton floss on velvet-weight cotton', Size: '6" hoop' },
    sections: [
      { id: 'overview', label: 'Overview', title: 'One letter, done properly.', body: [
        'A commission for a couple’s first anniversary: their shared initial, set in a serif and wreathed in leaves.',
        'Monograms are where embroidery and type design meet, which makes them my favourite kind of brief.',
      ] },
      { id: 'challenge', label: 'Challenge', title: 'Satin stitch hides nothing.', body: [
        'A large satin-stitched letter shows every uneven thread, and dark fabric shows every mistake twice.',
        'The curves of the C had to stay smooth while the thread direction turned with them.',
      ] },
      { id: 'approach', label: 'The stitch', title: 'Padding first.', body: [
        'The letter is padded with split stitch, then covered in angled satin stitch so it catches light like metal.',
        'The wreath is kept small and soft — sage leaves, blush knots — so the letter stays the hero.',
      ] },
      { id: 'outcome', label: 'Outcome', title: 'A heirloom, not a decoration.', body: [
        'Delivered framed, with a note on the thread colours so it can be matched in years to come.',
        'Monogram commissions open twice a year.',
      ] },
    ],
  },
  {
    slug: 'mise', no: '05', kind: 'UI', title: 'Mise', note: 'Recipe app',
    focus: [[0.33, 0.33], [0.7, 0.42]],
    intro: 'A recipe app that cooks alongside you, one step and one timer at a time.',
    meta: { Discipline: 'UI/UX', Year: '2024', Role: 'Product design · Interaction', Scope: 'Mobile app · Cooking mode' },
    sections: [
      { id: 'overview', label: 'Overview', title: 'Built for messy hands.', body: [
        'Mise is a recipe app designed for the moment you are actually cooking — sauce on your fingers, pot about to boil.',
        'Every recipe has a cooking mode: one step per screen, big type, timers that start themselves.',
      ] },
      { id: 'challenge', label: 'Challenge', title: 'Recipes are written for reading.', body: [
        'Most recipe screens are long scrolls of text that are hard to follow mid-stir.',
        'People told us they lost their place, skipped steps, and burnt the base of their jollof more than once.',
      ] },
      { id: 'approach', label: 'Approach', title: 'One step, one action.', body: [
        'Steps were rewritten into single actions, each with its own ingredients and timer.',
        'The cooking mode uses a dark screen and large controls you can tap with a knuckle.',
      ] },
      { id: 'outcome', label: 'Outcome', title: 'Fewer burnt pots.', body: [
        'Testers finished recipes with fewer missed steps and asked for cooking mode on every recipe.',
        'The step format is now a template for contributors writing new recipes.',
      ] },
    ],
  },
  {
    slug: 'dusk', no: '06', kind: 'Thread', title: 'Hills at dusk', note: 'Seed & running stitch',
    focus: [[0.6, 0.38], [0.4, 0.7]],
    intro: 'A landscape built from thousands of seed stitches, layered like evening light.',
    meta: { Discipline: 'Embroidery', Year: '2025', Materials: 'Cotton floss on cotton-linen', Size: '6" hoop' },
    sections: [
      { id: 'overview', label: 'Overview', title: 'Painting with tiny stitches.', body: [
        'Hills at dusk is a study in texture: each hill is filled with seed stitches in a single colour, and the light comes from density alone.',
        'It took longer than any other piece in this collection.',
      ] },
      { id: 'challenge', label: 'Challenge', title: 'Depth without shading.', body: [
        'Thread cannot blend like paint, so distance had to come from colour steps and how tightly stitches are packed.',
        'Too even and it looks printed; too random and the hills lose their shape.',
      ] },
      { id: 'approach', label: 'The stitch', title: 'Back to front.', body: [
        'The far hills were stitched first in ochre, each nearer hill overlapping the last in a deeper green.',
        'A satin-stitched sun and running-stitch sky keep the top of the hoop calm.',
      ] },
      { id: 'outcome', label: 'Outcome', title: 'A series in the making.', body: [
        'This became the first of a planned set of four landscapes, one for each time of day.',
        'Prints of the finished hoop are available on request.',
      ] },
    ],
  },
  {
    slug: 'bloom', no: '07', kind: 'UI', title: 'Bloom', note: 'Wellness onboarding',
    focus: [[0.5, 0.3], [0.5, 0.72]],
    intro: 'An onboarding flow for a wellness app, designed to slow people down.',
    meta: { Discipline: 'UI/UX', Year: '2025', Role: 'UX · UI · Illustration direction', Scope: 'Onboarding · Prototype · Motion' },
    sections: [
      { id: 'overview', label: 'Overview', title: 'Start with a breath.', body: [
        'Bloom is a meditation app whose onboarding begins with a breathing exercise instead of a sign-up form.',
        'The prototype was built to test whether a slower first minute made people more likely to come back.',
      ] },
      { id: 'challenge', label: 'Challenge', title: 'Onboarding that feels like work.', body: [
        'Wellness apps often open with permissions, plans and paywalls — the opposite of calm.',
        'The goal was to earn the sign-up by delivering a moment of value first.',
      ] },
      { id: 'approach', label: 'Approach', title: 'Soft shapes, few words.', body: [
        'Each screen carries one sentence, a gentle illustration and a single button.',
        'Motion follows a four-second breathing rhythm, so even the transitions slow you down.',
      ] },
      { id: 'outcome', label: 'Outcome', title: 'More people stayed.', body: [
        'In testing, more people completed onboarding when the breath came first than when the form did.',
        'The illustration style now runs through the whole app.',
      ] },
    ],
  },
  {
    slug: 'sampler', no: '08', kind: 'Thread', title: 'Sampler', note: 'Cross-stitch on aida',
    focus: [[0.5, 0.26], [0.5, 0.58]],
    intro: 'A cross-stitch sampler that spells out the two crafts I practise.',
    meta: { Discipline: 'Embroidery', Year: '2023', Materials: 'Cotton floss on 14-count aida', Size: '8 × 10"' },
    sections: [
      { id: 'overview', label: 'Overview', title: 'Pixels, before screens.', body: [
        'Cross-stitch was the first grid I ever designed for, long before I opened a design tool.',
        'This sampler stitches “UI / UX” in the same way samplers once stitched alphabets — as practice, and as a record.',
      ] },
      { id: 'challenge', label: 'Challenge', title: 'Designing on a grid.', body: [
        'Every letter and flower had to work at the size of a single cross, with no curves to hide behind.',
        'It is the same constraint as an icon set, just slower.',
      ] },
      { id: 'approach', label: 'The stitch', title: 'Charted first.', body: [
        'The pattern was drawn as a chart, cell by cell, before a single thread was cut.',
        'The border is stitched in madder red — the same colour as the curtain on this site.',
      ] },
      { id: 'outcome', label: 'Outcome', title: 'Where the two crafts meet.', body: [
        'It hangs above my desk, and the chart became the cross-stitched cloth of this site’s curtain.',
        'The pattern is free to download for anyone who wants to stitch their own.',
      ] },
    ],
  },
  {
    slug: 'kit', no: '09', kind: 'UI', title: 'Kit', note: 'Design system',
    focus: [[0.3, 0.3], [0.5, 0.75]],
    intro: 'A design system that keeps a growing product team speaking one visual language.',
    meta: { Discipline: 'UI/UX', Year: '2025', Role: 'Design systems lead', Scope: 'Tokens · Components · Documentation' },
    sections: [
      { id: 'overview', label: 'Overview', title: 'One kit, many products.', body: [
        'Kit is the design system behind Ledger, Haven and two internal tools — tokens, components and the reasoning behind them.',
        'It is documented in plain language so engineers and designers read the same page.',
      ] },
      { id: 'challenge', label: 'Challenge', title: 'Seventeen shades of “primary”.', body: [
        'An audit found seventeen different button styles and no shared colour names across three products.',
        'Every new screen was being designed from scratch.',
      ] },
      { id: 'approach', label: 'Approach', title: 'Tokens first, components second.', body: [
        'Colour, type and spacing were reduced to a small set of named tokens before any component was redrawn.',
        'Components were then rebuilt from those tokens, with usage notes and “don’t” examples beside each one.',
      ] },
      { id: 'outcome', label: 'Outcome', title: 'Faster, and more alike.', body: [
        'New screens now start from Kit, and the button count is down to three.',
        'Version 2.4 added dark mode, which took a week instead of a quarter.',
      ] },
    ],
  },
  {
    slug: 'knots', no: '10', kind: 'Thread', title: 'Knots', note: 'French knot study',
    focus: [[0.5, 0.53], [0.66, 0.4]],
    intro: 'A study in colour, worked entirely in French knots.',
    meta: { Discipline: 'Embroidery', Year: '2024', Materials: 'Perle cotton on linen', Size: '6" hoop' },
    sections: [
      { id: 'overview', label: 'Overview', title: 'A gradient, by hand.', body: [
        'Knots is a colour study: concentric rings of French knots moving from indigo to madder red.',
        'It is what a colour ramp in a design system looks like when you stitch it.',
      ] },
      { id: 'challenge', label: 'Challenge', title: 'Hundreds of identical knots.', body: [
        'French knots are easy to make once and hard to make the same a thousand times.',
        'Any change in tension shows up as a lumpy ring.',
      ] },
      { id: 'approach', label: 'The stitch', title: 'Ring by ring.', body: [
        'Each ring uses one colour and one wrap count, stitched from the centre out to keep the spacing honest.',
        'The palette steps match the colour tokens in Kit.',
      ] },
      { id: 'outcome', label: 'Outcome', title: 'Calm, from a distance.', body: [
        'Up close it is texture; from across the room it reads as a single soft target.',
        'It is now a workshop piece for people learning French knots.',
      ] },
    ],
  },
];

export const PORTRAIT: Portrait = { slug: 'portrait', title: 'Chioma', note: 'Portrait — swap in a photo' };

export const workBySlug = (slug: string): Work | Portrait | null => WORKS.find((w) => w.slug === slug) ?? (slug === PORTRAIT.slug ? PORTRAIT : null);
export const workURL = (work: Pick<Work, 'slug'>) => `/work/${work.slug}/`;
