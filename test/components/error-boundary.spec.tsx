import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { ErrorBoundary } from '../../src/components/ErrorBoundary';

/**
 * The blank-screen guard.
 *
 * React unmounts the whole tree on an uncaught render error. In a release
 * build that is a blank view the customer can only escape by force-quitting —
 * this app was the only one of the four with no boundary at all.
 */
function Boom({ shouldThrow }: { shouldThrow: boolean }): React.JSX.Element {
  if (shouldThrow) {
    throw new Error('render exploded');
  }
  return <Text>All good</Text>;
}

describe('ErrorBoundary', () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  afterAll(() => consoleError.mockRestore());

  it('renders its children when nothing throws', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(getByText('All good')).toBeTruthy();
  });

  it('shows a readable fallback instead of a blank screen', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>,
    );

    expect(getByText('Something went wrong')).toBeTruthy();
    // What matters to someone mid-order is that their money and order are safe.
    expect(getByText(/cart and any order you have placed are safe/i)).toBeTruthy();
  });

  it('never shows the customer a stack trace', () => {
    const { queryByText } = render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>,
    );

    expect(queryByText(/render exploded/)).toBeNull();
  });

  it('offers a way out', () => {
    const onReset = jest.fn();
    const { getByText } = render(
      <ErrorBoundary onReset={onReset}>
        <Boom shouldThrow />
      </ErrorBoundary>,
    );

    fireEvent.press(getByText('Try again'));

    expect(onReset).toHaveBeenCalled();
  });
});
