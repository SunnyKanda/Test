const CATS = [
  { id: "colours", pa: "ਰੰਗ", tr: "rang", en: "Colours", emoji: "🎨", c: "#ff3d8b", game: true, sets: [{ items: [
    { pa: "ਲਾਲ", tr: "laal", en: "red", hex: "#e53935", e: "🍎" },
    { pa: "ਨੀਲਾ", tr: "neela", en: "blue", hex: "#1f6feb", e: "🐳" },
    { pa: "ਪੀਲਾ", tr: "peela", en: "yellow", hex: "#ffd21f", e: "🐥" },
    { pa: "ਹਰਾ", tr: "hara", en: "green", hex: "#2fb344", e: "🐸" },
    { pa: "ਸੰਤਰੀ", tr: "santri", en: "orange", hex: "#ff8a00", e: "🥕" },
    { pa: "ਗੁਲਾਬੀ", tr: "gulaabi", en: "pink", hex: "#ff7eb9", e: "🌸" },
    { pa: "ਜਾਮਨੀ", tr: "jaamni", en: "purple", hex: "#8e44ad", e: "🍇" },
    { pa: "ਚਿੱਟਾ", tr: "chitta", en: "white", hex: "#ffffff", e: "🐑" },
    { pa: "ਕਾਲਾ", tr: "kaala", en: "black", hex: "#1d1a1c", e: "🐈‍⬛" },
    { pa: "ਭੂਰਾ", tr: "bhoora", en: "brown", hex: "#8d5524", e: "🐻" },
    { pa: "ਸਲੇਟੀ", tr: "saleti", en: "grey", hex: "#9aa0a6", e: "🐘" },
    { pa: "ਸੁਨਹਿਰੀ", tr: "sunehri", en: "gold", hex: "#d4a017", e: "👑" },
  ] }] },
  { id: "numbers", pa: "ਗਿਣਤੀ", tr: "ginti", en: "Numbers", emoji: "🔢", c: "#ffb627", game: true, sets: [
    { pa: "੧–੧੦", en: "1–10", items: [] }, { pa: "੧੧–੨੦", en: "11–20", items: [] },
  ] },
  { id: "days", pa: "ਦਿਨ", tr: "din", en: "Days", emoji: "📅", c: "#16c2b0", sets: [{ items: [
    { pa: "ਸੋਮਵਾਰ", tr: "somvaar", en: "Monday", e: "🌙" },
    { pa: "ਮੰਗਲਵਾਰ", tr: "mangalvaar", en: "Tuesday", e: "🔴" },
    { pa: "ਬੁੱਧਵਾਰ", tr: "budhvaar", en: "Wednesday", e: "🪐" },
    { pa: "ਵੀਰਵਾਰ", tr: "veervaar", en: "Thursday", e: "⭐" },
    { pa: "ਸ਼ੁੱਕਰਵਾਰ", tr: "shukkarvaar", en: "Friday", e: "✨" },
    { pa: "ਸ਼ਨਿੱਚਰਵਾਰ", tr: "shanichharvaar", en: "Saturday", e: "💫" },
    { pa: "ਐਤਵਾਰ", tr: "aitvaar", en: "Sunday", e: "☀️" },
  ] }] },
  { id: "months", pa: "ਮਹੀਨੇ", tr: "maheene", en: "Months", emoji: "🗓️", c: "#9b5cff", sets: [
    { pa: "ਜਨਵਰੀ…", en: "January…", items: [
      { pa: "ਜਨਵਰੀ", tr: "janvari", en: "January", e: "❄️" },
      { pa: "ਫ਼ਰਵਰੀ", tr: "farvari", en: "February", e: "💝" },
      { pa: "ਮਾਰਚ", tr: "maarch", en: "March", e: "🌱" },
      { pa: "ਅਪ੍ਰੈਲ", tr: "aprail", en: "April", e: "🌷" },
      { pa: "ਮਈ", tr: "mai", en: "May", e: "🐝" },
      { pa: "ਜੂਨ", tr: "joon", en: "June", e: "🌞" },
      { pa: "ਜੁਲਾਈ", tr: "julaai", en: "July", e: "🍦" },
      { pa: "ਅਗਸਤ", tr: "agast", en: "August", e: "🌻" },
      { pa: "ਸਤੰਬਰ", tr: "satambar", en: "September", e: "🍎" },
      { pa: "ਅਕਤੂਬਰ", tr: "aktoobar", en: "October", e: "🍁" },
      { pa: "ਨਵੰਬਰ", tr: "navambar", en: "November", e: "🪔" },
      { pa: "ਦਸੰਬਰ", tr: "dasambar", en: "December", e: "⛄" },
    ] },
    { pa: "ਦੇਸੀ ਮਹੀਨੇ", en: "Desi months", items: [
      { pa: "ਚੇਤ", tr: "chet", en: "Chet · Mar–Apr", e: "🌼" },
      { pa: "ਵਿਸਾਖ", tr: "visaakh", en: "Vaisakh · Apr–May · Vaisakhi", e: "🌾" },
      { pa: "ਜੇਠ", tr: "jeth", en: "Jeth · May–Jun", e: "☀️" },
      { pa: "ਹਾੜ੍ਹ", tr: "haarh", en: "Harh · Jun–Jul", e: "🥭" },
      { pa: "ਸਾਵਣ", tr: "saavan", en: "Saavan · Jul–Aug · Teeyan", e: "🌧️" },
      { pa: "ਭਾਦੋਂ", tr: "bhaadon", en: "Bhadon · Aug–Sep", e: "🌈" },
      { pa: "ਅੱਸੂ", tr: "assu", en: "Assu · Sep–Oct", e: "🌤️" },
      { pa: "ਕੱਤਕ", tr: "kattak", en: "Kattak · Oct–Nov · Diwali", e: "🪔" },
      { pa: "ਮੱਘਰ", tr: "magghar", en: "Maghar · Nov–Dec", e: "🍂" },
      { pa: "ਪੋਹ", tr: "poh", en: "Poh · Dec–Jan · Lohri", e: "🔥" },
      { pa: "ਮਾਘ", tr: "maagh", en: "Maagh · Jan–Feb · Maghi", e: "🪁" },
      { pa: "ਫੱਗਣ", tr: "phaggan", en: "Phaggan · Feb–Mar · Hola", e: "🎨" },
    ] },
  ] },
  { id: "food", pa: "ਫਲ ਤੇ ਸਬਜ਼ੀਆਂ", tr: "phal te sabziaan", en: "Fruit & veg", emoji: "🥭", c: "#7ccf3c", game: true, sets: [
    { pa: "ਫਲ", en: "Fruit", items: [
      { pa: "ਅੰਬ", tr: "amb", en: "mango", e: "🥭" },
      { pa: "ਸੇਬ", tr: "seb", en: "apple", e: "🍎" },
      { pa: "ਕੇਲਾ", tr: "kela", en: "banana", e: "🍌" },
      { pa: "ਅੰਗੂਰ", tr: "angoor", en: "grapes", e: "🍇" },
      { pa: "ਸੰਤਰਾ", tr: "santra", en: "orange", e: "🍊" },
      { pa: "ਤਰਬੂਜ਼", tr: "tarbooz", en: "watermelon", e: "🍉" },
      { pa: "ਨਾਸ਼ਪਾਤੀ", tr: "naashpaati", en: "pear", e: "🍐" },
      { pa: "ਅਨਾਨਾਸ", tr: "anaanaas", en: "pineapple", e: "🍍" },
      { pa: "ਨਿੰਬੂ", tr: "nimboo", en: "lemon", e: "🍋" },
      { pa: "ਸਟ੍ਰਾਬੇਰੀ", tr: "straaberi", en: "strawberry", e: "🍓" },
      { pa: "ਆੜੂ", tr: "aaroo", en: "peach", e: "🍑" },
      { pa: "ਨਾਰੀਅਲ", tr: "naariyal", en: "coconut", e: "🥥" },
    ] },
    { pa: "ਸਬਜ਼ੀਆਂ", en: "Veg", items: [
      { pa: "ਗਾਜਰ", tr: "gaajar", en: "carrot", e: "🥕" },
      { pa: "ਆਲੂ", tr: "aaloo", en: "potato", e: "🥔" },
      { pa: "ਟਮਾਟਰ", tr: "tamaatar", en: "tomato", e: "🍅" },
      { pa: "ਪਿਆਜ਼", tr: "piaaz", en: "onion", e: "🧅" },
      { pa: "ਮੱਕੀ", tr: "makki", en: "corn", e: "🌽" },
      { pa: "ਖੀਰਾ", tr: "kheera", en: "cucumber", e: "🥒" },
      { pa: "ਬੈਂਗਣ", tr: "baingan", en: "aubergine", e: "🍆" },
      { pa: "ਮਿਰਚ", tr: "mirch", en: "chilli", e: "🌶️" },
      { pa: "ਲਸਣ", tr: "lasan", en: "garlic", e: "🧄" },
      { pa: "ਮਟਰ", tr: "matar", en: "peas", e: "🫛" },
      { pa: "ਖੁੰਬ", tr: "khumb", en: "mushroom", e: "🍄" },
      { pa: "ਅਦਰਕ", tr: "adrak", en: "ginger", e: "🫚" },
    ] },
  ] },
  { id: "painti", pa: "ਪੈਂਤੀ", tr: "painti", en: "Alphabet", emoji: "ੳ", c: "#ff7a1a", game: true, sets: [{ items: [] }] },
];

