CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  email         text        NOT NULL,
  cpf           text        NOT NULL CHECK (cpf ~ '^[0-9]{11}$'),
  birth_date    date        NOT NULL,
  password_hash text        NOT NULL,
  role          text        NOT NULL DEFAULT 'BUYER' CHECK (role IN ('BUYER', 'ADMIN')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_key UNIQUE (email),
  CONSTRAINT users_cpf_key UNIQUE (cpf)
);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);

CREATE TABLE login_attempts (
  email        text PRIMARY KEY,
  failed_count integer     NOT NULL DEFAULT 0,
  locked       boolean     NOT NULL DEFAULT false,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  venue         text        NOT NULL,
  description   text        NOT NULL,
  age_rating    text        NOT NULL CHECK (age_rating IN ('L', '10', '12', '14', '16', '18')),
  sales_open_on date        NOT NULL,
  starts_at     timestamptz NOT NULL,
  canceled_at   timestamptz
);

CREATE INDEX events_starts_at_idx ON events (starts_at);

CREATE TABLE sectors (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid    NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  name       text    NOT NULL,
  full_price integer NOT NULL CHECK (full_price >= 0),
  capacity   integer NOT NULL CHECK (capacity >= 0),
  position   integer NOT NULL DEFAULT 0
);

CREATE INDEX sectors_event_id_idx ON sectors (event_id);

CREATE TABLE coupons (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text    NOT NULL UNIQUE,
  percent       integer NOT NULL CHECK (percent BETWEEN 0 AND 100),
  starts_on     date    NOT NULL,
  ends_on       date    NOT NULL,
  usage_limit   integer NOT NULL CHECK (usage_limit >= 0),
  min_amount    integer NOT NULL DEFAULT 0 CHECK (min_amount >= 0)
);

CREATE TABLE orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  event_id         uuid        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  coupon_id        uuid        REFERENCES coupons (id) ON DELETE SET NULL,
  status           text        NOT NULL CHECK (status IN ('AWAITING_PAYMENT', 'PAID', 'FAILED', 'EXPIRED', 'CANCELED', 'REFUNDED')),
  subtotal         integer     NOT NULL,
  discount         integer     NOT NULL,
  service_fee      integer     NOT NULL,
  total            integer     NOT NULL,
  payment_deadline timestamptz NOT NULL,
  payment_attempts integer     NOT NULL DEFAULT 0,
  paid_at          timestamptz,
  card_last4       text CHECK (card_last4 ~ '^[0-9]{4}$'),
  installments     integer CHECK (installments BETWEEN 1 AND 3),
  refund_amount    integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX orders_user_id_idx ON orders (user_id, created_at DESC);
CREATE INDEX orders_event_id_idx ON orders (event_id, status);
CREATE INDEX orders_coupon_id_idx ON orders (coupon_id);

CREATE TABLE order_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid    NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  sector_id           uuid    NOT NULL REFERENCES sectors (id) ON DELETE CASCADE,
  type                text    NOT NULL CHECK (type IN ('FULL', 'HALF')),
  half_price_category text CHECK (half_price_category IN ('STUDENT', 'SENIOR', 'DISABLED', 'LOW_INCOME_YOUTH')),
  quantity            integer NOT NULL CHECK (quantity >= 1),
  unit_price          integer NOT NULL,
  line_total          integer NOT NULL,
  position            integer NOT NULL DEFAULT 0
);

CREATE INDEX order_items_order_id_idx ON order_items (order_id);
CREATE INDEX order_items_sector_id_idx ON order_items (sector_id);

CREATE TABLE tickets (
  code      text PRIMARY KEY CHECK (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  order_id  uuid        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  sector_id uuid        NOT NULL REFERENCES sectors (id) ON DELETE CASCADE,
  type      text        NOT NULL CHECK (type IN ('FULL', 'HALF')),
  status    text        NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID', 'USED', 'CANCELED')),
  used_at   timestamptz,
  position  integer     NOT NULL DEFAULT 0
);

CREATE INDEX tickets_order_id_idx ON tickets (order_id);
