import './Button.css';

function Button({
  children,
  variant = 'primary',
  type = 'button',
  disabled = false,
  loading = false,
  className = '',
  onClick,
  ...props
}) {
  const buttonClasses = [
    'ui-button',
    `ui-button--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? 'Please wait...' : children}
    </button>
  );
}

export default Button;
