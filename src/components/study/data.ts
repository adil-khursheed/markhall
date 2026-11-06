import type { Chapter, Question, SeatState, Session, Subject } from './types'

export const seatStateLabel: Record<SeatState, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  present: 'Present',
  weak: 'Weak seat',
}

export const boards = [
  { id: 'all', label: 'All boards' },
  { id: 'cbse', label: 'CBSE' },
  { id: 'icse', label: 'ICSE / CISCE' },
  { id: 'state', label: 'State board' },
  { id: 'ib', label: 'IB / IGCSE' },
  { id: 'other', label: 'Other board' },
] as const

export const grades = ['9', '10'] as const

export function boardLabel(boardId: string): string {
  return boards.find((board) => board.id === boardId)?.label ?? 'All boards'
}

export const defaultSubjects: Subject[] = [
  {
    id: 'mathematics',
    name: 'Mathematics',
    code: 'MAT',
    chapters: [
      { id: 'number-systems', name: 'Number Systems', state: 'in-progress' },
      { id: 'algebra', name: 'Algebra', state: 'present', lastScore: 8, marksLost: 2 },
      { id: 'geometry', name: 'Geometry', state: 'weak', lastScore: 4, marksLost: 6 },
      { id: 'inequations', name: 'Linear Inequations', state: 'present', lastScore: 9, marksLost: 1 },
      { id: 'quadratics', name: 'Quadratic Equations', state: 'not-started' },
      { id: 'trigonometry', name: 'Trigonometry', state: 'present', lastScore: 7, marksLost: 3 },
      { id: 'mensuration', name: 'Mensuration', state: 'not-started' },
      { id: 'statistics', name: 'Statistics', state: 'present', lastScore: 8, marksLost: 2 },
    ],
  },
  {
    id: 'physics',
    name: 'Physics',
    code: 'PHY',
    chapters: [
      { id: 'force', name: 'Force', state: 'weak', lastScore: 4, marksLost: 6 },
      { id: 'work-energy', name: 'Work, Energy and Power', state: 'not-started' },
      { id: 'machines', name: 'Machines', state: 'present', lastScore: 7, marksLost: 3 },
      { id: 'refraction', name: 'Refraction of Light', state: 'weak', lastScore: 5, marksLost: 5 },
      { id: 'spectrum', name: 'Spectrum', state: 'not-started' },
      { id: 'sound', name: 'Sound', state: 'present', lastScore: 8, marksLost: 2 },
      { id: 'current', name: 'Current Electricity', state: 'weak', lastScore: 4, marksLost: 6 },
      { id: 'magnetism', name: 'Magnetism', state: 'not-started' },
    ],
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    code: 'CHE',
    chapters: [
      { id: 'periodic', name: 'Periodic Table', state: 'present', lastScore: 8, marksLost: 2 },
      { id: 'bonding', name: 'Chemical Bonding', state: 'weak', lastScore: 5, marksLost: 5 },
      { id: 'acids', name: 'Acids, Bases and Salts', state: 'present', lastScore: 7, marksLost: 3 },
      { id: 'analytical', name: 'Analytical Chemistry', state: 'not-started' },
      { id: 'mole', name: 'Mole Concept', state: 'weak', lastScore: 4, marksLost: 6 },
      { id: 'electrolysis', name: 'Electrolysis', state: 'not-started' },
      { id: 'metallurgy', name: 'Metallurgy', state: 'present', lastScore: 7, marksLost: 3 },
      { id: 'organic', name: 'Organic Chemistry', state: 'not-started' },
    ],
  },
  {
    id: 'english-language',
    name: 'English Language',
    code: 'ENG',
    chapters: [
      { id: 'composition', name: 'Composition', state: 'present', lastScore: 8, marksLost: 2 },
      { id: 'letter', name: 'Letter Writing', state: 'weak', lastScore: 5, marksLost: 5 },
      { id: 'comprehension', name: 'Comprehension', state: 'present', lastScore: 7, marksLost: 3 },
      { id: 'grammar', name: 'Grammar', state: 'present', lastScore: 8, marksLost: 2 },
    ],
  },
  {
    id: 'english-literature',
    name: 'English Literature',
    code: 'LIT',
    chapters: [
      { id: 'drama', name: 'Drama', state: 'weak', lastScore: 5, marksLost: 5 },
      { id: 'prose', name: 'Prose', state: 'present', lastScore: 7, marksLost: 3 },
      { id: 'poetry', name: 'Poetry', state: 'not-started' },
    ],
  },
  {
    id: 'biology',
    name: 'Biology',
    code: 'BIO',
    chapters: [
      { id: 'cell', name: 'Cell: Structure and Function', state: 'present', lastScore: 8, marksLost: 2 },
      { id: 'tissues', name: 'Tissues', state: 'present', lastScore: 7, marksLost: 3 },
      { id: 'transpiration', name: 'Transpiration', state: 'weak', lastScore: 4, marksLost: 6 },
      { id: 'photosynthesis', name: 'Photosynthesis', state: 'present', lastScore: 9, marksLost: 1 },
      { id: 'circulatory', name: 'Circulatory System', state: 'weak', lastScore: 5, marksLost: 5 },
      { id: 'excretory', name: 'Excretory System', state: 'not-started' },
      { id: 'nervous', name: 'Nervous System', state: 'not-started' },
      { id: 'reproduction', name: 'Reproduction', state: 'not-started' },
    ],
  },
  {
    id: 'social-science',
    name: 'Social Science',
    code: 'SOC',
    chapters: [
      { id: 'democracy', name: 'Democracy and Citizenship', state: 'present', lastScore: 7, marksLost: 3 },
      { id: 'executive', name: 'Union Executive', state: 'weak', lastScore: 5, marksLost: 5 },
      { id: 'judiciary', name: 'Judiciary', state: 'present', lastScore: 8, marksLost: 2 },
      { id: 'nationalism', name: 'National Movements', state: 'not-started' },
      { id: 'world-wars', name: 'World Wars', state: 'weak', lastScore: 4, marksLost: 6 },
      { id: 'resources', name: 'Resources and Development', state: 'not-started' },
      { id: 'united-nations', name: 'United Nations', state: 'present', lastScore: 7, marksLost: 3 },
    ],
  },
  {
    id: 'geography',
    name: 'Geography',
    code: 'GEO',
    chapters: [
      { id: 'climate', name: 'Climate and Weather', state: 'present', lastScore: 8, marksLost: 2 },
      { id: 'soil', name: 'Soil Resources', state: 'weak', lastScore: 5, marksLost: 5 },
      { id: 'water', name: 'Water Resources', state: 'present', lastScore: 7, marksLost: 3 },
      { id: 'vegetation', name: 'Natural Vegetation', state: 'not-started' },
      { id: 'agriculture', name: 'Agriculture', state: 'weak', lastScore: 4, marksLost: 6 },
      { id: 'minerals', name: 'Minerals', state: 'present', lastScore: 7, marksLost: 3 },
      { id: 'transport', name: 'Transport', state: 'not-started' },
      { id: 'waste', name: 'Waste Management', state: 'not-started' },
    ],
  },
  {
    id: 'computer-applications',
    name: 'Computer Applications',
    code: 'COM',
    chapters: [
      { id: 'java-basics', name: 'Java Basics', state: 'present', lastScore: 8, marksLost: 2 },
      { id: 'classes', name: 'Classes and Objects', state: 'weak', lastScore: 5, marksLost: 5 },
      { id: 'arrays', name: 'Arrays', state: 'present', lastScore: 7, marksLost: 3 },
      { id: 'strings', name: 'Strings', state: 'not-started' },
      { id: 'loops', name: 'Loops', state: 'present', lastScore: 8, marksLost: 2 },
      { id: 'functions', name: 'Functions', state: 'not-started' },
    ],
  },
  {
    id: 'hindi',
    name: 'Hindi',
    code: 'HIN',
    chapters: [
      { id: 'gadya', name: 'अपठित गद्यांश', state: 'present', lastScore: 7, marksLost: 3 },
      { id: 'patra', name: 'पत्र लेखन', state: 'weak', lastScore: 5, marksLost: 5 },
      { id: 'nibandh', name: 'निबंध लेखन', state: 'present', lastScore: 7, marksLost: 3 },
      { id: 'vyakaran', name: 'व्याकरण', state: 'not-started' },
    ],
  },
]

