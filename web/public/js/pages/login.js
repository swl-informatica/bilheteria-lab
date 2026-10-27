import { api } from '../api.js';
import { h } from '../dom.js';
import { clearErrors, createField, createFormAlert, showApiError } from '../forms.js';
import { navigate, safeReturnPath } from '../router.js';
import { saveSession } from '../session.js';

export function loginPage(ctx) {
  ctx.setTitle('Entrar');
  const returnTo = safeReturnPath(ctx.query.get('next') || '/');

  const alert = createFormAlert();
  const fields = {
    email: createField({ label: 'E-mail', name: 'email', type: 'email', autocomplete: 'username' }),
    password: createField({ label: 'Senha', name: 'password', type: 'password', autocomplete: 'current-password' }),
  };
  const submit = h('button', { type: 'submit' }, 'Entrar');

  const form = h(
    'form',
    { novalidate: true, 'aria-label': 'Login', 'data-testid': 'login-form' },
    alert,
    fields.email.wrapper,
    fields.password.wrapper,
    h('div', { class: 'actions' }, submit),
  );
  ctx.root.append(form);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors({ alert, fields });
    submit.disabled = true;
    try {
      const result = await api.login({
        email: fields.email.input.value,
        password: fields.password.input.value,
      });
      saveSession({ token: result.token, expiresAt: result.expiresAt, user: result.user });
      navigate(returnTo.startsWith('/login') ? '/' : returnTo, { replace: true });
    } catch (error) {
      if (!ctx.isCurrent()) return;
      const first = showApiError(error, { alert, fields });
      if (first) first.input.focus();
    } finally {
      submit.disabled = false;
    }
  });
}
