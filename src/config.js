// Realms, offerings, moods. Coordinates are in a 1000 x 667 logical stage.
export const W = 1000;
export const H = 667;
export const P = W / 256; // one "art pixel", matching the temple artwork's pixel grid

export const REALMS = [
  // Sanctuaries
  { id: 'gate', group: 'Sanctuaries', name: 'Temple Gate', zh: '山门', image: '/scenes/temple-gate.webp',
    blurb: 'The courtyard outside the Guan Yin temple. Step through the doors to go inside.',
    walk: [30, 970, 590, 655] },
  { id: 'hall', group: 'Sanctuaries', name: 'Guan Yin Hall', zh: '观音殿', image: '/scenes/guanyin-hall.webp', place: 'hall',
    blurb: 'Offer flowers before the Thousand-Armed Guan Yin, the one who hears the cries of the world.',
    walk: [150, 850, 585, 660] },
  { id: 'chapel', group: 'Sanctuaries', name: 'Chapel of Light', mark: '✝', place: 'chapel',
    blurb: 'Light a candle and sit in the quiet beneath the stained glass.',
    walk: [80, 920, 520, 655] },
  { id: 'masjid', group: 'Sanctuaries', name: 'Prayer Hall', mark: '☾', place: 'masjid',
    blurb: 'A calm, carpeted hall facing the mihrab. Make a dua for what weighs on you.',
    walk: [80, 920, 520, 655] },
  { id: 'mandir', group: 'Sanctuaries', name: 'Mandir', mark: 'ॐ', place: 'mandir',
    blurb: 'Bells, marigolds and lamplight. Offer a diya or flowers at the shrine.',
    walk: [80, 920, 520, 655] },
  { id: 'tree', group: 'Sanctuaries', name: 'Wishing Tree', mark: '❀', place: 'tree',
    blurb: 'For every belief or none. Tie a ribbon and let the wind take the worry.',
    walk: [60, 940, 520, 655] },
  // Hangouts
  { id: 'bar', group: 'Hangouts', name: 'Gossip Bar', mark: '♪',
    blurb: 'Pull up a stool and vent about the boss. The arcade cabinet in the corner takes no coins.',
    walk: [60, 940, 540, 655] },
  { id: 'bamboo', group: 'Hangouts', name: 'Bamboo Grove', zh: '竹林',
    blurb: 'Walk it off among the stalks. The wind does the talking here.',
    walk: [60, 940, 490, 650] },
  { id: 'pond', group: 'Hangouts', name: 'Lotus Pond', zh: '莲池',
    blurb: "Sit at the water's edge and watch the koi turn slow circles.",
    walk: [60, 940, 562, 650] },
  { id: 'bridge', group: 'Hangouts', name: 'Lantern Bridge', zh: '灯桥',
    blurb: 'Cross at dusk and leave the workday on the far bank.',
    walk: [60, 940, 500, 650] },
];
export const realmById = (id) => REALMS.find((r) => r.id === id) || REALMS[0];

