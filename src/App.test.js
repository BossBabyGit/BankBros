import { render, screen } from '@testing-library/react';
import App from './App';

// jsdom doesn't implement canvas; mock getContext to avoid errors
HTMLCanvasElement.prototype.getContext = () => {};

test('renders BankBros Rewards brand', () => {
  render(<App />);
  expect(screen.getAllByText(/BankBros Rewards/i).length).toBeGreaterThan(0);
});
