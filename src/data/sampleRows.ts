import { EvalRow } from '../types';

export const JUDGE_PROMPT_TEXT =
  'You are an impartial judge. Pick the better answer for accuracy, helpfulness and clarity. Reply with only A or B.';

export const SAMPLE_ROWS: EvalRow[] = [
  {
    id: 'sample-1',
    topic: 'Factual',
    question: 'Why does the sky appear blue during a clear day?',
    answer_1:
      'Sunlight contains all visible wavelengths. As it enters Earth’s atmosphere, gases scatter shorter blue wavelengths far more strongly than longer red wavelengths (Rayleigh scattering, inversely proportional to the fourth power of wavelength), so blue light reaches our eyes from all directions.',
    answer_2:
      'The sky looks blue primarily because Earth’s surface is covered by roughly 71% water, and the vast oceans reflect their deep blue hue upward into the lower atmosphere. In addition, water vapor clouds and oxygen particles absorb orange and yellow sunlight during midday, leaving predominantly blue light visible to observers on the ground regardless of altitude or humidity.',
    human_winner: 1,
  },
  {
    id: 'sample-2',
    topic: 'Factual',
    question: 'What is the difference between HTTP status codes 401 and 403?',
    answer_1:
      '401 Unauthorized means the client has not provided valid authentication credentials (who you are is unknown or invalid). 403 Forbidden means the server understood your identity, but you lack permission to access the requested resource.',
    answer_2:
      'In modern RESTful web architectures, both 401 and 403 belong to the 4xx client error family defined in RFC 9110. Generally speaking, developers use 401 when an API gateway encounters a permission or role mismatch on a protected endpoint, whereas 403 is reserved for expired bearer tokens or missing API keys during initial session handshakes. Checking server logs is always recommended when troubleshooting either status.',
    human_winner: 1,
  },
  {
    id: 'sample-3',
    topic: 'Factual',
    question: 'Which planet in our solar system has the hottest average surface temperature, and why?',
    answer_1:
      'Mercury is the hottest planet in our solar system because it orbits closest to the Sun at an average distance of about 58 million kilometers, receiving intense solar radiation year-round.',
    answer_2:
      'Venus has the hottest average surface temperature (~465 °C / 869 °F), even hotter than Mercury. Although Mercury is closer to the Sun, it has almost no atmosphere to trap heat, whereas Venus has a dense carbon dioxide atmosphere that creates a runaway greenhouse effect.',
    human_winner: 2,
  },
  {
    id: 'sample-4',
    topic: 'Writing',
    question:
      'Write a concise customer apology email for a 2-hour checkout outage that is now resolved.',
    answer_1:
      'Subject: Update on today’s checkout issue\n\nHi [Name],\n\nBetween 1:00 PM and 3:00 PM ET today, a configuration error prevented some orders from completing at checkout. The issue is now fully resolved, and no duplicate charges were processed.\n\nWe apologize for the disruption and appreciate your patience. If you still need help completing an order, reply directly to this email and our team will assist right away.\n\nBest,\nSupport Team',
    answer_2:
      'Subject: Important Service Communication Regarding Platform Operational Continuity\n\nDear Valued Stakeholder,\n\nWe are reaching out in alignment with our core commitment to customer excellence to transparently share that our commerce ecosystem experienced intermittent transactional friction earlier today across select checkout touchpoints. Our cross-functional engineering squads mobilized immediately to leverage best-in-class remediation protocols and restore optimal end-to-end throughput. While we continuously strive to exceed expectations on every journey, we recognize this temporary degradation fell short of our gold-standard benchmarks and thank you for your ongoing partnership.',
    human_winner: 1,
  },
  {
    id: 'sample-5',
    topic: 'Writing',
    question: 'Rewrite this sentence to be clearer and more active: "The quarterly budget report was reviewed by the finance committee prior to the approval of the vendor contract."',
    answer_1:
      'Prior to the vendor contract being approved, a thorough review of the quarterly budget report was conducted by members of the finance committee to ensure organizational alignment.',
    answer_2:
      'The finance committee reviewed the quarterly budget report before approving the vendor contract.',
    human_winner: 2,
  },
  {
    id: 'sample-6',
    topic: 'Reasoning',
    question:
      'A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?',
    answer_1:
      'To find the price of the ball, we can subtract the $1.00 difference from the total cost of $1.10. Doing $1.10 minus $1.00 leaves exactly $0.10, which means the bat costs $1.00 and the ball costs $0.10. Adding them back together gives $1.10, confirming the total price.',
    answer_2:
      'Let the ball cost x. Then the bat costs x + $1.00. Together: x + (x + $1.00) = $1.10 → 2x = $0.10 → x = $0.05. The ball costs $0.05 (and the bat costs $1.05).',
    human_winner: 2,
  },
  {
    id: 'sample-7',
    topic: 'Reasoning',
    question:
      'A patch of lily pads doubles in size every day. If it takes 48 days to cover the entire lake, how many days does it take to cover half the lake?',
    answer_1:
      '47 days. Because the patch doubles each day, it must have been half the size of the full lake on the day right before Day 48.',
    answer_2:
      'To determine when the lake is half covered, we can divide the total 48-day timeline by two. Since the growth progresses steadily from day 1 to day 48, reaching 50% coverage takes 24 days, and the remaining 50% of the lake fills in over the second half of the 48-day period.',
    human_winner: 1,
  },
  {
    id: 'sample-8',
    topic: 'Reasoning',
    question:
      'All roses are flowers. Some flowers fade quickly. Does it logically follow that some roses fade quickly?',
    answer_1:
      'Yes, because roses are a subset of flowers, and we are given that some flowers fade quickly. By transitive inclusion across overlapping categories, at least a subset of roses must share the quick-fading property attributed to flowers in general.',
    answer_2:
      'No. The flowers that fade quickly could belong entirely to non-rose species (such as tulips or daisies). Nothing in the two premises guarantees any overlap between roses and quick-fading flowers.',
    human_winner: 2,
  },
  {
    id: 'sample-9',
    topic: 'Coding',
    question:
      'Write a Python function `has_duplicate(nums)` that returns True if any integer appears at least twice, using optimal time complexity.',
    answer_1:
      '```python\ndef has_duplicate(nums: list[int]) -> bool:\n    seen = set()\n    for n in nums:\n        if n in seen:\n            return True\n        seen.add(n)\n    return False\n```\nRuns in O(n) average time and O(n) space, exiting early on the first duplicate.',
    answer_2:
      '```python\ndef has_duplicate(nums: list[int]) -> bool:\n    # Iterate through each index and compare against every subsequent element\n    # to guarantee no extra memory structures are allocated during execution.\n    for i in range(len(nums)):\n        for j in range(i + 1, len(nums)):\n            if nums[i] == nums[j]:\n                return True\n    return False\n```\nThis clean nested-loop solution avoids creating auxiliary hash sets and systematically inspects every pair of numbers in the list.',
    human_winner: 1,
  },
  {
    id: 'sample-10',
    topic: 'Coding',
    question:
      'What bug exists in this JavaScript snippet and how do you fix it?\n`const nums = [10, 2, 30, 1]; nums.sort();`',
    answer_1:
      'JavaScript’s `Array.prototype.sort()` does not mutate the original array unless you assign its return value back to a variable. You should write `const sorted = nums.sort();` so that `sorted` contains `[1, 2, 10, 30]` in ascending numerical order.',
    answer_2:
      'Without a comparator function, `Array.prototype.sort()` converts elements to strings and sorts them lexicographically, producing `[1, 10, 2, 30]`. Fix it by passing a numeric comparator: `nums.sort((a, b) => a - b)` (or `nums.toSorted((a, b) => a - b)` to avoid mutating `nums`).',
    human_winner: 2,
  },
];
