const mockQuiz = {
  id: 'quiz-001',
  title: 'Introduction to Computer Science',
  course: 'Computer Science',
  description: 'Test your understanding of basic computer concepts.',
  questions: [
    {
      id: 1,
      question: "What is the main purpose of a computer's CPU?",
      options: [
        'To print documents',
        'To process instructions',
        'To display images only',
        'To store files permanently',
      ],
      correctAnswer: 1,
      explanation:
        'The CPU executes instructions and performs calculations needed to run programs.',
    },
    {
      id: 2,
      question: 'Which of these is an input device?',
      options: ['Monitor', 'Printer', 'Keyboard', 'Speaker'],
      correctAnswer: 2,
      explanation:
        'A keyboard lets users enter data and commands into a computer.',
    },
    {
      id: 3,
      question: 'Which language is commonly used to structure web pages?',
      options: ['HTML', 'SQL', 'Python', 'C'],
      correctAnswer: 0,
      explanation: 'HTML defines the structure and content of web pages.',
    },
    {
      id: 4,
      question: 'What does RAM mainly provide to a running computer?',
      options: [
        'Permanent file storage',
        'Temporary working memory',
        'A printed copy of data',
        'An internet connection',
      ],
      correctAnswer: 1,
      explanation:
        'RAM temporarily holds data and instructions that the computer is actively using.',
    },
    {
      id: 5,
      question: 'Which of these is an example of an operating system?',
      options: ['Google Chrome', 'Microsoft Word', 'Windows', 'HTML'],
      correctAnswer: 2,
      explanation:
        'Windows is an operating system that manages computer hardware and software.',
    },
  ],
};

export default mockQuiz;