// Numbers 1–20, each with Gurmukhi numerals and something to count.
const NUMS = [
  ["ਇੱਕ", "ikk"], ["ਦੋ", "do"], ["ਤਿੰਨ", "tinn"], ["ਚਾਰ", "chaar"], ["ਪੰਜ", "panj"],
  ["ਛੇ", "chhe"], ["ਸੱਤ", "satt"], ["ਅੱਠ", "atth"], ["ਨੌਂ", "naun"], ["ਦਸ", "das"],
  ["ਗਿਆਰਾਂ", "gyaaraan"], ["ਬਾਰਾਂ", "baaraan"], ["ਤੇਰਾਂ", "teraan"], ["ਚੌਦਾਂ", "chaudaan"], ["ਪੰਦਰਾਂ", "pandraan"],
  ["ਸੋਲ਼ਾਂ", "solaan"], ["ਸਤਾਰਾਂ", "sataaraan"], ["ਅਠਾਰਾਂ", "athaaraan"], ["ਉੱਨੀ", "unni"], ["ਵੀਹ", "veeh"],
];
const COUNTERS = ["🐥", "🦆", "🐞", "🐟", "🍓", "⭐", "🎈", "🐝", "🐠", "🌸"];
const gurmukhiDigits = n => String(n).replace(/\d/g, d => String.fromCharCode(0x0A66 + +d));
NUMS.forEach(([pa, tr], i) => {
  const n = i + 1;
  CATS[1].sets[n <= 10 ? 0 : 1].items.push({ pa, tr, en: String(n), n, num: gurmukhiDigits(n), e: COUNTERS[i % 10] });
});