export const questionBank: Record<string, Question[]> = {
  mathematics: [
    {
      id: 'mat-number-1',
      prompt:
        'Use the divisibility rule for 3 to test whether 4,728 is divisible by 3. Show the sum you used and state your conclusion.',
      marks: 2,
      keywords: ['4 + 7 + 2 + 8', '21', 'divisible', '3', 'yes'],
      modelPoints: [
        'Add the digits: 4 + 7 + 2 + 8 = 21.',
        'Since 21 is divisible by 3, 4,728 is divisible by 3.',
      ],
    },
    {
      id: 'mat-algebra-1',
      prompt: 'Solve the equation 3(x − 2) = 2x + 5 and verify your answer by substitution.',
      marks: 3,
      keywords: ['3x - 6', '2x + 5', 'x = 11', 'substitute', 'verify'],
      modelPoints: [
        'Expand the bracket: 3x − 6 = 2x + 5.',
        'Collect like terms: 3x − 2x = 5 + 6, so x = 11.',
        'Substitute x = 11: 3(9) = 27 and 2(11) + 5 = 27, so the answer is verified.',
      ],
    },
    {
      id: 'mat-geometry-1',
      prompt:
        'A right-angled triangle has legs of length 6 cm and 8 cm. Find the length of the hypotenuse and state the theorem you used.',
      marks: 3,
      keywords: ['pythagoras', '6² + 8²', '100', '10', 'hypotenuse'],
      modelPoints: [
        'Use Pythagoras’ theorem: hypotenuse² = 6² + 8².',
        'hypotenuse² = 36 + 64 = 100.',
        'hypotenuse = √100 = 10 cm.',
      ],
    },
  ],
  physics: [
    {
      id: 'phy-force-1',
      prompt: "State Newton's second law of motion and use it to derive the relation F = ma.",
      marks: 3,
      keywords: ['rate of change', 'momentum', 'proportional', 'mass', 'acceleration', 'f = ma'],
      modelPoints: [
        "The rate of change of momentum of a body is directly proportional to the applied force and takes place in the direction of the force.",
        'Change in momentum = mv − mu, so rate of change = m(v − u)/t.',
        'Since (v − u)/t = a, the rate of change of momentum is ma. Therefore F = kma, and with suitable units k = 1, giving F = ma.',
      ],
    },
    {
      id: 'phy-force-2',
      prompt: 'A body of mass 5 kg accelerates at 2 m/s². Calculate the force acting on it and state the unit used.',
      marks: 2,
      keywords: ['5', '2', '10', 'newton', 'n'],
      modelPoints: ['F = ma = 5 × 2 = 10 N.', 'The unit of force is the newton (N).'],
    },
    {
      id: 'phy-force-3',
      prompt: 'Explain why a passenger standing in a moving bus falls forward when the bus stops suddenly.',
      marks: 3,
      keywords: ['inertia', 'motion', 'lower body', 'upper body', 'continues'],
      modelPoints: [
        'The passenger and the bus are in motion together.',
        'When the bus stops, the lower body stops with the bus because of friction with the floor.',
        'The upper body tends to continue moving forward because of inertia of motion, so the passenger falls forward.',
      ],
    },
  ],
  chemistry: [
    {
      id: 'che-periodic-1',
      prompt: 'State the modern periodic law and describe the trend in atomic radius as you move across a period from left to right.',
      marks: 3,
      keywords: ['atomic number', 'periodic', 'nuclear charge', 'decreases', 'shell'],
      modelPoints: [
        'The modern periodic law states that the properties of elements are periodic functions of their atomic numbers.',
        'Across a period, the nuclear charge increases while the number of shells stays the same.',
        'The increased nuclear pull draws electrons closer, so atomic radius decreases from left to right.',
      ],
    },
    {
      id: 'che-bonding-1',
      prompt: 'Draw the electron dot structure of sodium chloride and state the type of bond formed.',
      marks: 3,
      keywords: ['ionic', 'transfer', 'na+', 'cl-', 'electrostatic', 'lattice'],
      modelPoints: [
        'Sodium loses one valence electron to form Na⁺; chlorine gains one to form Cl⁻.',
        'The ions are held by strong electrostatic attraction.',
        'The bond is ionic (electrovalent), and the ions form a giant ionic lattice.',
      ],
    },
    {
      id: 'che-acids-1',
      prompt: 'Define electrolysis and give one industrial application of the process.',
      marks: 2,
      keywords: ['electric current', 'electrolyte', 'decomposition', 'electroplating', 'refining'],
      modelPoints: [
        'Electrolysis is the decomposition of an electrolyte in solution or molten state by passing an electric current through it.',
        'One application is electroplating, such as coating iron with nickel or chromium.',
      ],
    },
  ],
  biology: [
    {
      id: 'bio-transpiration-1',
      prompt: 'Explain the process of transpiration and name two factors that affect its rate.',
      marks: 3,
      keywords: ['stomata', 'water vapour', 'evaporation', 'temperature', 'humidity', 'wind'],
      modelPoints: [
        'Transpiration is the loss of water as vapour from the aerial parts of a plant, mainly through stomata.',
        'Water evaporates from the moist cell walls into the intercellular spaces and then diffuses out through the stomata.',
        'Temperature, humidity, wind speed, and light intensity affect the rate.',
      ],
    },
    {
      id: 'bio-tissues-1',
      prompt: 'State three functions of the epidermis in a leaf.',
      marks: 3,
      keywords: ['protection', 'cuticle', 'stomata', 'gas exchange', 'water loss'],
      modelPoints: [
        'It protects the inner tissues from mechanical injury and infection.',
        'The cuticle reduces excessive water loss.',
        'Stomata in the epidermis allow gaseous exchange and transpiration.',
      ],
    },
    {
      id: 'bio-cell-1',
      prompt: 'Differentiate between a plant cell and an animal cell with any three points.',
      marks: 3,
      keywords: ['cell wall', 'chloroplast', 'vacuole', 'centriole', 'shape'],
      modelPoints: [
        'A plant cell has a cellulose cell wall; an animal cell does not.',
        'Plant cells usually have chloroplasts and a large central vacuole; animal cells do not.',
        'Plant cells are generally fixed in shape, while animal cells are more irregular and flexible.',
      ],
    },
  ],
  'english-language': [
    {
      id: 'eng-letter-1',
      prompt:
        'Write a letter to the editor of a national daily about the increasing traffic congestion in your city. Suggest two practical measures. (120–150 words)',
      marks: 5,
      keywords: ['editor', 'traffic', 'congestion', 'public transport', 'parking', 'signal', 'citizens'],
      modelPoints: [
        'Formal letter format with sender address, date, receiver, subject, and salutation.',
        'Clear statement of the problem with a specific local detail.',
        'Two practical suggestions, such as strengthening public transport and enforcing parking rules.',
        'Polite closing and signature.',
      ],
    },
    {
      id: 'eng-grammar-1',
      prompt: "Rewrite the following sentence in indirect speech: 'I will finish the project tomorrow,' said Riya.",
      marks: 2,
      keywords: ['riya', 'would', 'finish', 'project', 'next day', 'following day'],
      modelPoints: [
        'Riya said that she would finish the project the next day.',
        'The reporting verb is in the past, so “will” changes to “would” and “tomorrow” changes to “the next day”.',
      ],
    },
    {
      id: 'eng-comprehension-1',
      prompt:
        'Read this line and answer in one sentence: “The old library smelled of rain and paper, and every shelf seemed to remember a reader.” Identify the figure of speech in the second clause and explain its effect.',
      marks: 2,
      keywords: ['personification', 'shelf', 'remember', 'human', 'memory'],
      modelPoints: [
        'The shelves are personified by being given the human ability to remember.',
        'This makes the library feel alive and full of shared history.',
      ],
    },
  ],
  'english-literature': [
    {
      id: 'lit-drama-1',
      prompt:
        'In a drama you have studied, explain how the climax resolves the central conflict. Answer in 100–120 words.',
      marks: 5,
      keywords: ['climax', 'conflict', 'resolution', 'character', 'turning point', 'evidence'],
      modelPoints: [
        'Name the drama and the central conflict accurately.',
        'Identify the climax and explain what changes at that point.',
        'Show how the resolution follows from the choices made by the characters.',
        'Support the answer with a short quotation or specific moment from the text.',
      ],
    },
    {
      id: 'lit-drama-2',
      prompt:
        'Discuss how a playwright you have studied uses one minor character to develop a major theme.',
      marks: 5,
      keywords: ['minor character', 'theme', 'dialogue', 'contrast', 'plot', 'evidence'],
      modelPoints: [
        'Name the play, the minor character, and the theme you will discuss.',
        'Explain two ways the character contributes to the theme.',
        'Use specific dialogue or stage action as evidence.',
        'Close by linking the character’s function to the play’s overall meaning.',
      ],
    },
    {
      id: 'lit-poetry-1',
      prompt: 'Explain the central idea of any one poem you have studied, with one line of evidence.',
      marks: 4,
      keywords: ['theme', 'poem', 'speaker', 'image', 'meaning'],
      modelPoints: [
        'Name the poem and poet accurately.',
        'State the central idea in one clear sentence.',
        'Support it with a short quotation or specific image from the poem.',
      ],
    },
  ],
  'social-science': [
    {
      id: 'soc-executive-1',
      prompt: 'Explain any three powers of the head of state in a parliamentary democracy.',
      marks: 3,
      keywords: ['executive', 'legislative', 'appointment', 'ordinance', 'emergency', 'bill'],
      modelPoints: [
        'Executive power: the head of state appoints the prime minister, council of ministers, and senior officials.',
        'Legislative power: the head of state summons the legislature, addresses it, and assents to bills.',
        'Emergency power: the head of state can proclaim an emergency under the constitution.',
      ],
    },
    {
      id: 'soc-judiciary-1',
      prompt: 'Describe the role of the supreme court as the guardian of the constitution.',
      marks: 3,
      keywords: ['judicial review', 'fundamental rights', 'writ', 'unconstitutional', 'guardian'],
      modelPoints: [
        'The Supreme Court can review laws and executive actions and declare them unconstitutional.',
        'It protects fundamental rights by issuing writs such as habeas corpus and mandamus.',
        'Its interpretation of the Constitution binds all courts and helps preserve the federal balance.',
      ],
    },
    {
      id: 'soc-nationalism-1',
      prompt: 'State three contributions of a leader you have studied to a national movement.',
      marks: 3,
      keywords: ['protest', 'resistance', 'mass movement', 'participation', 'campaign', 'independence'],
      modelPoints: [
        'The leader introduced a distinctive method of protest or resistance.',
        'The leader organised a mass movement that widened public participation.',
        'A specific campaign or march became a turning point and mobilised ordinary people.',
      ],
    },
  ],
  geography: [
    {
      id: 'geo-climate-1',
      prompt: 'Explain three factors that influence the climate of a region.',
      marks: 3,
      keywords: ['latitude', 'altitude', 'distance from sea', 'winds', 'relief', 'ocean currents'],
      modelPoints: [
        'Latitude affects temperature and the angle of incoming sunlight.',
        'Altitude changes temperature, so highland areas are cooler than lowlands at the same latitude.',
        'Distance from the sea, prevailing winds, and relief create contrasts between coastal, interior, and mountain climates.',
      ],
    },
    {
      id: 'geo-soil-1',
      prompt: 'Describe the characteristics of a fertile river soil and name two regions where it is found.',
      marks: 3,
      keywords: ['fertile', 'silt', 'river', 'floodplain', 'delta', 'potash', 'agriculture'],
      modelPoints: [
        'Fertile river soil is rich in silt and potash and supports intensive agriculture.',
        'It is deposited by rivers in floodplains and deltas.',
        'Name two regions from your own region or syllabus where this soil is found.',
      ],
    },
    {
      id: 'geo-agriculture-1',
      prompt: 'State three advantages of terrace farming in hilly areas.',
      marks: 3,
      keywords: ['erosion', 'slope', 'water', 'cultivation', 'soil', 'runoff'],
      modelPoints: [
        'Terraces slow the flow of water down slopes and reduce soil erosion.',
        'They retain moisture and make cultivation possible on steep land.',
        'They increase the area of arable land and improve water infiltration.',
      ],
    },
  ],
  'computer-applications': [
    {
      id: 'com-loops-1',
      prompt: 'Write a Java program to print the sum of the first 10 natural numbers using a for loop.',
      marks: 4,
      keywords: ['for', 'sum', 'i = 1', 'i <= 10', 'sum +=', 'system.out'],
      modelPoints: [
        'Declare an integer variable sum and initialise it to 0.',
        'Use for (int i = 1; i <= 10; i++) and add i to sum inside the loop.',
        'Print sum after the loop.',
      ],
    },
    {
      id: 'com-classes-1',
      prompt: 'Differentiate between a class and an object with one example each.',
      marks: 3,
      keywords: ['blueprint', 'instance', 'class', 'object', 'new', 'attributes'],
      modelPoints: [
        'A class is a blueprint that defines attributes and methods; an object is an instance of a class.',
        'A class is declared once, while many objects can be created from it using new.',
        'Example: class Student { ... } and Student s = new Student();',
      ],
    },
    {
      id: 'com-arrays-1',
      prompt: 'Write a Java statement to declare and initialise an array of five integers with the values 3, 6, 9, 12 and 15. Then print the third element.',
      marks: 3,
      keywords: ['int[]', 'new int', '{3', '12', '15', 'arr[2]', 'println'],
      modelPoints: [
        'int[] numbers = {3, 6, 9, 12, 15};',
        'Array indices start at 0, so the third element is numbers[2].',
        'System.out.println(numbers[2]); prints 9.',
      ],
    },
  ],
  hindi: [
    {
      id: 'hin-patra-1',
      prompt:
        'अपने विद्यालय के प्रधानाचार्य को परीक्षा की तैयारी हेतु पुस्तकालय में समय बढ़ाने के लिए पत्र लिखिए। (लगभग 120 शब्द)',
      marks: 5,
      keywords: ['प्रधानाचार्य', 'पुस्तकालय', 'समय', 'परीक्षा', 'अनुरोध', 'भवदीय'],
      modelPoints: [
        'औपचारिक पत्र का प्रारूप: प्रेषक, दिनांक, प्राप्तकर्ता, विषय, संबोधन।',
        'परीक्षा निकट होने और पुस्तकालय में अध्ययन की आवश्यकता स्पष्ट करें।',
        'पुस्तकालय का समय बढ़ाने का विनम्र अनुरोध करें।',
        'औपचारिक समापन और हस्ताक्षर।',
      ],
    },
    {
      id: 'hin-nibandh-1',
      prompt: "निम्नलिखित विषय पर 250 शब्दों में निबंध लिखिए: 'परिश्रम का महत्व'।",
      marks: 10,
      keywords: ['परिश्रम', 'सफलता', 'जीवन', 'आलस', 'उदाहरण', 'निष्कर्ष'],
      modelPoints: [
        'भूमिका में परिश्रम को सफलता की कुंजी बताएँ।',
        'परिश्रम के लाभ और आलस्य के दुष्परिणाम समझाएँ।',
        'उपयुक्त उदाहरण या सूक्ति दें।',
        'निष्कर्ष में परिश्रम का महत्व दोहराएँ।',
      ],
    },
    {
      id: 'hin-vyakaran-1',
      prompt: 'निम्नलिखित वाक्य में संज्ञा और क्रिया छाँटकर लिखिए: “बच्चे मैदान में खेल रहे हैं।”',
      marks: 2,
      keywords: ['बच्चे', 'संज्ञा', 'खेल रहे हैं', 'क्रिया', 'मैदान'],
      modelPoints: [
        'संज्ञा: बच्चे (और मैदान)।',
        'क्रिया: खेल रहे हैं।',
      ],
    },
  ],
}

