import { describe, expect, it } from 'vitest';
import { filterCompletion, isTrivialClosingCompletion } from '../src/completionFilter.js';

describe('automatic trivial-closing filter', () => {
  it.each([
    ['}', true],
    [');', true],
    ['\n});', true],
    ['],', true],
    ['{', false],
    ['=>', false],
    ['"}"', false],
    ['</div>', false],
    ['result;', false],
    [';', true],
    ['', false],
    [' \n\t', false]
  ])('classifies %j', (completion, expected) => {
    expect(isTrivialClosingCompletion(completion)).toBe(expected);
  });

  it.each([
    ['Automatic', true, '\n});', undefined],
    ['Invoke', false, '\n});', '\n});'],
    ['Automatic', true, 'value,', 'value,'],
    ['Invoke', false, 'value,', 'value,'],
    ['Automatic', true, ' \n', undefined],
    ['Invoke', false, ' \n', undefined]
  ])('%s trigger filters %j as expected', (_trigger, automatic, completion, expected) => {
    expect(filterCompletion(completion, automatic)).toBe(expected);
  });
});
