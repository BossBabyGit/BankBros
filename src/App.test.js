import { render, screen } from '@testing-library/react';
import App from './App';

// jsdom doesn't implement canvas; mock getContext to avoid errors
HTMLCanvasElement.prototype.getContext = () => {};

test('renders BankBros brand', () => {
  render(<App />);
  expect(screen.getAllByText(/BankBros/i).length).toBeGreaterThan(0);
});