export function getSubject(subjects: Subject[], subjectId: string): Subject | undefined {
  return subjects.find((subject) => subject.id === subjectId)
}

export function getChapter(subjects: Subject[], subjectId: string, chapterId: string): Chapter | undefined {
  return getSubject(subjects, subjectId)?.chapters.find((chapter) => chapter.id === chapterId)
}

export function coverage(subject: Subject): { present: number; total: number; percent: number; weak: number } {
  const present = subject.chapters.filter((chapter) => chapter.state === 'present').length
  const weak = subject.chapters.filter((chapter) => chapter.state === 'weak').length
  const total = subject.chapters.length
  return { present, total, weak, percent: total === 0 ? 0 : Math.round((present / total) * 100) }
}

export function overallCoverage(subjects: Subject[]): { present: number; total: number; percent: number } {
  const present = subjects.reduce(
    (sum, subject) => sum + subject.chapters.filter((chapter) => chapter.state === 'present').length,
    0,
  )
  const total = subjects.reduce((sum, subject) => sum + subject.chapters.length, 0)
  return { present, total, percent: total === 0 ? 0 : Math.round((present / total) * 100) }
}

export function currentSeat(subjects: Subject[]): { subject: Subject; chapter: Chapter; seat: number } | null {
  let weakSeat: { subject: Subject; chapter: Chapter; seat: number } | null = null
  let notStartedSeat: { subject: Subject; chapter: Chapter; seat: number } | null = null

  for (const subject of subjects) {
    for (const [index, chapter] of subject.chapters.entries()) {
      const seat = { subject, chapter, seat: seatNumber(subjects, subject.id, index) }
      if (chapter.state === 'in-progress') return seat
      if (chapter.state === 'weak' && !weakSeat) weakSeat = seat
      if (chapter.state === 'not-started' && !notStartedSeat) notStartedSeat = seat
    }
  }

  return weakSeat ?? notStartedSeat
}

