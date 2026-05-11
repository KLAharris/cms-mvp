import { describe, expect, it } from 'vitest';

import { Email } from '../../domain/email';
import { InvalidEmailError } from '../../domain/errors';

describe('Email', () => {
  it('constructs with a valid email', () => {
    const email = Email.create('editor@example.com');

    expect(email.value).toBe('editor@example.com');
  });

  it.each(['editor.example.com', 'editor@', ''])(
    'throws InvalidEmailError for invalid email %s',
    (value) => {
      expect(() => Email.create(value)).toThrow(InvalidEmailError);
    },
  );

  it('compares equality using normalized lowercase email', () => {
    const email = Email.create('Editor@Example.com');
    const sameEmail = Email.create('editor@example.com');

    expect(email.equals(sameEmail)).toBe(true);
  });
});