// Where each sanctuary's offerings are made, and what can be offered there.
export const PLACES = {
  hall: {
    name: 'Guan Yin Hall', action: 'Offer flowers', title: 'Offer flowers to Guan Yin',
    sub: 'Choose a flower. It is placed on the altar for the circle to see.',
    done: 'Your flowers are on the altar', doneSub: 'Bow three times, breathe slowly, and let the day loosen its grip.',
    blessing: '南無觀世音菩薩', blessingEn: 'Namo Guan Shi Yin Pusa · Homage to the one who hears the cries of the world',
    placeholder: 'For the deadline on Friday. For patience with my team.',
    verb: 'Offered', items: [
      { id: 'lotus', name: 'Lotus', note: 'Purity that rises from the mud' },
      { id: 'chrys', name: 'Chrysanthemum', note: 'Steadfast through the cold season' },
      { id: 'orchid', name: 'Orchid', note: 'Quiet grace and integrity' },
      { id: 'peony', name: 'Peony', note: 'Wishes for wellbeing' },
      { id: 'plum', name: 'Plum blossom', note: 'Blooms through hardship' },
    ] },
  chapel: {
    name: 'Chapel of Light', action: 'Light a candle', title: 'Light a candle',
    sub: 'Choose a candle. It stays lit on the stand for the circle to see.',
    done: 'Your candle is lit', doneSub: 'Sit a moment. Let the flame hold the prayer for you.',
    blessing: 'Grant me the serenity to accept the things I cannot change,',
    blessingEn: 'courage to change the things I can, and wisdom to know the difference.',
    placeholder: 'For strength this week. For my manager to understand.',
    verb: 'Lit', items: [
      { id: 'white', name: 'White candle', note: 'For peace' },
      { id: 'red', name: 'Red candle', note: 'For courage and love' },
      { id: 'blue', name: 'Blue candle', note: 'For calm and healing' },
      { id: 'gold', name: 'Gold candle', note: 'In thanksgiving' },
    ] },
  masjid: {
    name: 'Prayer Hall', action: 'Make a dua', title: 'Make a dua',
    sub: 'Choose what you are asking for. Each dua lights a lamp in the hall.',
    done: 'Your dua is made', doneSub: 'Ameen. May it be eased for you.',
    blessing: 'حَسْبُنَا ٱللَّٰهُ وَنِعْمَ ٱلْوَكِيلُ',
    blessingEn: 'Hasbunallahu wa ni‘mal wakeel · Allah is sufficient for us, and the best disposer of affairs',
    placeholder: 'Make this week easier. Give me sabr with my workload.',
    verb: 'Made a dua for', items: [
      { id: 'ease', name: 'Ease', note: 'That hardship gives way' },
      { id: 'sabr', name: 'Patience', note: 'Sabr through a long week' },
      { id: 'guidance', name: 'Guidance', note: 'For a hard decision' },
      { id: 'shukr', name: 'Gratitude', note: 'For what went right' },
    ] },
  mandir: {
    name: 'Mandir', action: 'Make an offering', title: 'Make an offering at the shrine',
    sub: 'Choose an offering. It is placed before the shrine for the circle to see.',
    done: 'Your offering is at the shrine', doneSub: 'Ring the bell, fold your hands, and breathe.',
    blessing: 'ॐ शान्तिः शान्तिः शान्तिः', blessingEn: 'Om Shanti Shanti Shanti · Peace, peace, peace',
    placeholder: 'For a calm mind before my review.',
    verb: 'Offered', items: [
      { id: 'diya', name: 'Diya', note: 'A lamp against the dark' },
      { id: 'marigold', name: 'Marigolds', note: 'Bright devotion' },
      { id: 'mlotus', name: 'Lotus', note: 'A clear mind' },
      { id: 'fruit', name: 'Fruit', note: 'Gratitude and sharing' },
    ] },
  tree: {
    name: 'Wishing Tree', action: 'Tie a ribbon', title: 'Tie a ribbon on the Wishing Tree',
    sub: 'Pick a colour, write a wish or a worry, and tie it to a branch.',
    done: 'Your ribbon is on the tree', doneSub: 'Watch it flutter. You do not have to carry it alone.',
    blessing: 'Let it go with the wind.', blessingEn: '',
    placeholder: 'Let me stop checking email at midnight.',
    verb: 'Tied', items: [
      { id: 'r-red', name: 'Red ribbon', note: 'Courage', color: '#d7263d' },
      { id: 'r-gold', name: 'Gold ribbon', note: 'Joy', color: '#f2b632' },
      { id: 'r-blue', name: 'Blue ribbon', note: 'Calm', color: '#3fa9f5' },
      { id: 'r-green', name: 'Green ribbon', note: 'Growth', color: '#3bb273' },
      { id: 'r-purple', name: 'Purple ribbon', note: 'Rest', color: '#9b5de5' },
    ] },
};
export const itemOf = (place, id) => (PLACES[place]?.items.find((i) => i.id === id)) || PLACES[place]?.items[0];

export const MOODS = ['Drained', 'Stressed', 'Holding up', 'Calm', 'Grateful'];
export const ROBES = ['#e8a33d', '#2a9d8f', '#e56b8f', '#3f6fd8', '#d7263d', '#8a5cc7'];
export const robe = (h) => ROBES[((h | 0) % ROBES.length + ROBES.length) % ROBES.length];
export const HOMES = [
  { id: 'gate', label: 'Guan Yin Temple' },
  { id: 'chapel', label: 'Chapel' },
  { id: 'masjid', label: 'Prayer Hall' },
  { id: 'mandir', label: 'Mandir' },
  { id: 'tree', label: 'Wishing Tree' },
  { id: 'bar', label: 'Gossip Bar' },
];
export const REACTIONS = [
  { id: 'same', label: 'Same', glyph: '🙋' },
  { id: 'hug', label: 'Hug', glyph: '🫂' },
  { id: 'lol', label: 'LOL', glyph: '😂' },
  { id: 'fire', label: 'Quit already', glyph: '🔥' },
];
