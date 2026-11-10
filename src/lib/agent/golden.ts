export type GoldenDoubt = {
  id: string
  question: string
  expected: number
}

export const goldenDoubts: GoldenDoubt[] = [
  {
    id: 'profit',
    question: 'A shopkeeper buys 12 pens at 15 rupees each and sells them at 20 rupees each. What is the total profit?',
    expected: 60,
  },
  {
    id: 'linear-equation',
    question: 'Solve 2x + 5 = 17. What is x?',
    expected: 6,
  },
  {
    id: 'circle-area',
    question: 'Find the area of a circle of radius 7 cm. Take pi as 22/7.',
    expected: 154,
  },
  {
    id: 'natural-sum',
    question: 'What is the sum of the first 20 natural numbers?',
    expected: 210,
  },
  {
    id: 'larger-root',
    question: 'Factorise x^2 - 5x + 6. What is the larger root?',
    expected: 3,
  },
  {
    id: 'derivative',
    question: 'Find the derivative of 3x^2 + 2x at x = 4.',
    expected: 26,
  },
  {
    id: 'speed',
    question: 'A train travels 240 km in 3 hours. What is its speed in km/h?',
    expected: 80,
  },
  {
    id: 'triangle-angles',
    question: 'The angles of a triangle are in the ratio 2:3:4. What is the largest angle in degrees?',
    expected: 80,
  },
  {
    id: 'percentage',
    question: 'What is 15 percent of 240?',
    expected: 36,
  },
  {
    id: 'smaller-root',
    question: 'Solve x^2 - 7x + 12 = 0. What is the smaller root?',
    expected: 3,
  },
]