export function nextActionableSeats(
  subjects: Subject[],
  limit = 3,
): Array<{ subject: Subject; chapter: Chapter; seat: number; priority: number }> {
  const seats: Array<{ subject: Subject; chapter: Chapter; seat: number; priority: number }> = []
  subjects.forEach((subject) => {
    subject.chapters.forEach((chapter, index) => {
      const priority = chapter.state === 'weak' ? 0 : chapter.state === 'in-progress' ? 1 : chapter.state === 'not-started' ? 2 : 3
      if (priority < 3) {
        seats.push({ subject, chapter, seat: seatNumber(subjects, subject.id, index), priority })
      }
    })
  })
  return seats.sort((a, b) => a.priority - b.priority || a.seat - b.seat).slice(0, limit)
}

export function weakSeats(subjects: Subject[]): Array<{ subject: Subject; chapter: Chapter; seat: number }> {
  const seats: Array<{ subject: Subject; chapter: Chapter; seat: number }> = []
  subjects.forEach((subject) => {
    subject.chapters.forEach((chapter, index) => {
      if (chapter.state === 'weak') seats.push({ subject, chapter, seat: seatNumber(subjects, subject.id, index) })
    })
  })
  return seats
}

export function seatNumber(subjects: Subject[], subjectId: string, chapterIndex: number): number {
  let offset = 0
  for (const subject of subjects) {
    if (subject.id === subjectId) return offset + chapterIndex + 1
    offset += subject.chapters.length
  }
  return chapterIndex + 1
}

