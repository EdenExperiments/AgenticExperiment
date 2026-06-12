export function greetUser(name: string): string {
  return `Hello, ${name}!`;
}

export function formatLabel(value: string): string {
  return greetUser(value);
}