// Painti: the 35 letters of Gurmukhi, in order, with a first word where one exists.
const PAINTI = [
  ["ੳ", "ਊੜਾ", "oorha", "ਉੱਲੂ", "ullu", "owl", "🦉"],
  ["ਅ", "ਐੜਾ", "airha", "ਅੰਬ", "amb", "mango", "🥭"],
  ["ੲ", "ਈੜੀ", "eerhi", "ਇੱਟ", "itt", "brick", "🧱"],
  ["ਸ", "ਸੱਸਾ", "sassa", "ਸੇਬ", "seb", "apple", "🍎"],
  ["ਹ", "ਹਾਹਾ", "haaha", "ਹਾਥੀ", "haathi", "elephant", "🐘"],
  ["ਕ", "ਕੱਕਾ", "kakka", "ਕਬੂਤਰ", "kabootar", "pigeon", "🕊️"],
  ["ਖ", "ਖੱਖਾ", "khakha", "ਖ਼ਰਗੋਸ਼", "khargosh", "rabbit", "🐇"],
  ["ਗ", "ਗੱਗਾ", "gagga", "ਗਾਂ", "gaan", "cow", "🐄"],
  ["ਘ", "ਘੱਗਾ", "ghagga", "ਘੋੜਾ", "ghorha", "horse", "🐎"],
  ["ਙ", "ਙੰਙਾ", "nganga"],
  ["ਚ", "ਚੱਚਾ", "chachcha", "ਚਿੜੀ", "chirhi", "sparrow", "🐦"],
  ["ਛ", "ਛੱਛਾ", "chhachha", "ਛੱਤਰੀ", "chhatri", "umbrella", "☂️"],
  ["ਜ", "ਜੱਜਾ", "jajja", "ਜਹਾਜ਼", "jahaaz", "aeroplane", "✈️"],
  ["ਝ", "ਝੱਜਾ", "jhajja", "ਝੰਡਾ", "jhanda", "flag", "🚩"],
  ["ਞ", "ਞੰਞਾ", "nyanya"],
  ["ਟ", "ਟੈਂਕਾ", "tainka", "ਟਮਾਟਰ", "tamaatar", "tomato", "🍅"],
  ["ਠ", "ਠੱਠਾ", "thattha", "ਠੰਢ", "thandh", "cold", "❄️"],
  ["ਡ", "ਡੱਡਾ", "dadda", "ਡੱਡੂ", "daddu", "frog", "🐸"],
  ["ਢ", "ਢੱਡਾ", "dhadda", "ਢੋਲ", "dhol", "drum", "🥁"],
  ["ਣ", "ਣਾਣਾ", "naana"],
  ["ਤ", "ਤੱਤਾ", "tatta", "ਤਿਤਲੀ", "titli", "butterfly", "🦋"],
  ["ਥ", "ਥੱਥਾ", "thattha", "ਥਾਲੀ", "thaali", "plate", "🍽️"],
  ["ਦ", "ਦੱਦਾ", "dadda", "ਦੰਦ", "dand", "tooth", "🦷"],
  ["ਧ", "ਧੱਦਾ", "dhadda", "ਧੁੱਪ", "dhupp", "sunshine", "☀️"],
  ["ਨ", "ਨੱਨਾ", "nanna", "ਨੱਕ", "nakk", "nose", "👃"],
  ["ਪ", "ਪੱਪਾ", "pappa", "ਪਤੰਗ", "patang", "kite", "🪁"],
  ["ਫ", "ਫੱਫਾ", "phaphpha", "ਫੁੱਲ", "phull", "flower", "🌸"],
  ["ਬ", "ਬੱਬਾ", "babba", "ਬਿੱਲੀ", "billi", "cat", "🐱"],
  ["ਭ", "ਭੱਬਾ", "bhabba", "ਭਾਲੂ", "bhaaloo", "bear", "🐻"],
  ["ਮ", "ਮੱਮਾ", "mamma", "ਮੋਰ", "mor", "peacock", "🦚"],
  ["ਯ", "ਯੱਯਾ", "yayya", "ਯੋਗਾ", "yoga", "yoga", "🧘"],
  ["ਰ", "ਰਾਰਾ", "raara", "ਰੇਲ", "rail", "train", "🚂"],
  ["ਲ", "ਲੱਲਾ", "lalla", "ਲੂੰਬੜੀ", "loombarhi", "fox", "🦊"],
  ["ਵ", "ਵਾਵਾ", "vaava", "ਵਾਲ", "vaal", "hair", "💇"],
  ["ੜ", "ੜਾੜਾ", "rhaarha"],
];
PAINTI.forEach(([letter, name, nameTr, word, wordTr, en, e]) => {
  CATS[5].sets[0].items.push({
    letter, pa: name, tr: nameTr, word, wordTr, en: word ? en : "no first words start with this one", e,
    say: word ? `${name}। ${word}` : name, sayTr: word ? `${nameTr}, ${wordTr}` : nameTr,
  });
});


