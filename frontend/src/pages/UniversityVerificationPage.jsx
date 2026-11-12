import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { verificationStatusMeta } from '../data/mockVerificationApplications';
import { apiRequest } from '../lib/api';
import './UniversityVerificationPage.css';

const universities = ['Williams V. S. Tubman University'];
const collegeDepartments = {
  'College of Agriculture & Food Science': ['General Agriculture', 'Agronomy'],
  'College of Business Administration': [
    'Accounting',
    'Banking & Finance',
    'Business Administration',
    'Economics',
    'Public Administration',
  ],
  'College of Health Sciences': ['Public Health', 'Nursing and Midwifery'],
  'College of Arts & Sciences': ['Environmental Studies', 'Biology', 'Psychology'],
  'College of Engineering & Technology': [
    'Civil Engineering',
    'Computer Science',
    'Electrical Engineering',
    'Mechanical Engineering',
  ],
  'Dr. Elizabeth Davis-Russell College of Education (EDRCE)': [
    'Early Childhood Education Development',
    'Primary Education',
    'Secondary Education - Biology',
    'Secondary Education - Chemistry',
    'Secondary Education - English and Literature',
    'Secondary Education - History',
    'Secondary Education - Mathematics',
    'Guidance and Counseling',
  ],
};

const emptyForm = {
  university: 'Williams V. S. Tubman University',
  fullName: '',
  studentNumber: '',
  college: '',
  department: '',
  academicYear: '2026-2027',
  consent: false,
};

