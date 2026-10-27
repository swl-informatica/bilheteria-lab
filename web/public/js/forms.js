import { h } from './dom.js';

let fieldSequence = 0;

// Builds a labelled input or select with an associated error message.
export function createField({ label, name, type = 'text', control = 'input', options, hint, testId, ...attrs }) {
  fieldSequence += 1;
  const id = attrs.id || `field-${name.replace(/[^a-zA-Z0-9-]/g, '-')}-${fieldSequence}`;
  delete attrs.id;
  const errorId = `${id}-error`;
  const hintId = hint ? `${id}-hint` : undefined;

  let input;
  if (control === 'select') {
    input = h(
      'select',
      { id, name, 'data-testid': testId, ...attrs },
      (options || []).map(([value, text]) => h('option', { value }, text)),
    );
  } else {
    input = h('input', { id, name, type, 'data-testid': testId, ...attrs });
  }
  if (hintId) input.setAttribute('aria-describedby', hintId);

  const error = h('p', { class: 'field-error', id: errorId });
  const wrapper = h(
    'div',
    { class: 'field' },
    h('label', { for: id }, label),
    hint ? h('span', { class: 'hint', id: hintId }, hint) : null,
    input,
    error,
  );
  return { wrapper, input, error, hintId };
}

export function setFieldError(field, message) {
  field.error.textContent = message;
  field.input.setAttribute('aria-invalid', 'true');
  const describedBy = [field.hintId, field.error.id].filter(Boolean).join(' ');
  field.input.setAttribute('aria-describedby', describedBy);
}

export function clearFieldError(field) {
  field.error.textContent = '';
  field.input.removeAttribute('aria-invalid');
  if (field.hintId) field.input.setAttribute('aria-describedby', field.hintId);
  else field.input.removeAttribute('aria-describedby');
}

// Top-of-form message area.
export function createFormAlert(testId = 'form-error') {
  return h('div', { class: 'form-alert', role: 'alert', 'data-testid': testId });
}

// Shows an API error: field messages next to their fields and the main message on top.
// Returns the first field that received a message, so the caller can move focus to it.
export function showApiError(error, { alert, fields = {} }) {
  if (alert) alert.textContent = error.message;
  let first = null;
  const messages = error.fields || {};
  for (const [key, field] of Object.entries(fields)) {
    const message = messages[key];
    if (!message) continue;
    setFieldError(field, message);
    if (!first) first = field;
  }
  return first;
}

export function clearErrors({ alert, fields = {} }) {
  if (alert) alert.textContent = '';
  for (const field of Object.values(fields)) clearFieldError(field);
}
