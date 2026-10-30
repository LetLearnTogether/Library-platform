import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { apiRequest } from '../lib/api';
import './QuizManagementPage.css';

const PAGE_SIZE = 20;

function createQuestion() {
  return { question_text: '', options: ['', ''], correct_answer_index: 0 };
}

function createForm() {
  return {
    course_id: '',
    title: '',
    type: 'MCQ',
    is_published: false,
    questions: [createQuestion()],
  };
}

export default function QuizManagementPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [form, setForm] = useState(createForm);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest('/courses?page=1&page_size=100'),
      apiRequest(`/quizzes/manage?page=${page}&page_size=${PAGE_SIZE}`),
    ])
      .then(([coursePage, quizPage]) => {
        if (!active) return;
        const availableCourses = user.role === 'Lecturer'
          ? coursePage.items.filter((course) => course.lecturer_id === user.id)
          : coursePage.items;
        setCourses(availableCourses);
        setQuizzes(quizPage.items);
        setTotalPages(quizPage.total_pages);
        setTotalItems(quizPage.total_items);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Could not load quiz management.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [page, reload, user.id, user.role]);

  function startNewQuiz() {
    setError('');
    setMessage('');
    setEditingId(null);
    setForm({ ...createForm(), course_id: courses.length === 1 ? String(courses[0].id) : '' });
    setView('form');
  }

  async function editQuiz(quizId) {
    setWorking(true);
    setError('');
    setMessage('');
    try {
      const quiz = await apiRequest(`/quizzes/${quizId}/manage`);
      setEditingId(quiz.id);
      setForm({
        course_id: String(quiz.course_id),
        title: quiz.title,
        type: quiz.type || '',
        is_published: quiz.is_published,
        questions: quiz.questions.map((question) => ({
          question_text: question.question_text,
          options: [...question.options],
          correct_answer_index: question.correct_answer_index,
        })),
      });
      setView('form');
    } catch (requestError) {
      setError(requestError.message || 'Could not open this quiz for editing.');
    } finally {
      setWorking(false);
    }
  }

  function updateQuestion(questionIndex, changes) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) => (
        index === questionIndex ? { ...question, ...changes } : question
      )),
    }));
  }

  function updateOption(questionIndex, optionIndex, value) {
    const question = form.questions[questionIndex];
    updateQuestion(questionIndex, {
      options: question.options.map((option, index) => (index === optionIndex ? value : option)),
    });
  }

  function addOption(questionIndex) {
    const question = form.questions[questionIndex];
    if (question.options.length >= 10) return;
    updateQuestion(questionIndex, { options: [...question.options, ''] });
  }

  function removeOption(questionIndex, optionIndex) {
    const question = form.questions[questionIndex];
    if (question.options.length <= 2) return;
    const options = question.options.filter((_, index) => index !== optionIndex);
    let correctAnswerIndex = question.correct_answer_index;
    if (optionIndex < correctAnswerIndex) correctAnswerIndex -= 1;
    else if (optionIndex === correctAnswerIndex) correctAnswerIndex = Math.min(optionIndex, options.length - 1);
    updateQuestion(questionIndex, { options, correct_answer_index: correctAnswerIndex });
  }

  function addQuestion() {
    setForm((current) => ({ ...current, questions: [...current.questions, createQuestion()] }));
  }

  function removeQuestion(questionIndex) {
    setForm((current) => ({
      ...current,
      questions: current.questions.filter((_, index) => index !== questionIndex),
    }));
  }

  async function saveQuiz(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    const hasInvalidQuestion = form.questions.some((question) => (
      !question.question_text.trim()
      || question.options.some((option) => !option.trim())
      || question.correct_answer_index >= question.options.length
    ));
    if (hasInvalidQuestion) {
      setError('Complete each question and option, then choose its correct answer.');
      return;
    }

    setWorking(true);
    try {
      const payload = {
        title: form.title.trim(),
        type: form.type.trim() || null,
        is_published: form.is_published,
        questions: form.questions.map((question) => ({
          question_text: question.question_text.trim(),
          options: question.options.map((option) => option.trim()),
          correct_answer_index: question.correct_answer_index,
        })),
      };

      if (editingId) {
        await apiRequest(`/quizzes/${editingId}`, { method: 'PUT', body: payload });
        setMessage('Quiz changes saved.');
      } else {
        await apiRequest('/quizzes', {
          method: 'POST',
          body: { ...payload, course_id: Number(form.course_id) },
        });
        setMessage('Quiz created.');
      }

      setEditingId(null);
      setForm(createForm());
      setView('list');
      setLoading(true);
      setReload((current) => current + 1);
    } catch (requestError) {
      setError(requestError.message || 'The quiz could not be saved.');
    } finally {
      setWorking(false);
    }
  }

  async function deleteQuiz(quiz) {
    if (!window.confirm(`Delete "${quiz.title}"? Quizzes with recorded attempts cannot be deleted.`)) return;
    setWorking(true);
    setError('');
    setMessage('');
    try {
      await apiRequest(`/quizzes/${quiz.id}`, { method: 'DELETE' });
      setMessage('Quiz deleted.');
      if (quizzes.length === 1 && page > 1) {
        setLoading(true);
        setPage((current) => current - 1);
      }
      else {
        setLoading(true);
        setReload((current) => current + 1);
      }
    } catch (requestError) {
      setError(requestError.message || 'The quiz could not be deleted.');
    } finally {
      setWorking(false);
    }
  }

  function cancelForm() {
    setError('');
    setEditingId(null);
    setForm(createForm());
    setView('list');
  }

  return (
    <main className="quiz-management-page">
      <header className="quiz-management-header">
        <div>
          <p className="quiz-eyebrow">{user.role === 'Admin' ? 'ADMINISTRATION' : 'LECTURER WORKSPACE'}</p>
          <h1>Quiz management</h1>
          <p>Create practice quizzes, manage questions, and publish them for students.</p>
        </div>
        <Link to="/quizzes" className="quiz-management-link">View published quizzes</Link>
      </header>

      {error && <p className="app-status" role="alert">{error}</p>}
      {message && <p className="app-status" role="status">{message}</p>}

      {view === 'form' ? (
        <form className="quiz-editor" onSubmit={saveQuiz}>
          <div className="quiz-editor-heading">
            <div>
              <h2>{editingId ? 'Edit quiz' : 'Create a quiz'}</h2>
              <p>Correct answers are only shown here to authorized quiz editors.</p>
            </div>
            <button type="button" className="quiz-management-secondary" onClick={cancelForm} disabled={working}>Cancel</button>
          </div>

          <div className="quiz-editor-fields">
            <label>
              Quiz title
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                maxLength={255}
                required
              />
            </label>
            <label>
              Course
              <select
                value={form.course_id}
                onChange={(event) => setForm((current) => ({ ...current, course_id: event.target.value }))}
                disabled={Boolean(editingId)}
                required
              >
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option value={course.id} key={course.id}>{course.course_code} — {course.course_title}</option>
                ))}
              </select>
              {editingId && <small>The course cannot be changed after quiz creation.</small>}
            </label>
            <label>
              Quiz type
              <input
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
                maxLength={50}
                placeholder="MCQ"
              />
            </label>
          </div>

          <label className="quiz-publish-toggle">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(event) => setForm((current) => ({ ...current, is_published: event.target.checked }))}
            />
            <span><strong>Published</strong><small>Published quizzes are visible to students.</small></span>
          </label>

          <div className="quiz-question-editor-heading">
            <div><h3>Questions</h3><p>Add at least one question. Each question needs two or more choices.</p></div>
            <button type="button" className="quiz-management-secondary" onClick={addQuestion}>Add question</button>
          </div>

          <div className="quiz-question-editors">
            {form.questions.map((question, questionIndex) => (
              <section className="quiz-question-editor" key={questionIndex}>
                <div className="quiz-question-editor-title">
                  <h4>Question {questionIndex + 1}</h4>
                  {form.questions.length > 1 && (
                    <button type="button" className="quiz-remove-button" onClick={() => removeQuestion(questionIndex)}>Remove</button>
                  )}
                </div>
                <label>
                  Question text
                  <textarea
                    value={question.question_text}
                    onChange={(event) => updateQuestion(questionIndex, { question_text: event.target.value })}
                    maxLength={5000}
                    rows={3}
                    required
                  />
                </label>
                <fieldset className="quiz-options-editor">
                  <legend>Answer choices</legend>
                  {question.options.map((option, optionIndex) => (
                    <div className="quiz-option-editor-row" key={optionIndex}>
                      <label>
                        <span className="quiz-option-editor-letter">{String.fromCharCode(65 + optionIndex)}</span>
                        <input
                          value={option}
                          onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)}
                          maxLength={1000}
                          required
                          aria-label={`Question ${questionIndex + 1}, option ${optionIndex + 1}`}
                        />
                      </label>
                      <label className="quiz-correct-answer">
                        <input
                          type="radio"
                          name={`correct-answer-${questionIndex}`}
                          checked={question.correct_answer_index === optionIndex}
                          onChange={() => updateQuestion(questionIndex, { correct_answer_index: optionIndex })}
                        />
                        Correct
                      </label>
                      {question.options.length > 2 && (
                        <button
                          type="button"
                          className="quiz-remove-button"
                          onClick={() => removeOption(questionIndex, optionIndex)}
                          aria-label={`Remove option ${optionIndex + 1}`}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  {question.options.length < 10 && (
                    <button type="button" className="quiz-add-option" onClick={() => addOption(questionIndex)}>Add answer choice</button>
                  )}
                </fieldset>
              </section>
            ))}
          </div>

          <div className="quiz-editor-actions">
            <button type="button" className="quiz-management-secondary" onClick={cancelForm} disabled={working}>Cancel</button>
            <button type="submit" className="quiz-management-primary" disabled={working || !form.course_id && !editingId}>
              {working ? 'Saving…' : editingId ? 'Save changes' : 'Create quiz'}
            </button>
          </div>
        </form>
      ) : (
        <section className="quiz-management-panel">
          <div className="quiz-management-panel-heading">
            <div>
              <h2>Your quizzes</h2>
              <p>{totalItems} {totalItems === 1 ? 'quiz' : 'quizzes'} available to manage.</p>
            </div>
            <button type="button" className="quiz-management-primary" onClick={startNewQuiz} disabled={loading || courses.length === 0}>
              Create quiz
            </button>
          </div>

          {loading ? (
            <p className="app-status" role="status">Loading your quizzes…</p>
          ) : error && quizzes.length === 0 ? (
            <button type="button" className="quiz-management-secondary" onClick={() => { setLoading(true); setError(''); setReload((current) => current + 1); }}>
              Try again
            </button>
          ) : quizzes.length ? (
            <>
              <div className="quiz-management-list">
                {quizzes.map((quiz) => (
                  <article className="quiz-management-item" key={quiz.id}>
                    <div className="quiz-management-item-copy">
                      <span className="quiz-management-course">{quiz.course.course_code} · {quiz.course.year} · {quiz.course.semester} semester</span>
                      <h3>{quiz.title}</h3>
                      <p>{quiz.questions.length} {quiz.questions.length === 1 ? 'question' : 'questions'}</p>
                    </div>
                    <span className={`quiz-publication-status ${quiz.is_published ? 'is-published' : 'is-draft'}`}>
                      {quiz.is_published ? 'Published' : 'Draft'}
                    </span>
                    <div className="quiz-management-item-actions">
                      <button type="button" className="quiz-management-secondary" onClick={() => editQuiz(quiz.id)} disabled={working}>Edit</button>
                      <button type="button" className="quiz-remove-button" onClick={() => deleteQuiz(quiz)} disabled={working}>Delete</button>
                    </div>
                  </article>
                ))}
              </div>
              {totalPages > 1 && (
                <nav className="quiz-management-pagination" aria-label="Quiz management pages">
                  <button type="button" className="quiz-management-secondary" disabled={page === 1 || working} onClick={() => { setLoading(true); setPage((current) => current - 1); }}>Previous</button>
                  <span>Page {page} of {totalPages}</span>
                  <button type="button" className="quiz-management-secondary" disabled={page === totalPages || working} onClick={() => { setLoading(true); setPage((current) => current + 1); }}>Next</button>
                </nav>
              )}
            </>
          ) : (
            <div className="quiz-management-empty">
              <span aria-hidden="true">✎</span>
              <h3>{courses.length ? 'No quizzes yet' : 'No courses assigned'}</h3>
              <p>{courses.length ? 'Create your first quiz for one of your courses.' : 'Ask an administrator to assign a course before creating quizzes.'}</p>
              {courses.length > 0 && (
                <button type="button" className="quiz-management-primary" onClick={startNewQuiz}>Create quiz</button>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
