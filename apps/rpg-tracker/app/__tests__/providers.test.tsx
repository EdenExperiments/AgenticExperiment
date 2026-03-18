import { render, screen } from '@testing-library/react'
import { Providers } from '../providers'

test('renders children', () => {
  render(<Providers><div>hello</div></Providers>)
  expect(screen.getByText('hello')).toBeInTheDocument()
})