/* ---------- More words (child level and up see them too) ---------- */
const g = (pa, tr, en, e, gender) => ({ pa, tr, en, e, g: gender });
CATS.push(
  { id: "family", pa: "ਪਰਿਵਾਰ", tr: "parivaar", en: "Family", emoji: "👨‍👩‍👧", c: "#ff8fb3", game: true, sets: [
    { pa: "ਘਰ", en: "Home", items: [
      g("ਮੰਮੀ", "mummy", "mum", "👩", "f"), g("ਪਾਪਾ", "paapa", "dad", "👨", "m"),
      g("ਭਰਾ", "bharaa", "brother", "👦", "m"), g("ਭੈਣ", "bhain", "sister", "👧", "f"),
    ] },
    { pa: "ਮੰਮੀ ਵੱਲੋਂ", en: "Mum's side", items: [
      g("ਨਾਨੀ", "naani", "mum's mum", "👵", "f"), g("ਨਾਨਾ", "naana", "mum's dad", "👴", "m"),
      g("ਮਾਸੀ", "maasi", "mum's sister", "👩", "f"), g("ਮਾਮਾ", "maama", "mum's brother", "👨", "m"),
      g("ਮਾਮੀ", "maami", "mum's brother's wife", "👩", "f"),
    ] },
    { pa: "ਪਾਪਾ ਵੱਲੋਂ", en: "Dad's side", items: [
      g("ਦਾਦੀ", "daadi", "dad's mum", "👵", "f"), g("ਦਾਦਾ", "daada", "dad's dad", "👴", "m"),
      g("ਭੂਆ", "bhooaa", "dad's sister", "👩", "f"), g("ਚਾਚਾ", "chaacha", "dad's younger brother", "👨", "m"),
      g("ਚਾਚੀ", "chaachi", "chaacha's wife", "👩", "f"), g("ਤਾਇਆ", "taaiaa", "dad's older brother", "👨", "m"),
      g("ਤਾਈ", "taai", "taaiaa's wife", "👩", "f"),
    ] },
  ] },
  { id: "body", pa: "ਸਰੀਰ", tr: "sareer", en: "Body", emoji: "🖐️", c: "#16c2b0", game: true, sets: [{ items: [
    g("ਸਿਰ", "sir", "head", "🙆", "m"), g("ਅੱਖ", "akkh", "eye", "👁️", "f"), g("ਕੰਨ", "kann", "ear", "👂", "m"),
    g("ਨੱਕ", "nakk", "nose", "👃", "m"), g("ਮੂੰਹ", "moonh", "mouth", "👄", "m"), g("ਜੀਭ", "jeebh", "tongue", "👅", "f"),
    g("ਦੰਦ", "dand", "tooth", "🦷", "m"), g("ਵਾਲ", "vaal", "hair", "💇", "m"), g("ਹੱਥ", "hatth", "hand", "✋", "m"),
    g("ਉਂਗਲ", "ungal", "finger", "☝️", "f"), g("ਬਾਂਹ", "baanh", "arm", "💪", "f"), g("ਲੱਤ", "latt", "leg", "🦵", "f"),
    g("ਪੈਰ", "pair", "foot", "🦶", "m"),
  ] }] },
  { id: "animals", pa: "ਜਾਨਵਰ", tr: "jaanvar", en: "Animals", emoji: "🐘", c: "#ffb627", game: true, sets: [
    { pa: "ਘਰ ਤੇ ਖੇਤ", en: "Home & farm", items: [
      g("ਕੁੱਤਾ", "kutta", "dog", "🐕", "m"), g("ਬਿੱਲੀ", "billi", "cat", "🐱", "f"), g("ਗਾਂ", "gaan", "cow", "🐄", "f"),
      g("ਮੱਝ", "majjh", "buffalo", "🐃", "f"), g("ਬੱਕਰੀ", "bakkri", "goat", "🐐", "f"), g("ਘੋੜਾ", "ghorhaa", "horse", "🐎", "m"),
      g("ਭੇਡ", "bhed", "sheep", "🐑", "f"), g("ਮੁਰਗਾ", "murgaa", "rooster", "🐓", "m"), g("ਚੂਹਾ", "choohaa", "mouse", "🐭", "m"),
    ] },
    { pa: "ਜੰਗਲ", en: "Wild", items: [
      g("ਸ਼ੇਰ", "sher", "lion", "🦁", "m"), g("ਹਾਥੀ", "haathi", "elephant", "🐘", "m"), g("ਬਾਂਦਰ", "baandar", "monkey", "🐒", "m"),
      g("ਮੋਰ", "mor", "peacock", "🦚", "m"), g("ਤੋਤਾ", "totaa", "parrot", "🦜", "m"), g("ਮੱਛੀ", "machhi", "fish", "🐟", "f"),
      g("ਊਠ", "ooth", "camel", "🐪", "m"),
    ] },
  ] },
  { id: "home-food", pa: "ਖਾਣਾ-ਪੀਣਾ", tr: "khaanaa-peenaa", en: "Food & drink", emoji: "🫓", c: "#ff7a1a", game: true, sets: [{ items: [
    g("ਰੋਟੀ", "roti", "roti", "🫓", "f"), g("ਦਾਲ", "daal", "lentils", "🍲", "f"), g("ਚੌਲ", "chaul", "rice", "🍚", "m"),
    g("ਸਾਗ", "saag", "greens", "🥬", "m"), g("ਪਨੀਰ", "paneer", "paneer", "🧀", "m"), g("ਆਂਡਾ", "aandaa", "egg", "🥚", "m"),
    g("ਦੁੱਧ", "duddh", "milk", "🥛", "m"), g("ਦਹੀਂ", "daheen", "yoghurt", "🥣", "m"), g("ਮੱਖਣ", "makkhan", "butter", "🧈", "m"),
    g("ਲੱਸੀ", "lassi", "lassi", "🥤", "f"), g("ਚਾਹ", "chaah", "tea", "☕", "f"), g("ਪਾਣੀ", "paani", "water", "💧", "m"),
  ] }] },
  { id: "talk", pa: "ਗੱਲਾਂ", tr: "gallaan", en: "Saying things", emoji: "💬", c: "#9b5cff", level: "child", sets: [{ items: [
    { pa: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ", tr: "sat sri akaal", en: "hello", e: "👋" },
    { pa: "ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?", tr: "tuseen kiven ho?", en: "how are you?", e: "🙂" },
    { pa: "ਮੈਂ ਠੀਕ ਹਾਂ", tr: "main theek haan", en: "I'm fine", e: "😊" },
    { pa: "ਤੁਹਾਡਾ ਨਾਂ ਕੀ ਹੈ?", tr: "tuhaadaa naan ki hai?", en: "what's your name?", e: "🏷️" },
    { pa: "ਹਾਂ", tr: "haan", en: "yes", e: "👍" },
    { pa: "ਨਹੀਂ", tr: "naheen", en: "no", e: "🙅" },
    { pa: "ਕਿਰਪਾ ਕਰਕੇ", tr: "kirpaa karke", en: "please", e: "🥺" },
    { pa: "ਧੰਨਵਾਦ", tr: "dhannvaad", en: "thank you", e: "🙏" },
    { pa: "ਮੈਨੂੰ ਭੁੱਖ ਲੱਗੀ ਹੈ", tr: "mainoon bhukkh laggi hai", en: "I'm hungry", e: "🍽️" },
    { pa: "ਮੈਨੂੰ ਪਿਆਸ ਲੱਗੀ ਹੈ", tr: "mainoon piaas laggi hai", en: "I'm thirsty", e: "🥤" },
    { pa: "ਇੱਥੇ ਆਓ", tr: "itthe aao", en: "come here", e: "🫶" },
    { pa: "ਜੱਫੀ ਪਾਓ", tr: "jaffi paao", en: "give me a hug", e: "🤗" },
    { pa: "ਫਿਰ ਮਿਲਾਂਗੇ", tr: "phir milaange", en: "see you again", e: "👋" },
  ] }] },
  { id: "routine", pa: "ਰੋਜ਼ ਦੇ ਕੰਮ", tr: "roz de kamm", en: "Every day", emoji: "🛁", c: "#7ccf3c", level: "child", sets: [{ items: [
    { pa: "ਖਾਓ", tr: "khaao", en: "eat", e: "🍽️" }, { pa: "ਪੀਓ", tr: "peeo", en: "drink", e: "🥤" },
    { pa: "ਹੱਥ ਧੋਵੋ", tr: "hatth dhovo", en: "wash your hands", e: "🧼" }, { pa: "ਦੰਦ ਸਾਫ਼ ਕਰੋ", tr: "dand saaf karo", en: "brush your teeth", e: "🪥" },
    { pa: "ਨਹਾਓ", tr: "nahaao", en: "have a bath", e: "🛁" }, { pa: "ਖੇਡੋ", tr: "khedo", en: "play", e: "🧸" },
    { pa: "ਹੱਸੋ", tr: "hasso", en: "laugh", e: "😄" }, { pa: "ਨੱਚੋ", tr: "nachcho", en: "dance", e: "💃" },
    { pa: "ਗਾਓ", tr: "gaao", en: "sing", e: "🎵" }, { pa: "ਪੜ੍ਹੋ", tr: "parhho", en: "read", e: "📖" },
    { pa: "ਤੁਰੋ", tr: "turo", en: "walk", e: "🚶" }, { pa: "ਸੌਂ ਜਾਓ", tr: "saun jaao", en: "go to sleep", e: "😴" },
  ] }] },
);

// Grammatical gender for the fruit & veg words (shown at grown-up level).
const FOOD_G = { "ਅੰਬ": "m", "ਸੇਬ": "m", "ਕੇਲਾ": "m", "ਅੰਗੂਰ": "m", "ਸੰਤਰਾ": "m", "ਤਰਬੂਜ਼": "m", "ਨਾਸ਼ਪਾਤੀ": "f", "ਅਨਾਨਾਸ": "m", "ਨਿੰਬੂ": "m", "ਆੜੂ": "m", "ਨਾਰੀਅਲ": "m",
  "ਗਾਜਰ": "f", "ਆਲੂ": "m", "ਟਮਾਟਰ": "m", "ਪਿਆਜ਼": "m", "ਮੱਕੀ": "f", "ਖੀਰਾ": "m", "ਬੈਂਗਣ": "m", "ਮਿਰਚ": "f", "ਲਸਣ": "m", "ਮਟਰ": "m", "ਅਦਰਕ": "m" };
CATS[4].sets.forEach(s => s.items.forEach(it => { if (FOOD_G[it.pa]) it.g = FOOD_G[it.pa]; }));

// What each card says, as a list of phrases. Every phrase has a built-in clip in audio.js.
CATS.forEach(c => c.sets.forEach(s => s.items.forEach(it => {
  if (c.id === "painti") { it.say = it.word ? [it.pa, it.word] : [it.pa]; it.sayTr = it.word ? `${it.tr}, ${it.wordTr}` : it.tr; it.answer = it.word || it.pa; it.answerTr = it.wordTr || it.tr; }
  else { it.say = [it.pa]; it.sayTr = it.tr; it.answer = it.pa; it.answerTr = it.tr; }
  it.key = c.id + ":" + (it.letter || it.pa);
})));

/* ---------- Reading: vowel signs (ਲਗਾਂ ਮਾਤਰਾਂ) ---------- */
const CONSONANTS = "ਸ ਹ ਕ ਖ ਗ ਘ ਚ ਛ ਜ ਝ ਟ ਠ ਡ ਢ ਤ ਥ ਦ ਧ ਨ ਪ ਫ ਬ ਭ ਮ ਯ ਰ ਲ ਵ".split(" ");
const VOWEL_LETTERS = ["ਅ", "ਆ", "ਇ", "ਈ", "ਉ", "ਊ", "ਏ", "ਐ", "ਓ", "ਔ"];
const w = (pa, tr, en, e) => ({ pa, tr, en, e });
const MATRAS = [
  { id: "mukta", name: "ਮੁਕਤਾ", nameTr: "muktaa", sign: "", sound: "a", how: "No sign at all. Every letter already carries a short ‘a’ sound.", words: [
    w("ਘਰ", "ghar", "house", "🏠"), w("ਜਲ", "jal", "water", "💧"), w("ਫਲ", "phal", "fruit", "🍎"), w("ਕਮਲ", "kamal", "lotus", "🪷"), w("ਬਸ", "bas", "bus", "🚌"), w("ਨਲ", "nal", "tap", "🚰")] },
  { id: "kanna", name: "ਕੰਨਾ", nameTr: "kannaa", sign: "ਾ", sound: "aa", how: "A standing line after the letter makes a long ‘aa’.", words: [
    w("ਨਾਨਾ", "naanaa", "grandad (mum's dad)", "👴"), w("ਕਾਰ", "kaar", "car", "🚗"), w("ਤਾਰਾ", "taaraa", "star", "⭐"), w("ਦਾਲ", "daal", "lentils", "🍲"), w("ਮਾਮਾ", "maamaa", "uncle (mum's brother)", "👨"), w("ਸਾਗ", "saag", "greens", "🥬")] },
  { id: "sihari", name: "ਸਿਹਾਰੀ", nameTr: "sihaari", sign: "ਿ", sound: "i", how: "Written before the letter but said after it: a short ‘i’.", words: [
    w("ਦਿਨ", "din", "day", "☀️"), w("ਕਿਤਾਬ", "kitaab", "book", "📕"), w("ਮਿਰਚ", "mirch", "chilli", "🌶️"), w("ਦਿਲ", "dil", "heart", "❤️"), w("ਤਿਤਲੀ", "titli", "butterfly", "🦋")] },
  { id: "bihari", name: "ਬਿਹਾਰੀ", nameTr: "bihaari", sign: "ੀ", sound: "ee", how: "Written after the letter: a long ‘ee’.", words: [
    w("ਨੀਲਾ", "neelaa", "blue", "🔵"), w("ਪੀਲਾ", "peelaa", "yellow", "🟡"), w("ਖੀਰ", "kheer", "rice pudding", "🍮"), w("ਦੀਵਾ", "deevaa", "lamp", "🪔"), w("ਤੀਰ", "teer", "arrow", "🏹")] },
  { id: "aunkar", name: "ਔਂਕੜ", nameTr: "aunkarh", sign: "ੁ", sound: "u", how: "One hook under the letter: a short ‘u’.", words: [
    w("ਗੁਲਾਬ", "gulaab", "rose", "🌹"), w("ਕੁੜੀ", "kurhi", "girl", "👧"), w("ਖੁਸ਼", "khush", "happy", "😊"), w("ਬੁਰਸ਼", "burash", "brush", "🪥")] },
  { id: "dulainkar", name: "ਦੁਲੈਂਕੜ", nameTr: "dulainkarh", sign: "ੂ", sound: "oo", how: "Two hooks under the letter: a long ‘oo’.", words: [
    w("ਆਲੂ", "aaloo", "potato", "🥔"), w("ਭਾਲੂ", "bhaaloo", "bear", "🐻"), w("ਜੂਸ", "joos", "juice", "🧃"), w("ਸੂਰਜ", "sooraj", "sun", "🌞"), w("ਚੂਹਾ", "choohaa", "mouse", "🐭")] },
  { id: "laan", name: "ਲਾਂ", nameTr: "laan", sign: "ੇ", sound: "e", how: "One line on top: ‘e’ as in ‘say’.", words: [
    w("ਸੇਬ", "seb", "apple", "🍎"), w("ਕੇਲਾ", "kelaa", "banana", "🍌"), w("ਰੇਲ", "rel", "train", "🚂"), w("ਸ਼ੇਰ", "sher", "lion", "🦁"), w("ਭੇਡ", "bhed", "sheep", "🐑")] },
  { id: "dulavan", name: "ਦੁਲਾਵਾਂ", nameTr: "dulaavaan", sign: "ੈ", sound: "ai", how: "Two lines on top: ‘ai’ as in ‘bed’, said long.", words: [
    w("ਪੈਰ", "pair", "foot", "🦶"), w("ਭੈਣ", "bhain", "sister", "👧"), w("ਥੈਲਾ", "thailaa", "bag", "👜"), w("ਪੈਸਾ", "paisaa", "money", "💰")] },
  { id: "hora", name: "ਹੋੜਾ", nameTr: "horhaa", sign: "ੋ", sound: "o", how: "A curl on top: ‘o’ as in ‘go’.", words: [
    w("ਮੋਰ", "mor", "peacock", "🦚"), w("ਢੋਲ", "dhol", "drum", "🥁"), w("ਘੋੜਾ", "ghorhaa", "horse", "🐎"), w("ਰੋਟੀ", "roti", "roti", "🫓"), w("ਤੋਤਾ", "totaa", "parrot", "🦜")] },
  { id: "kanaura", name: "ਕਨੌੜਾ", nameTr: "kanaurhaa", sign: "ੌ", sound: "au", how: "A double curl on top: ‘au’ as in ‘saw’.", words: [
    w("ਚੌਲ", "chaul", "rice", "🍚"), w("ਕੌਲੀ", "kauli", "bowl", "🥣"), w("ਪੌਦਾ", "paudaa", "plant", "🪴"), w("ਸੌ", "sau", "hundred", "💯"), w("ਦੌੜ", "daurh", "race", "🏃")] },
];
const MARKS = [
  { id: "bindi", name: "ਬਿੰਦੀ", nameTr: "bindi", sign: "ਂ", how: "A dot on top makes the vowel nasal (said through the nose). Used with ਕੰਨਾ, ਬਿਹਾਰੀ, ਲਾਂ, ਦੁਲਾਵਾਂ, ਹੋੜਾ, ਕਨੌੜਾ.", words: [
    w("ਮਾਂ", "maan", "mother", "👩"), w("ਗਾਂ", "gaan", "cow", "🐄"), w("ਨਹੀਂ", "naheen", "no", "🙅"), w("ਦਹੀਂ", "daheen", "yoghurt", "🥣"), w("ਕੈਂਚੀ", "kainchi", "scissors", "✂️")] },
  { id: "tippi", name: "ਟਿੱਪੀ", nameTr: "tippi", sign: "ੰ", how: "Also a nasal sound, often an ‘n’ or ‘m’. Used with ਮੁਕਤਾ, ਸਿਹਾਰੀ, ਔਂਕੜ, ਦੁਲੈਂਕੜ.", words: [
    w("ਅੰਬ", "amb", "mango", "🥭"), w("ਪਤੰਗ", "patang", "kite", "🪁"), w("ਮੁੰਡਾ", "mundaa", "boy", "👦"), w("ਕੰਨ", "kann", "ear", "👂"), w("ਚੰਨ", "chann", "moon", "🌙"), w("ਝੰਡਾ", "jhandaa", "flag", "🚩")] },
  { id: "addak", name: "ਅੱਧਕ", nameTr: "addhak", sign: "ੱ", how: "A little smile on top doubles the next letter: ਬਿੱਲੀ is ‘bil-li’.", words: [
    w("ਬਿੱਲੀ", "billi", "cat", "🐱"), w("ਕੁੱਤਾ", "kuttaa", "dog", "🐕"), w("ਦੁੱਧ", "duddh", "milk", "🥛"), w("ਮੱਛੀ", "machhi", "fish", "🐟"), w("ਹੱਥ", "hatth", "hand", "✋"), w("ਪੱਤਾ", "pattaa", "leaf", "🍃")] },
];

/* ---------- Sentences: ਇਹ ___ ___ ਹੈ (adjectives agree with the noun) ---------- */
const NOUNS = [
  g("ਘੋੜਾ", "ghorhaa", "horse", "🐎", "m"), g("ਕੁੱਤਾ", "kuttaa", "dog", "🐕", "m"), g("ਸੇਬ", "seb", "apple", "🍎", "m"),
  g("ਕੇਲਾ", "kelaa", "banana", "🍌", "m"), g("ਫੁੱਲ", "phull", "flower", "🌸", "m"), g("ਗੁਬਾਰਾ", "gubaaraa", "balloon", "🎈", "m"),
  g("ਬਿੱਲੀ", "billi", "cat", "🐱", "f"), g("ਗੱਡੀ", "gaddi", "car", "🚗", "f"), g("ਕਿਤਾਬ", "kitaab", "book", "📕", "f"),
  g("ਗੇਂਦ", "gend", "ball", "⚽", "f"), g("ਮੱਛੀ", "machhi", "fish", "🐟", "f"), g("ਟੋਪੀ", "topi", "hat", "🧢", "f"),
];
const ADJS = [
  { m: "ਲਾਲ", f: "ਲਾਲ", trm: "laal", trf: "laal", en: "red", hex: "#e53935" },
  { m: "ਨੀਲਾ", f: "ਨੀਲੀ", trm: "neelaa", trf: "neeli", en: "blue", hex: "#1f6feb" },
  { m: "ਪੀਲਾ", f: "ਪੀਲੀ", trm: "peelaa", trf: "peeli", en: "yellow", hex: "#ffd21f" },
  { m: "ਹਰਾ", f: "ਹਰੀ", trm: "haraa", trf: "hari", en: "green", hex: "#2fb344" },
  { m: "ਕਾਲਾ", f: "ਕਾਲੀ", trm: "kaalaa", trf: "kaali", en: "black", hex: "#1d1a1c" },
  { m: "ਚਿੱਟਾ", f: "ਚਿੱਟੀ", trm: "chittaa", trf: "chitti", en: "white", hex: "#ffffff" },
  { m: "ਭੂਰਾ", f: "ਭੂਰੀ", trm: "bhooraa", trf: "bhoori", en: "brown", hex: "#8d5524" },
  { m: "ਗੁਲਾਬੀ", f: "ਗੁਲਾਬੀ", trm: "gulaabi", trf: "gulaabi", en: "pink", hex: "#ff7eb9" },
  { m: "ਵੱਡਾ", f: "ਵੱਡੀ", trm: "vaddaa", trf: "vaddi", en: "big", scale: 1.45 },
  { m: "ਛੋਟਾ", f: "ਛੋਟੀ", trm: "chhotaa", trf: "chhoti", en: "small", scale: 0.6 },
];
const sentenceText = (adj, noun) => `ਇਹ ${noun.g === "f" ? adj.f : adj.m} ${noun.pa} ਹੈ`;

/* ---------- Tones: same sounds, different pitch ---------- */
const TONE_PAIRS = [
  [w("ਕੋੜਾ", "korhaa", "whip", "🪢"), w("ਘੋੜਾ", "ghorhaa", "horse", "🐎")],
  [w("ਕਰ", "kar", "do", "👐"), w("ਘਰ", "ghar", "house", "🏠")],
  [w("ਕੋਲ", "kol", "near", "📍"), w("ਘੋਲ", "ghol", "mix", "🥄")],
  [w("ਤਾਰ", "taar", "wire", "➰"), w("ਧਾਰ", "dhaar", "stream", "🌊")],
  [w("ਚਾਅ", "chaa", "excitement", "🤩"), w("ਚਾਹ", "chaah", "tea", "☕")],
];

/* ---------- Words for the rest of the app ---------- */
const UI_SAY = {
  find: "ਕਿੱਥੇ ਹੈ?", well: "ਸ਼ਾਬਾਸ਼!", great: "ਬਹੁਤ ਵਧੀਆ!", again: "ਫੇਰ ਕੋਸ਼ਿਸ਼ ਕਰੋ", which: "ਕਿਹੜਾ ਸੁਣਿਆ?",
  hello: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ!", game: "ਖੇਡ", read: "ਪੜ੍ਹਨਾ", write: "ਲਿਖਣਾ", sentences: "ਵਾਕ", speak: "ਸੁਣੋ ਤੇ ਬੋਲੋ",
  tones: "ਸੁਰ", review: "ਦੁਹਰਾਈ", progress: "ਮੇਰੀ ਤਰੱਕੀ", chart: "ਬਾਰਾਂਖੜੀ",
};

/* ---------- Learning path: short units in order. Word units list the cards they teach. ---------- */
const U = (id, pa, en, emoji, cat, words) => ({ id, pa, en, emoji, kind: "words", cat, words });
const R = (id, lesson, emoji) => ({ id, kind: "read", lesson, emoji });
const PATH = [
  U("hello", "ਸਤ ਸ੍ਰੀ ਅਕਾਲ", "Hello", "👋", "talk", ["ਸਤ ਸ੍ਰੀ ਅਕਾਲ", "ਧੰਨਵਾਦ", "ਹਾਂ", "ਨਹੀਂ", "ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?", "ਮੈਂ ਠੀਕ ਹਾਂ"]),
  U("family1", "ਪਰਿਵਾਰ", "Family", "👨‍👩‍👧", "family", ["ਮੰਮੀ", "ਪਾਪਾ", "ਭਰਾ", "ਭੈਣ", "ਨਾਨੀ", "ਨਾਨਾ", "ਦਾਦੀ", "ਦਾਦਾ"]),
  U("colours1", "ਰੰਗ", "Colours", "🎨", "colours", ["ਲਾਲ", "ਨੀਲਾ", "ਪੀਲਾ", "ਹਰਾ", "ਚਿੱਟਾ", "ਕਾਲਾ"]),
  U("letters1", "ਪੈਂਤੀ ੧", "First letters", "ੳ", "painti", ["ੳ", "ਅ", "ੲ", "ਸ", "ਹ", "ਕ"]),
  U("numbers1", "੧ ਤੋਂ ੫", "Numbers 1–5", "🔢", "numbers", ["ਇੱਕ", "ਦੋ", "ਤਿੰਨ", "ਚਾਰ", "ਪੰਜ"]),
  U("animals1", "ਜਾਨਵਰ", "Animals", "🐄", "animals", ["ਕੁੱਤਾ", "ਬਿੱਲੀ", "ਗਾਂ", "ਘੋੜਾ", "ਬੱਕਰੀ", "ਭੇਡ"]),
  R("r-mukta", "mukta", "ਘਰ"),
  U("fruit", "ਫਲ", "Fruit", "🥭", "food", ["ਅੰਬ", "ਸੇਬ", "ਕੇਲਾ", "ਅੰਗੂਰ", "ਸੰਤਰਾ", "ਤਰਬੂਜ਼"]),
  R("r-kanna", "kanna", "ਕਾ"),
  U("body", "ਸਰੀਰ", "Body", "🖐️", "body", ["ਸਿਰ", "ਅੱਖ", "ਕੰਨ", "ਨੱਕ", "ਮੂੰਹ", "ਹੱਥ"]),
  U("numbers2", "੬ ਤੋਂ ੧੦", "Numbers 6–10", "🔟", "numbers", ["ਛੇ", "ਸੱਤ", "ਅੱਠ", "ਨੌਂ", "ਦਸ"]),
  U("letters2", "ਪੈਂਤੀ ੨", "Letters ਖ to ਝ", "ਗ", "painti", ["ਖ", "ਗ", "ਘ", "ਚ", "ਛ", "ਜ", "ਝ"]),
  R("r-sihari", "sihari", "ਕਿ"),
  U("food", "ਖਾਣਾ-ਪੀਣਾ", "Food & drink", "🫓", "home-food", ["ਰੋਟੀ", "ਦਾਲ", "ਚੌਲ", "ਦੁੱਧ", "ਪਾਣੀ", "ਚਾਹ"]),
  R("r-bihari", "bihari", "ਕੀ"),
  U("days", "ਦਿਨ", "Days", "📅", "days", ["ਸੋਮਵਾਰ", "ਮੰਗਲਵਾਰ", "ਬੁੱਧਵਾਰ", "ਵੀਰਵਾਰ", "ਸ਼ੁੱਕਰਵਾਰ", "ਸ਼ਨਿੱਚਰਵਾਰ", "ਐਤਵਾਰ"]),
  U("family2", "ਰਿਸ਼ਤੇਦਾਰ", "Aunts & uncles", "👵", "family", ["ਮਾਸੀ", "ਮਾਮਾ", "ਮਾਮੀ", "ਭੂਆ", "ਚਾਚਾ", "ਚਾਚੀ", "ਤਾਇਆ", "ਤਾਈ"]),
  R("r-aunkar", "aunkar", "ਕੁ"),
  U("colours2", "ਹੋਰ ਰੰਗ", "More colours", "🌈", "colours", ["ਸੰਤਰੀ", "ਗੁਲਾਬੀ", "ਜਾਮਨੀ", "ਭੂਰਾ", "ਸਲੇਟੀ", "ਸੁਨਹਿਰੀ"]),
  { id: "sentences", kind: "sentences", emoji: "🧩" },
  R("r-dulainkar", "dulainkar", "ਕੂ"),
  U("letters3", "ਪੈਂਤੀ ੩", "Letters ਟ to ਨ", "ਟ", "painti", ["ਟ", "ਠ", "ਡ", "ਢ", "ਤ", "ਥ", "ਦ", "ਧ", "ਨ"]),
  U("routine", "ਰੋਜ਼ ਦੇ ਕੰਮ", "Every day", "🛁", "routine", ["ਖਾਓ", "ਪੀਓ", "ਹੱਥ ਧੋਵੋ", "ਦੰਦ ਸਾਫ਼ ਕਰੋ", "ਨਹਾਓ", "ਸੌਂ ਜਾਓ"]),
  R("r-laan", "laan", "ਕੇ"),
  U("veg", "ਸਬਜ਼ੀਆਂ", "Vegetables", "🥕", "food", ["ਗਾਜਰ", "ਆਲੂ", "ਟਮਾਟਰ", "ਪਿਆਜ਼", "ਮੱਕੀ", "ਖੀਰਾ"]),
  R("r-dulavan", "dulavan", "ਕੈ"),
  U("animals2", "ਜੰਗਲ", "Wild animals", "🦁", "animals", ["ਸ਼ੇਰ", "ਹਾਥੀ", "ਬਾਂਦਰ", "ਮੋਰ", "ਤੋਤਾ", "ਮੱਛੀ"]),
  R("r-hora", "hora", "ਕੋ"),
  U("letters4", "ਪੈਂਤੀ ੪", "Letters ਪ to ਵ", "ਪ", "painti", ["ਪ", "ਫ", "ਬ", "ਭ", "ਮ", "ਯ", "ਰ", "ਲ", "ਵ"]),
  R("r-kanaura", "kanaura", "ਕੌ"),
  U("talk2", "ਗੱਲਾਂ", "Saying things", "💬", "talk", ["ਕਿਰਪਾ ਕਰਕੇ", "ਮੈਨੂੰ ਭੁੱਖ ਲੱਗੀ ਹੈ", "ਮੈਨੂੰ ਪਿਆਸ ਲੱਗੀ ਹੈ", "ਇੱਥੇ ਆਓ", "ਜੱਫੀ ਪਾਓ", "ਫਿਰ ਮਿਲਾਂਗੇ"]),
  R("r-bindi", "bindi", "ਮਾਂ"),
  U("numbers3", "੧੧ ਤੋਂ ੧੫", "Numbers 11–15", "🧮", "numbers", ["ਗਿਆਰਾਂ", "ਬਾਰਾਂ", "ਤੇਰਾਂ", "ਚੌਦਾਂ", "ਪੰਦਰਾਂ"]),
  R("r-tippi", "tippi", "ਅੰਬ"),
  U("months1", "ਮਹੀਨੇ ੧", "January to June", "🗓️", "months", ["ਜਨਵਰੀ", "ਫ਼ਰਵਰੀ", "ਮਾਰਚ", "ਅਪ੍ਰੈਲ", "ਮਈ", "ਜੂਨ"]),
  U("months2", "ਮਹੀਨੇ ੨", "July to December", "🍁", "months", ["ਜੁਲਾਈ", "ਅਗਸਤ", "ਸਤੰਬਰ", "ਅਕਤੂਬਰ", "ਨਵੰਬਰ", "ਦਸੰਬਰ"]),
  R("r-addak", "addak", "ਬਿੱਲੀ"),
  U("numbers4", "੧੬ ਤੋਂ ੨੦", "Numbers 16–20", "🎯", "numbers", ["ਸੋਲ਼ਾਂ", "ਸਤਾਰਾਂ", "ਅਠਾਰਾਂ", "ਉੱਨੀ", "ਵੀਹ"]),
  { id: "tones", kind: "tones", emoji: "🎵", level: "adult" },
];
Object.assign(UI_SAY, { start: "ਚਲੋ ਸ਼ੁਰੂ ਕਰੀਏ!", letsgo: "ਚਲੋ ਸ਼ੁਰੂ ਕਰੀਏ!", welcome: "ਜੀ ਆਇਆਂ ਨੂੰ!", goalDone: "ਅੱਜ ਦਾ ਟੀਚਾ ਪੂਰਾ!", path: "ਰਾਹ", words: "ਸ਼ਬਦ", practice: "ਅਭਿਆਸ", calendar: "ਕੈਲੰਡਰ", learn: "ਸਿੱਖੋ", listen: "ਸੁਣੋ" });
