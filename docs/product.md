# Product

One account. Several focused products. One inexpensive suite subscription, with AI as BYOK and/or a small included quota, not unlimited tokens inside £4.99.

On the web that is one app with LifeQuest as the shell. On Apple that is several apps, stack still TBC, sharing the Go API where mockups say it is worth it. See `docs/architecture.md`.

**Job:** help someone practise skills, eat, train, and (later) look after mood, without four other subscriptions and without pretending the app is a clinician, dietitian, or PT.

AI is a draft grounded in rows this user already stored. We do not train on those logs, and we do not keep a chat-memory store. Each call is built from schema fields at request time, with the user’s encrypted Claude key (BYOK or a small quota, not unlimited tokens inside £4.99). People differ: prefer settings they own (diet, household adults and children, theme) over one true path. Never scrape third-party recipe sites for a stock library.

LifeQuest is the hub. Other products keep their own data. Cross-app XP is later and opt-in. Public pride is **proof** (cleared gates, finished sessions), not a raw level. Rest is not failure. Social, when it exists, is opt-in milestone cards, not a default leaderboard.

Horizon items have homes on the catalog in `docs/architecture.md`. Sleep, meditation, and five focus vibes are on `docs/apps/lifequest.md`, NutriLog features on `docs/apps/nutrilog.md`, and GPS and watches on `docs/apps/workout.md`.