const verificationStages = [
  { key: 'not_submitted', label: 'Not submitted' },
  { key: 'pending', label: 'Pending' },
  { key: 'under_review', label: 'Under review' },
  { key: 'needs_resubmission', label: 'Needs resubmission' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export default function UniversityVerificationPage({ submission, onSubmitted } = {}) {
  const [form, setForm] = useState(emptyForm);
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [previewFront, setPreviewFront] = useState('');
  const [previewBack, setPreviewBack] = useState('');
  const fileInputFrontRef = useRef(null);
  const fileInputBackRef = useRef(null);

  function validateImage(file, kind) {
    if (!file) return '';
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(file.type) && !['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      return `The ${kind} image must be a JPG, PNG, or WebP file.`;
    }
    if (file.size > 5 * 1024 * 1024) {
      return `The ${kind} image cannot exceed 5 MB.`;
    }
    return '';
  }

  function handleFieldChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'college' ? { department: '' } : {}),
    }));
  }

  function handleImageChange(event, side) {
    const file = event.target.files?.[0] || null;
    const issue = file ? validateImage(file, side === 'front' ? 'front ID' : 'back ID') : '';
    if (issue) {
      setError(issue);
      return;
    }
    setError('');
    const previewUrl = file ? URL.createObjectURL(file) : '';
    if (side === 'front') {
      setFrontImage(file);
      setPreviewFront(previewUrl);
    } else {
      setBackImage(file);
      setPreviewBack(previewUrl);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!form.fullName.trim() || !form.studentNumber.trim()) {
      setError('Complete your full name and student registration number before submitting.');
      return;
    }
    if (!frontImage) {
      setError('Upload a clear front image of your student ID card.');
      return;
    }
    if (!form.consent) {
      setError('Please confirm that the information provided is accurate and that you consent to review.');
      return;
    }

    const body = new FormData();
    body.set('full_name', form.fullName.trim());
    body.set('student_number', form.studentNumber.trim());
    body.set('university', form.university);
    body.set('college', form.college);
    body.set('department', form.department);
    body.set('academic_year', form.academicYear.trim());
    body.set('front_image', frontImage);
    if (backImage) body.set('back_image', backImage);

    setSubmitting(true);
    try {
      const savedSubmission = await apiRequest('/student-verifications', { method: 'POST', body });
      onSubmitted?.(savedSubmission);
      setForm(emptyForm);
      setFrontImage(null);
      setBackImage(null);
      setPreviewFront('');
      setPreviewBack('');
      if (fileInputFrontRef.current) fileInputFrontRef.current.value = '';
      if (fileInputBackRef.current) fileInputBackRef.current.value = '';
    } catch (requestError) {
      setError(requestError.message || 'Your verification could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="verification-page-shell">
      <header className="verification-page-header">
        <div>
          <p className="eyebrow">UNIVERSITY VERIFICATION</p>
          <h1>Student ID verification</h1>
        </div>
        {submission && <Link to="/student-dashboard" className="secondary-button">Continue to dashboard</Link>}
      </header>

      <section className="verification-status-grid" aria-label="Verification status overview">
        {verificationStages.map((stage) => (
          <article key={stage.key} className={`verification-pill verification-pill-${verificationStatusMeta[stage.key]?.tone || 'neutral'}`}>
            <span>{stage.label}</span>
          </article>
        ))}
      </section>

      <section className="verification-layout">
        {submission && submission.status !== 'Rejected' ? (
          <section className="verification-submission-card" aria-live="polite">
            <p className="eyebrow">SUBMITTED TO ADMIN</p>
            <h2>Student verification {submission.status.toLowerCase()}</h2>
            <p>Your student ID and college details have been saved and sent to the Admin for review. You can now use the student platform.</p>
            <dl>
              <div><dt>College</dt><dd>{submission.college}</dd></div>
              <div><dt>Department</dt><dd>{submission.department}</dd></div>
              <div><dt>Status</dt><dd>{submission.status}</dd></div>
              <div><dt>Submitted</dt><dd>{new Date(submission.submitted_at).toLocaleString()}</dd></div>
              {submission.review_note && <div><dt>Admin note</dt><dd>{submission.review_note}</dd></div>}
            </dl>
            <Link to="/student-dashboard" className="primary-button">Continue to dashboard</Link>
          </section>
        ) : (
        <form className="verification-form-card" onSubmit={handleSubmit}>
          {submission?.status === 'Rejected' && (
            <div className="form-error" role="alert">
              <p>Your previous verification was rejected. Update your details or images and submit it again.</p>
              {submission.review_note && <p>Admin note: {submission.review_note}</p>}
            </div>
          )}
          <div className="verification-stepper">
            <span className="verification-step">Step 1 of 3</span>
            <h2>University information</h2>
          </div>

          <label>
            University
            <select name="university" value={form.university} onChange={handleFieldChange}>
              {universities.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <div className="verification-two-column">
            <label>
              Full name as printed on student ID
              <input name="fullName" value={form.fullName} onChange={handleFieldChange} placeholder="Enter your full name" />
            </label>
            <label>
              Student registration number
              <input name="studentNumber" value={form.studentNumber} onChange={handleFieldChange} placeholder="Enter your student number" />
            </label>
          </div>

          <div className="verification-two-column">
            <label>
              College
              <select name="college" value={form.college} onChange={handleFieldChange} required>
                <option value="">Select your college</option>
                {Object.keys(collegeDepartments).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Department
              <select name="department" value={form.department} onChange={handleFieldChange} disabled={!form.college} required>
                <option value="">Select your department</option>
                {(collegeDepartments[form.college] || []).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Academic year
            <input name="academicYear" value={form.academicYear} onChange={handleFieldChange} />
          </label>

          <div className="verification-stepper verification-stepper-spaced">
            <span className="verification-step">Step 2 of 3</span>
            <h2>Upload student ID card</h2>
          </div>

          <div className="verification-upload-box">
            <div className="verification-file-picker">
              <label htmlFor="front-id-upload">Front of student ID card (required)</label>
              <input id="front-id-upload" ref={fileInputFrontRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(event) => handleImageChange(event, 'front')} />
              <button type="button" className="secondary-button" onClick={() => fileInputFrontRef.current?.click()}>Choose file</button>
            </div>
            {previewFront ? <img src={previewFront} alt="Front of student ID" className="verification-preview" /> : <div className="verification-empty-preview">No front image selected</div>}
          </div>

          <div className="verification-upload-box">
            <div className="verification-file-picker">
              <label htmlFor="back-id-upload">Back of student ID card (optional)</label>
              <input id="back-id-upload" ref={fileInputBackRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(event) => handleImageChange(event, 'back')} />
              <button type="button" className="secondary-button" onClick={() => fileInputBackRef.current?.click()}>Choose file</button>
            </div>
            {previewBack ? <img src={previewBack} alt="Back of student ID" className="verification-preview" /> : <div className="verification-empty-preview">No back image selected</div>}
          </div>

          <div className="verification-stepper verification-stepper-spaced">
            <span className="verification-step">Step 3 of 3</span>
            <h2>Consent and submission</h2>
          </div>

          <div className="verification-consent">
            <p>By submitting, you confirm that:</p>
            <ul>
              <li>The ID belongs to you.</li>
              <li>The information is accurate.</li>
              <li>You authorize the platform to inspect the document for verification.</li>
              <li>The document will only be accessible to authorized reviewers.</li>
            </ul>
            <label className="verification-checkbox-row">
              <input type="checkbox" name="consent" checked={form.consent} onChange={handleFieldChange} />
              <span>I agree to the privacy notice and consent to review.</span>
            </label>
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Submitting to Admin…' : 'Submit verification request'}
          </button>
        </form>
        )}
      </section>
    </main>
  );
}
