// Small helper to build DOM nodes without innerHTML.
export function h(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') element.className = value;
    else if (key === 'dataset') Object.assign(element.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) element.setAttribute(key, '');
    else element.setAttribute(key, String(value));
  }
  append(element, children);
  return element;
}

export function append(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child === undefined || child === null || child === false) continue;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

export function clear(element) {
  while (element.firstChild) element.firstChild.remove();
}

// Definition list with label/value pairs. Each pair may carry a data-testid for the value.
export function details(pairs) {
  const list = h('dl', { class: 'details' });
  for (const pair of pairs) {
    if (!pair) continue;
    const [label, value, testId] = pair;
    list.append(h('dt', {}, label), h('dd', { 'data-testid': testId }, value));
  }
  return list;
}
