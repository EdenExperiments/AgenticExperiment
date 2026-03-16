-- Insert categories
INSERT INTO public.skill_categories (name, slug, emoji, sort_order) VALUES
    ('Fitness & Movement',      'fitness',      '🏃', 1),
    ('Programming & Tech',      'programming',  '💻', 2),
    ('Creative Arts',           'creative',     '🎨', 3),
    ('Wellness & Mind',         'wellness',     '🧘', 4),
    ('Learning & Knowledge',    'learning',     '📚', 5),
    ('Social & Communication',  'social',       '🗣', 6),
    ('Finance & Career',        'finance',      '💰', 7),
    ('Nutrition & Health',      'nutrition',    '🥗', 8),
    ('Productivity & Focus',    'productivity', '⚡', 9);

-- Insert presets by joining on slug to get category_id
INSERT INTO public.skill_presets (category_id, name, description, default_unit, sort_order)
SELECT c.id, p.name, p.description, p.default_unit, p.sort_order
FROM public.skill_categories c
JOIN (VALUES
    -- Fitness & Movement
    ('fitness', 'Running',           'Build aerobic endurance and consistency',         'km',      1),
    ('fitness', 'Strength Training', 'Progressive resistance and muscular development', 'session', 2),
    ('fitness', 'Yoga',              'Flexibility, balance and mindful movement',       'session', 3),
    ('fitness', 'Cycling',           'Cardiovascular fitness on the bike',              'km',      4),
    ('fitness', 'Swimming',          'Low-impact full-body cardio',                    'laps',    5),
    ('fitness', 'Hiking',            'Endurance and outdoor connection',                'km',      6),
    ('fitness', 'HIIT',              'High-intensity interval training',                'session', 7),
    ('fitness', 'Walking',           'Daily movement and active recovery',              'steps',   8),
    ('fitness', 'Rock Climbing',     'Strength, problem-solving and focus',             'session', 9),
    ('fitness', 'Martial Arts',      'Discipline, technique and self-defence',          'session', 10),

    -- Programming & Tech
    ('programming', 'Python',           'General-purpose scripting and data work',         'session', 1),
    ('programming', 'System Design',    'Architecture, scalability and trade-off thinking','session', 2),
    ('programming', 'Go',               'Fast, statically typed backend development',      'session', 3),
    ('programming', 'Data Structures',  'Algorithms and problem-solving fundamentals',     'problem', 4),
    ('programming', 'TypeScript',       'Type-safe front-end and Node.js development',     'session', 5),
    ('programming', 'SQL',              'Relational databases and query optimisation',      'session', 6),
    ('programming', 'DevOps',           'CI/CD, containers and infrastructure as code',    'session', 7),
    ('programming', 'Security',         'Secure coding, pen-testing and threat modelling', 'session', 8),
    ('programming', 'Open Source',      'Contributing to public projects and communities', 'PR',      9),
    ('programming', 'Code Review',      'Giving and receiving high-quality feedback',      'review',  10),

    -- Creative Arts
    ('creative', 'Drawing',        'Observation, line quality and visual thinking',  'session', 1),
    ('creative', 'Writing',        'Craft, voice and consistent practice',           'words',   2),
    ('creative', 'Music Practice', 'Instrument skill and ear training',              'minutes', 3),
    ('creative', 'Photography',    'Composition, light and storytelling',            'session', 4),
    ('creative', 'Video Editing',  'Narrative pacing and visual grammar',            'session', 5),
    ('creative', 'Painting',       'Colour, medium and expressive technique',        'session', 6),
    ('creative', 'Graphic Design', 'Layout, typography and visual communication',   'session', 7),
    ('creative', '3D Modelling',   'Spatial reasoning and digital sculpting',        'session', 8),
    ('creative', 'Songwriting',    'Melody, lyric and arrangement',                 'song',    9),
    ('creative', 'Poetry',         'Precision, imagery and emotional resonance',     'poem',    10),

    -- Wellness & Mind
    ('wellness', 'Meditation',      'Present-moment awareness and mental clarity',   'minutes', 1),
    ('wellness', 'Journaling',      'Reflection, clarity and emotional processing',  'entry',   2),
    ('wellness', 'Sleep Hygiene',   'Consistent, restorative sleep habits',          'night',   3),
    ('wellness', 'Breathwork',      'Nervous system regulation and stress relief',   'session', 4),
    ('wellness', 'Cold Exposure',   'Resilience and circulatory health',             'session', 5),
    ('wellness', 'Gratitude',       'Positive perspective and emotional wellbeing',  'entry',   6),
    ('wellness', 'Digital Detox',   'Intentional offline time and presence',         'hour',    7),
    ('wellness', 'Therapy',         'Professional support for mental health',        'session', 8),
    ('wellness', 'Nature Time',     'Restorative outdoor and green-space exposure',  'minutes', 9),
    ('wellness', 'Stretching',      'Mobility and physical tension release',         'minutes', 10),

    -- Learning & Knowledge
    ('learning', 'Reading',            'Deep focus and knowledge acquisition',           'pages',   1),
    ('learning', 'Language Learning',  'Vocabulary, grammar and conversational fluency', 'minutes', 2),
    ('learning', 'Mathematics',        'Logical reasoning and quantitative fluency',     'problem', 3),
    ('learning', 'History',            'Context, perspective and critical analysis',     'chapter', 4),
    ('learning', 'Science',            'Experimental thinking and evidence evaluation',  'session', 5),
    ('learning', 'Online Courses',     'Structured self-directed learning',              'lesson',  6),
    ('learning', 'Research',           'Deep-dive on a topic and note synthesis',        'session', 7),
    ('learning', 'Speed Reading',      'Comprehension and reading rate improvement',     'session', 8),
    ('learning', 'Memory Training',    'Spaced repetition and retention techniques',     'session', 9),
    ('learning', 'Philosophy',         'Reasoning, ethics and fundamental questions',    'session', 10),

    -- Social & Communication
    ('social', 'Public Speaking',   'Clarity, presence and audience connection',     'session', 1),
    ('social', 'Active Listening',  'Empathy, attention and understanding others',    'session', 2),
    ('social', 'Networking',        'Building genuine professional relationships',    'meeting', 3),
    ('social', 'Negotiation',       'Mutual-gain outcomes and persuasive framing',    'session', 4),
    ('social', 'Writing Clearly',   'Concise, effective written communication',      'piece',   5),
    ('social', 'Mentoring',         'Developing others through guidance and feedback','session', 6),
    ('social', 'Conflict Res.',     'Constructive resolution and de-escalation',     'session', 7),
    ('social', 'Presentation',      'Slides, delivery and visual storytelling',      'session', 8),
    ('social', 'Debate',            'Structured argumentation and critical thinking', 'session', 9),
    ('social', 'Storytelling',      'Narrative arc and emotional engagement',         'session', 10),

    -- Finance & Career
    ('finance', 'Investing',         'Portfolio management and financial reasoning',   'session', 1),
    ('finance', 'Budgeting',         'Spending awareness and financial planning',      'month',   2),
    ('finance', 'Career Dev.',       'Skill-building aligned to career goals',         'session', 3),
    ('finance', 'Side Project',      'Building something outside your main job',       'hour',    4),
    ('finance', 'Tax Planning',      'Optimising tax position and compliance',         'session', 5),
    ('finance', 'Contract Review',   'Reading and understanding legal agreements',     'document',6),
    ('finance', 'Salary Negot.',     'Researching and negotiating compensation',       'session', 7),
    ('finance', 'Portfolio Review',  'Analysing and rebalancing investments',          'session', 8),
    ('finance', 'Business Dev.',     'Sales, partnerships and growth skills',          'session', 9),
    ('finance', 'Financial Lit.',    'Understanding economics and money fundamentals', 'session', 10),

    -- Nutrition & Health
    ('nutrition', 'Meal Prep',       'Consistent, healthy eating through planning',   'session', 1),
    ('nutrition', 'Protein Intake',  'Hitting daily protein targets',                 'gram',    2),
    ('nutrition', 'Water Intake',    'Consistent hydration habits',                   'litre',   3),
    ('nutrition', 'Cooking',         'Whole-food recipes and kitchen technique',      'meal',    4),
    ('nutrition', 'Intermittent Fast','Metabolic health through time-restricted eating','hour',  5),
    ('nutrition', 'Veggie Servings', 'Daily vegetable and fibre targets',             'serving', 6),
    ('nutrition', 'Sugar Reduction', 'Cutting refined sugar and processed foods',     'day',     7),
    ('nutrition', 'Calorie Track',   'Awareness of energy intake and balance',        'day',     8),
    ('nutrition', 'Supplement Stack','Consistent micronutrient supplementation',      'day',     9),
    ('nutrition', 'Gut Health',      'Fermented foods, fibre and microbiome care',    'session', 10),

    -- Productivity & Focus
    ('productivity', 'Deep Work',       'Uninterrupted focus blocks on hard problems',   'hour',    1),
    ('productivity', 'Time Blocking',   'Scheduled, intentional use of calendar time',   'session', 2),
    ('productivity', 'GTD / Inbox Zero','Trusted system for capturing and clearing tasks','session', 3),
    ('productivity', 'Note-Taking',     'Building a personal knowledge management system','note',   4),
    ('productivity', 'Email Hygiene',   'Fast processing and zero-inbox discipline',      'session', 5),
    ('productivity', 'Morning Routine', 'Consistent start to the day',                   'day',     6),
    ('productivity', 'Evening Review',  'Daily reflection and next-day preparation',     'session', 7),
    ('productivity', 'Task Batching',   'Grouping similar tasks to reduce switching',    'session', 8),
    ('productivity', 'Focus Timer',     'Pomodoro or interval-based concentration',       'session', 9),
    ('productivity', 'Weekly Review',   'Stepping back, reviewing goals and adjusting',  'session', 10)
) AS p(slug, name, description, default_unit, sort_order)
ON c.slug = p.slug;
