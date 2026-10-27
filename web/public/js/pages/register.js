import { api } from '../api.js';
import { h } from '../dom.js';
import { clearErrors, createField, createFormAlert, setFieldError, showApiError } from '../forms.js';
import { navigate } from '../router.js';

const PASSWORD_MISMATCH = 'As senhas não conferem.';

function cpfField() {
  const input = h('input', { id: 'cpf', name: 'cpf', inputmode: 'numeric', autocomplete: 'off' });
  const error = h('p', { class: 'field-error', id: 'cpf-error' });
  const wrapper = h('div', { class: 'field' }, h('label', {}, 'CPF'), input, error);
  return { wrapper, input, error };
}

export function registerPage(ctx) {
  ctx.setTitle('Cadastro');

  const alert = createFormAlert();
  const fields = {
    name: createField({ label: 'Nome', name: 'name', autocomplete: 'name' }),
    email: createField({ label: 'E-mail', name: 'email', type: 'email', autocomplete: 'email' }),
    cpf: cpfField(),
    birthDate: createField({ label: 'Data de nascimento', name: 'birthDate', type: 'date', autocomplete: 'bday' }),
    password: createField({ label: 'Senha', name: 'password', type: 'password', autocomplete: 'new-password' }),
  };
  const confirmation = createField({
    label: 'Confirmação da senha',
    name: 'passwordConfirmation',
    type: 'password',
    autocomplete: 'new-password',
  });
  const submit = h('button', { type: 'submit' }, 'Cadastrar');

  const form = h(
    'form',
    { novalidate: true, 'aria-label': 'Cadastro', 'data-testid': 'register-form' },
    alert,
    Object.values(fields).map((field) => field.wrapper),
    confirmation.wrapper,
    h('div', { class: 'actions' }, submit),
  );
  ctx.root.append(form);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors({ alert, fields: { ...fields, passwordConfirmation: confirmation } });

    if (fields.password.input.value !== confirmation.input.value) {
      setFieldError(confirmation, PASSWORD_MISMATCH);
      confirmation.input.focus();
      return;
    }

    const body = {
      name: fields.name.input.value,
      email: fields.email.input.value,
      cpf: fields.cpf.input.value,
      birthDate: fields.birthDate.input.value,
      password: fields.password.input.value,
    };

    submit.disabled = true;
    try {
      await api.register(body);
      navigate('/login');
    } catch (error) {
      if (!ctx.isCurrent()) return;
      const first = showApiError(error, { alert, fields });
      if (first) first.input.focus();
    } finally {
      submit.disabled = false;
    }
  });
}
