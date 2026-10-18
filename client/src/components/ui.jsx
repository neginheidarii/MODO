import { forwardRef, useEffect, useRef } from 'react';
import { Icon } from '../icons.jsx';

export const Button = forwardRef(function Button({ children, variant = 'primary', small, type = 'button', ...props }, ref) {
  return <button ref={ref} type={type} className={`button button-${variant}${small ? ' small' : ''}`} {...props}>{children}</button>;
});

export function IconButton({ label, children, tinted, ...props }) {
  return <button type="button" className={`icon-button${tinted ? ' tinted' : ''}`} aria-label={label} title={label} {...props}>{children}</button>;
}

export function Hero({ kicker, title, text, children }) {
  return (
    <div className="page-hero">
      <div>
        <div className="eyebrow">{kicker}</div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {children ? <div className="hero-actions">{children}</div> : null}
    </div>
  );
}

export function Empty({ title, text, action, onAction }) {
  return (
    <div className="empty-state">
      <Icon name="sparkle" size={23} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action ? <Button variant="soft" small onClick={onAction}>{action}</Button> : null}
    </div>
  );
}

export function Modal({ title, subtitle, wide, onClose, children }) {
  return (
    <div className="modal-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={`dialog${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="dialog-header">
          <div>
            <div className="eyebrow">MODO / YOUR SPACE</div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <IconButton label="Close dialog" tinted onClick={onClose}><Icon name="close" /></IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, text, confirmLabel = 'Remove', onCancel, onConfirm }) {
  const keepRef = useRef(null);
  useEffect(() => {
    keepRef.current?.focus();
    const onKey = event => { if (event.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div className="modal-overlay confirm-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onCancel(); }}>
      <div className="dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-text">
        <div className="eyebrow">Please confirm</div>
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-text">{text}</p>
        <div className="confirm-actions">
          <Button variant="outline" ref={keepRef} onClick={onCancel}>Keep it</Button>
          <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return <div className="form-field"><label>{label}</label>{children}</div>;
}

export function TextInput(props) {
  return <input {...props} />;
}

export function Select({ value, onChange, options, label }) {
  return (
    <select aria-label={label} value={value} onChange={onChange}>
      {options.map(option => {
        const [id, name] = Array.isArray(option) ? option : [option, option];
        return <option key={id} value={id}>{name}</option>;
      })}
    </select>
  );
}

export function Filters({ label, values, current, onChange }) {
  return (
    <div className="filters" role="group" aria-label={label}>
      {values.map(value => (
        <button key={value} type="button" className={`filter${current === value ? ' active' : ''}`} onClick={() => onChange(value)}>{value}</button>
      ))}
    </div>
  );
}