export function sessionQuestions(subjectId: string, chapterId: string): Question[] {
  const bank = questionBank[subjectId] ?? []
  if (bank.length <= 3) return bank
  const seed = chapterId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const start = seed % bank.length
  return [0, 1, 2].map((step) => bank[(start + step) % bank.length])
}

export function questionsForSession(session: Session): Question[] {
  const bank = questionBank[session.subjectId] ?? []
  return session.questionIds
    .map((id) => bank.find((question) => question.id === id))
    .filter((question): question is Question => Boolean(question))
}

export function markAnswer(question: Question, answer: string): number {
  const text = answer.toLowerCase()
  const words = answer.trim().split(/\s+/).filter(Boolean).length
  const hits = question.keywords.filter((keyword) => text.includes(keyword.toLowerCase())).length
  const keywordRatio = question.keywords.length === 0 ? 0 : hits / question.keywords.length
  const expectedWords = Math.max(10, question.marks * 10)
  const lengthRatio = Math.min(1, words / expectedWords)
  const ratio = 0.2 + 0.62 * keywordRatio + 0.18 * lengthRatio
  return Math.max(0, Math.min(question.marks, Math.round(question.marks * ratio * 2) / 2))
}

export function examinerNote(question: Question, awarded: number, answer: string): string {
  const words = answer.trim().split(/\s+/).filter(Boolean).length
  if (words < Math.max(8, question.marks * 4)) {
    return 'The answer is too brief for the marks available. State the point, then explain it in a full sentence before moving on.'
  }
  const ratio = awarded / question.marks
  if (ratio >= 0.95) return 'Full marks. Each marking point is stated and applied in order; keep this structure for longer answers.'
  if (ratio >= 0.8) return 'Strong answer. One supporting detail is thin; add the intermediate step or definition the examiner is looking for.'
  if (ratio >= 0.6) return 'The main point is there, but one required marking point is missing or undeveloped. Add the explanation the mark scheme expects.'
  if (ratio >= 0.35) return 'Partially correct. You have named the idea but not shown the reasoning; write the intermediate step before the final answer.'
  return 'This does not yet match the marking scheme. Start from the definition or formula, then apply it to the numbers or terms in the question.'
}
