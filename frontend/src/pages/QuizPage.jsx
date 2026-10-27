import { useState } from 'react';
import { Link } from 'react-router-dom';
import mockQuiz from '../data/mockQuiz';
import './QuizPage.css';

export default function QuizPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const questions = mockQuiz.questions;
  const currentQuestion = questions[currentIndex];
  const selectedAnswer = answers[currentQuestion.id];
  const answeredCount = Object.keys(answers).length;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const score = questions.reduce(
    (total, question) =>
      total + (answers[question.id] === question.correctAnswer ? 1 : 0),
    0
  );

  function selectAnswer(optionIndex) {
    if (submitted) return;

    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: optionIndex,
    }));
  }

  function submitQuiz() {
    setSubmitted(true);
    setShowConfirmation(false);
  }

  function restartQuiz() {
    setCurrentIndex(0);
    setAnswers({});
    setShowConfirmation(false);
    setSubmitted(false);
  }

  if (submitted) {
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <main className="quiz-page">
        <section className="quiz-results">
          <div className="quiz-result-icon" aria-hidden="true">
            {percentage >= 50 ? '🎉' : '📚'}
          </div>

          <p className="quiz-eyebrow">QUIZ COMPLETED</p>
          <h1>Your Results</h1>
          <p className="quiz-results-description">
            You&apos;ve completed {mockQuiz.title}.
          </p>

          <div className="quiz-score-circle">
            <strong>{percentage}%</strong>
            <span>Your score</span>
          </div>

          <p className="quiz-score-summary">
            You answered {score} out of {questions.length} questions correctly.
          </p>

          <div className="quiz-results-actions">
            <button
              type="button"
              className="quiz-button quiz-button-primary"
              onClick={restartQuiz}
            >
              Try Again
            </button>

            <Link
              to="/student-dashboard"
              className="quiz-button quiz-button-secondary"
            >
              Back to Dashboard
            </Link>
          </div>

          <section className="quiz-review">
            <h2>Review Your Answers</h2>

            {questions.map((question, index) => {
              const isCorrect =
                answers[question.id] === question.correctAnswer;

              return (
                <article className="quiz-review-item" key={question.id}>
                  <div className="quiz-review-heading">
                    <span>Question {index + 1}</span>
                    <span
                      className={
                        isCorrect ? 'review-correct' : 'review-incorrect'
                      }
                    >
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>

                  <h3>{question.question}</h3>

                  <p>
                    Your answer:{' '}
                    {answers[question.id] === undefined
                      ? 'Not answered'
                      : question.options[answers[question.id]]}
                  </p>

                  <p className="quiz-correct-answer">
                    Correct answer: {question.options[question.correctAnswer]}
                  </p>

                  <p className="quiz-explanation">{question.explanation}</p>
                </article>
              );
            })}
          </section>

          <p className="quiz-demo-note">
            Demonstration results only. Your score has not been saved.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="quiz-page">
      <header className="quiz-page-header">
        <div>
          <p className="quiz-eyebrow">PRACTICE AND LEARN</p>
          <h1>{mockQuiz.title}</h1>
          <p>{mockQuiz.description}</p>
        </div>

        <Link to="/student-dashboard" className="quiz-back-link">
          ← Dashboard
        </Link>
      </header>

      <section className="quiz-card">
        <div className="quiz-top-row">
          <span className="quiz-course-label">{mockQuiz.course}</span>
          <span className="quiz-question-count">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>

        <div
          className="quiz-progress-track"
          role="progressbar"
          aria-label="Quiz progress"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={currentIndex + 1}
        >
          <div
            className="quiz-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="quiz-question-area">
          <h2>{currentQuestion.question}</h2>
          <p className="quiz-select-instruction">Choose one answer.</p>

          <div className="quiz-options">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index;

              return (
                <button
                  key={option}
                  type="button"
                  className={`quiz-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => selectAnswer(index)}
                  aria-pressed={isSelected}
                >
                  <span className="quiz-option-letter">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="quiz-option-text">{option}</span>
                  <span className="quiz-option-indicator" aria-hidden="true">
                    {isSelected ? '✓' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="quiz-navigation">
          <button
            type="button"
            className="quiz-button quiz-button-secondary"
            onClick={() => setCurrentIndex((index) => index - 1)}
            disabled={currentIndex === 0}
          >
            ← Previous
          </button>

          <span className="quiz-answered-count">
            {answeredCount} of {questions.length} answered
          </span>

          {currentIndex < questions.length - 1 ? (
            <button
              type="button"
              className="quiz-button quiz-button-primary"
              onClick={() => setCurrentIndex((index) => index + 1)}
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              className="quiz-button quiz-button-primary"
              onClick={() => setShowConfirmation(true)}
            >
              Submit Quiz
            </button>
          )}
        </div>
      </section>

      <section className="quiz-question-navigation">
        <h2>Jump to a question</h2>

        <div className="quiz-question-numbers">
          {questions.map((question, index) => (
            <button
              key={question.id}
              type="button"
              className={[
                'quiz-number',
                currentIndex === index ? 'active' : '',
                answers[question.id] !== undefined ? 'answered' : '',
              ].join(' ')}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to question ${index + 1}`}
              aria-current={currentIndex === index ? 'step' : undefined}
            >
              {index + 1}
            </button>
          ))}
        </div>

        <p className="quiz-navigation-hint">
          Blue indicates the current question. Green indicates a question you
          have answered.
        </p>
      </section>

      {showConfirmation && (
        <div className="quiz-modal-backdrop">
          <section
            className="quiz-confirmation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quiz-confirm-title"
          >
            <h2 id="quiz-confirm-title">Submit your quiz?</h2>

            <p>
              You have answered {answeredCount} of {questions.length} questions.
            </p>

            {answeredCount < questions.length && (
              <p className="quiz-unanswered-warning">
                You still have {questions.length - answeredCount} unanswered
                question(s). You can return and answer them before submitting.
              </p>
            )}

            <div className="quiz-modal-actions">
              <button
                type="button"
                className="quiz-button quiz-button-secondary"
                onClick={() => setShowConfirmation(false)}
              >
                Go Back
              </button>

              <button
                type="button"
                className="quiz-button quiz-button-primary"
                onClick={submitQuiz}
              >
                Confirm Submit
              </button>
            </div>
          </section>
        </div>
      )}

      <p className="quiz-demo-note">
        Practice mode · Sample questions · Results are not saved.
      </p>
    </main>
  );
}
