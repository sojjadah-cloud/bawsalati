"use client";

// حقول النماذج: تسمية ظاهرة دائماً، وصف مساعد، وخطأ مرتبط بالحقل عبر aria.
import {
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { AlertCircle } from "lucide-react";
import { Spinner } from "./primitives";

interface FieldShellProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: (ids: { inputId: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

function FieldShell({ label, required, hint, error, children }: FieldShellProps) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={inputId} className="label">
        {label}
        {required ? (
          <>
            {" "}
            <span className="required-mark" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(مطلوب)</span>
          </>
        ) : null}
      </label>
      {children({ inputId, describedBy, invalid: !!error })}
      {hint && !error ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="field-error">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  hint?: string;
  error?: string;
};

export function TextField({ label, hint, error, required, ...rest }: TextFieldProps) {
  return (
    <FieldShell label={label} required={required} hint={hint} error={error}>
      {({ inputId, describedBy, invalid }) => (
        <input
          id={inputId}
          className="input"
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  label: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
};

export function SelectField({
  label,
  hint,
  error,
  required,
  options,
  placeholder,
  ...rest
}: SelectFieldProps) {
  return (
    <FieldShell label={label} required={required} hint={hint} error={error}>
      {({ inputId, describedBy, invalid }) => (
        <select
          id={inputId}
          className="select"
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          {...rest}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}

type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  label: string;
  hint?: string;
  error?: string;
};

export function TextAreaField({ label, hint, error, required, ...rest }: TextAreaFieldProps) {
  return (
    <FieldShell label={label} required={required} hint={hint} error={error}>
      {({ inputId, describedBy, invalid }) => (
        <textarea
          id={inputId}
          className="textarea"
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

export function CheckboxField({
  label,
  error,
  checked,
  onChange,
  name,
}: {
  label: ReactNode;
  error?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  name?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-1 h-5 w-5 shrink-0 cursor-pointer rounded border-[var(--color-line-strong)] accent-[var(--color-brand-700)]"
        />
        <label htmlFor={id} className="cursor-pointer text-sm leading-relaxed text-slate-700">
          {label}
        </label>
      </div>
      {error ? (
        <p id={errorId} className="field-error">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

/** زر إرسال يمنع النقر المزدوج ويعلن حالته للقارئات الشاشية. */
export function SubmitButton({
  loading,
  children,
  className = "btn-primary",
  disabled,
  ...rest
}: {
  loading?: boolean;
  children: ReactNode;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">) {
  return (
    <button
      type="submit"
      className={className}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}
